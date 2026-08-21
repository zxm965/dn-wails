package dn

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

func (s *PostgresService) ListWeeklyPlans(query WeeklyPlanQuery) (WeeklyPlanList, error) {
	ctx, cancel := databaseContext()
	defer cancel()
	ownerID, err := databaseUserID(ctx, s)
	if err != nil {
		return WeeklyPlanList{}, err
	}
	if err := s.migrateLegacyWeeklyPlans(ctx, ownerID); err != nil {
		return WeeklyPlanList{}, err
	}
	rows, err := s.pool.Query(ctx, weeklyPlanSelect+`
		where p.owner_id = $1
		  and ($2 = '' or p.role_name ilike '%' || $2 || '%')
		  and ($3 = '' or coalesce(p.profession, '') ilike '%' || $3 || '%')
		  and ($4 <= 0 or p.role_profession_id = $4)
		order by p.sort_order asc, p.id asc
	`, ownerID, strings.TrimSpace(query.RoleName), strings.TrimSpace(query.Profession), query.RoleProfessionID)
	if err != nil {
		return WeeklyPlanList{}, fmt.Errorf("list DN weekly plans: %w", err)
	}
	defer rows.Close()
	items := make([]WeeklyPlan, 0)
	for rows.Next() {
		item, scanErr := scanDatabaseWeeklyPlan(rows)
		if scanErr != nil {
			return WeeklyPlanList{}, fmt.Errorf("scan DN weekly plan: %w", scanErr)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return WeeklyPlanList{}, fmt.Errorf("iterate DN weekly plans: %w", err)
	}
	page, pageSize := normalizePage(query.Page, query.PageSize)
	pageItems, meta := paginate(items, page, pageSize)
	return WeeklyPlanList{Items: pageItems, Meta: meta}, nil
}

func (s *PostgresService) AllWeeklyPlans() ([]WeeklyPlan, error) {
	ctx, cancel := databaseContext()
	defer cancel()
	ownerID, err := databaseUserID(ctx, s)
	if err != nil {
		return nil, err
	}
	if err := s.migrateLegacyWeeklyPlans(ctx, ownerID); err != nil {
		return nil, err
	}
	rows, err := s.pool.Query(ctx, weeklyPlanSelect+` where p.owner_id = $1 order by p.sort_order asc, p.id asc`, ownerID)
	if err != nil {
		return nil, fmt.Errorf("list all DN weekly plans: %w", err)
	}
	defer rows.Close()
	items := make([]WeeklyPlan, 0)
	for rows.Next() {
		item, scanErr := scanDatabaseWeeklyPlan(rows)
		if scanErr != nil {
			return nil, fmt.Errorf("scan DN weekly plan: %w", scanErr)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresService) SaveWeeklyPlan(input WeeklyPlanInput) (WeeklyPlan, error) {
	input.Remark = strings.TrimSpace(input.Remark)
	if input.RoleProfessionID <= 0 {
		return WeeklyPlan{}, fmt.Errorf("%w: role profession is required", ErrInvalidData)
	}
	remainingCommissionCount, countErr := normalizeWeeklyCommissionCount(
		input.RemainingCommissionCount,
		input.HasArk,
		input.HasNightmare,
	)
	if countErr != nil || input.SortOrder < 0 {
		return WeeklyPlan{}, fmt.Errorf("%w: invalid weekly plan counters", ErrInvalidData)
	}
	input.RemainingCommissionCount = remainingCommissionCount
	if len([]rune(input.Remark)) > 1000 {
		return WeeklyPlan{}, fmt.Errorf("%w: weekly plan remark is too long", ErrInvalidData)
	}
	ctx, cancel := databaseContext()
	defer cancel()
	ownerID, err := databaseUserID(ctx, s)
	if err != nil {
		return WeeklyPlan{}, err
	}
	var roleName string
	var profession string
	var priority int
	err = s.pool.QueryRow(ctx, `
		select role_name, profession, priority
		from dn_role_profession
		where id = $1 and owner_id = $2 and deleted_at is null
	`, input.RoleProfessionID, ownerID).Scan(&roleName, &profession, &priority)
	if errors.Is(err, pgx.ErrNoRows) {
		return WeeklyPlan{}, fmt.Errorf("%w: role profession %d", ErrNotFound, input.RoleProfessionID)
	}
	if err != nil {
		return WeeklyPlan{}, fmt.Errorf("query DN weekly plan role: %w", err)
	}
	args := []any{
		roleName, profession, priority, input.RemainingCommissionCount,
		input.HasInvasion, input.HasArk, input.HasNightmare, input.Remark, input.SortOrder,
		input.RoleProfessionID, ownerID,
	}
	var row databaseRowScanner
	if input.ID == 0 {
		row = s.pool.QueryRow(ctx, weeklyPlanInsertReturning, args...)
	} else {
		args = append(args, input.ID)
		row = s.pool.QueryRow(ctx, weeklyPlanUpdateReturning, args...)
	}
	item, err := scanDatabaseWeeklyPlan(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return WeeklyPlan{}, fmt.Errorf("%w: weekly plan %d", ErrNotFound, input.ID)
	}
	if err != nil {
		return WeeklyPlan{}, mapDatabaseError("save DN weekly plan", err)
	}
	return item, nil
}

func (s *PostgresService) DeleteWeeklyPlan(id int) (WeeklyPlan, error) {
	if id <= 0 {
		return WeeklyPlan{}, fmt.Errorf("%w: invalid weekly plan id", ErrInvalidData)
	}
	ctx, cancel := databaseContext()
	defer cancel()
	ownerID, err := databaseUserID(ctx, s)
	if err != nil {
		return WeeklyPlan{}, err
	}
	item, err := scanDatabaseWeeklyPlan(s.pool.QueryRow(ctx, weeklyPlanDeleteReturning, id, ownerID))
	if errors.Is(err, pgx.ErrNoRows) {
		return WeeklyPlan{}, fmt.Errorf("%w: weekly plan %d", ErrNotFound, id)
	}
	if err != nil {
		return WeeklyPlan{}, fmt.Errorf("delete DN weekly plan: %w", err)
	}
	return item, nil
}

func (s *PostgresService) InitializeWeeklyPlans() (WeeklyPlanInitializationResult, error) {
	return s.syncDatabaseWeeklyPlans(true)
}

func (s *PostgresService) SyncWeeklyPlans() (WeeklyPlanSyncResult, error) {
	result, err := s.syncDatabaseWeeklyPlans(false)
	return WeeklyPlanSyncResult{Created: result.Created, Total: result.Count}, err
}

// JSON null in the retired ticket column marks rows migrated to the count-only model.
// Older clients decode it as an empty slice, so rollback remains readable.
func (s *PostgresService) migrateLegacyWeeklyPlans(ctx context.Context, ownerID int) error {
	if _, err := s.pool.Exec(ctx, `
		update dn_weekly_plan
		set level_commission_count = case
				when jsonb_array_length(coalesce(nest_commissions, '[]'::jsonb)) = 0 then 6
				else least(6, (
					select count(*)::int
					from jsonb_array_elements(coalesce(nest_commissions, '[]'::jsonb)) as commission
					where not coalesce((commission->>'completed')::boolean, false)
				))
			end,
			nest_commissions = '[]'::jsonb,
			nest_tickets = 'null'::jsonb,
			updated_at = now()
		where owner_id = $1
			and jsonb_typeof(nest_tickets) is distinct from 'null'
	`, ownerID); err != nil {
		return fmt.Errorf("migrate DN weekly plan counters: %w", err)
	}
	return nil
}

func (s *PostgresService) syncDatabaseWeeklyPlans(reset bool) (WeeklyPlanInitializationResult, error) {
	ctx, cancel := databaseContext()
	defer cancel()
	ownerID, err := databaseUserID(ctx, s)
	if err != nil {
		return WeeklyPlanInitializationResult{}, err
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return WeeklyPlanInitializationResult{}, fmt.Errorf("begin DN weekly synchronization: %w", err)
	}
	defer tx.Rollback(ctx)
	roleRows, err := tx.Query(ctx, `
		select id, role_name, profession, priority, sort_order
		from dn_role_profession
		where owner_id = $1 and deleted_at is null
		order by sort_order asc, id asc
	`, ownerID)
	if err != nil {
		return WeeklyPlanInitializationResult{}, fmt.Errorf("list DN roles for synchronization: %w", err)
	}
	type roleValue struct {
		ID, Priority, SortOrder int
		RoleName, Profession    string
	}
	roles := make([]roleValue, 0)
	for roleRows.Next() {
		var role roleValue
		if err := roleRows.Scan(&role.ID, &role.RoleName, &role.Profession, &role.Priority, &role.SortOrder); err != nil {
			roleRows.Close()
			return WeeklyPlanInitializationResult{}, fmt.Errorf("scan DN synchronization role: %w", err)
		}
		roles = append(roles, role)
	}
	roleRows.Close()
	if len(roles) == 0 {
		return WeeklyPlanInitializationResult{}, fmt.Errorf("%w: create at least one role first", ErrInvalidData)
	}
	planRows, err := tx.Query(ctx, `select id, role_profession_id from dn_weekly_plan where owner_id = $1`, ownerID)
	if err != nil {
		return WeeklyPlanInitializationResult{}, fmt.Errorf("list DN plans for synchronization: %w", err)
	}
	plans := make(map[int]int)
	for planRows.Next() {
		var id int
		var roleID *int
		if err := planRows.Scan(&id, &roleID); err != nil {
			planRows.Close()
			return WeeklyPlanInitializationResult{}, err
		}
		if roleID != nil {
			plans[*roleID] = id
		}
	}
	planRows.Close()
	result := WeeklyPlanInitializationResult{Count: len(roles)}
	for _, role := range roles {
		if planID, exists := plans[role.ID]; exists {
			if !reset {
				continue
			}
			if _, err := tx.Exec(ctx, `
				update dn_weekly_plan set role_name=$1, profession=$2, priority=$3,
				nest_commissions='[]'::jsonb, nest_tickets='null'::jsonb, level_commission_count=6,
				has_invasion=false, has_ark=false, has_nightmare=false, has_mainline=false, has_other=false,
				sort_order=$4, updated_at=now() where id=$5 and owner_id=$6
			`, role.RoleName, role.Profession, role.Priority, role.SortOrder, planID, ownerID); err != nil {
				return WeeklyPlanInitializationResult{}, fmt.Errorf("reset DN weekly plan: %w", err)
			}
			result.Updated++
			continue
		}
		if _, err := tx.Exec(ctx, `
			insert into dn_weekly_plan
			(role_name, profession, priority, nest_commissions, nest_tickets, level_commission_count, sort_order, role_profession_id, owner_id, created_at, updated_at)
			values ($1,$2,$3,'[]'::jsonb,'null'::jsonb,6,$4,$5,$6,now(),now())
		`, role.RoleName, role.Profession, role.Priority, role.SortOrder, role.ID, ownerID); err != nil {
			return WeeklyPlanInitializationResult{}, fmt.Errorf("create synchronized DN weekly plan: %w", err)
		}
		result.Created++
	}
	if err := tx.Commit(ctx); err != nil {
		return WeeklyPlanInitializationResult{}, fmt.Errorf("commit DN weekly synchronization: %w", err)
	}
	return result, nil
}

const weeklyPlanSelect = `
	select p.id, coalesce(p.owner_id, 0), p.role_name, coalesce(p.profession, ''), p.priority,
	       p.level_commission_count, p.has_invasion, p.has_ark, p.has_nightmare,
	       coalesce(p.remark, ''), p.sort_order, coalesce(p.role_profession_id, 0), p.created_at, p.updated_at
	from dn_weekly_plan p
`

const weeklyPlanInsertReturning = `
	insert into dn_weekly_plan
	(role_name, profession, priority, nest_commissions, nest_tickets, level_commission_count,
	 has_invasion, has_ark, has_nightmare, has_mainline, has_other, remark, sort_order,
	 role_profession_id, owner_id, created_at, updated_at)
	values ($1,$2,$3,'[]'::jsonb,'null'::jsonb,$4,$5,$6,$7,false,false,nullif($8,''),$9,$10,$11,now(),now())
	returning id, coalesce(owner_id, 0), role_name, coalesce(profession, ''), priority,
	          level_commission_count, has_invasion, has_ark, has_nightmare,
	          coalesce(remark, ''), sort_order, coalesce(role_profession_id, 0), created_at, updated_at
`

const weeklyPlanUpdateReturning = `
	update dn_weekly_plan set role_name=$1, profession=$2, priority=$3,
	 nest_commissions='[]'::jsonb, nest_tickets='null'::jsonb, level_commission_count=$4,
	 has_invasion=$5, has_ark=$6, has_nightmare=$7, remark=nullif($8,''), sort_order=$9,
	 role_profession_id=$10, updated_at=now()
	where owner_id=$11 and id=$12
	returning id, coalesce(owner_id, 0), role_name, coalesce(profession, ''), priority,
	          level_commission_count, has_invasion, has_ark, has_nightmare,
	          coalesce(remark, ''), sort_order, coalesce(role_profession_id, 0), created_at, updated_at
`

const weeklyPlanDeleteReturning = `
	delete from dn_weekly_plan where id=$1 and owner_id=$2
	returning id, coalesce(owner_id, 0), role_name, coalesce(profession, ''), priority,
	          level_commission_count, has_invasion, has_ark, has_nightmare,
	          coalesce(remark, ''), sort_order, coalesce(role_profession_id, 0), created_at, updated_at
`

func scanDatabaseWeeklyPlan(row databaseRowScanner) (WeeklyPlan, error) {
	var value WeeklyPlan
	var createdAt time.Time
	var updatedAt time.Time
	err := row.Scan(
		&value.ID, &value.OwnerID, &value.RoleName, &value.Profession, &value.Priority,
		&value.RemainingCommissionCount, &value.HasInvasion, &value.HasArk,
		&value.HasNightmare, &value.Remark, &value.SortOrder, &value.RoleProfessionID, &createdAt, &updatedAt,
	)
	if err != nil {
		return WeeklyPlan{}, err
	}
	value.CreatedAt = formatDatabaseTime(createdAt)
	value.UpdatedAt = formatDatabaseTime(updatedAt)
	return value, nil
}
