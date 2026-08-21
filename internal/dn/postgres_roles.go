package dn

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

func (s *PostgresService) ListRoles(query RoleProfessionQuery) (RoleProfessionList, error) {
	ctx, cancel := databaseContext()
	defer cancel()
	ownerID, err := databaseUserID(ctx, s)
	if err != nil {
		return RoleProfessionList{}, err
	}
	page, pageSize := normalizePage(query.Page, query.PageSize)
	roleName := strings.TrimSpace(query.RoleName)
	profession := strings.TrimSpace(query.Profession)
	var total int
	if err := s.pool.QueryRow(ctx, `
		select count(*)::int
		from dn_role_profession
		where owner_id = $1 and deleted_at is null
		  and ($2 = '' or role_name ilike '%' || $2 || '%')
		  and ($3 = '' or profession ilike '%' || $3 || '%')
		`, ownerID, roleName, profession).Scan(&total); err != nil {
		return RoleProfessionList{}, fmt.Errorf("count DN roles: %w", err)
	}
	rows, err := s.pool.Query(ctx, `
		select r.id, coalesce(r.owner_id, 0), r.role_name, r.profession, r.priority,
		       coalesce(r.remark, ''), r.sort_order,
		       count(p.id)::int, r.created_at, r.updated_at, r.deleted_at
		from dn_role_profession r
		left join dn_weekly_plan p on p.role_profession_id = r.id and p.owner_id = r.owner_id
		where r.owner_id = $1 and r.deleted_at is null
		  and ($2 = '' or r.role_name ilike '%' || $2 || '%')
		  and ($3 = '' or r.profession ilike '%' || $3 || '%')
		group by r.id
		order by r.sort_order asc, r.id asc
		limit $4 offset $5
		`, ownerID, roleName, profession, pageSize, (page-1)*pageSize)
	if err != nil {
		return RoleProfessionList{}, fmt.Errorf("list DN roles: %w", err)
	}
	defer rows.Close()
	items := make([]RoleProfession, 0)
	for rows.Next() {
		item, scanErr := scanDatabaseRole(rows, true)
		if scanErr != nil {
			return RoleProfessionList{}, fmt.Errorf("scan DN role: %w", scanErr)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return RoleProfessionList{}, fmt.Errorf("iterate DN roles: %w", err)
	}
	return RoleProfessionList{Items: items, Meta: listMeta(total, page, pageSize)}, nil
}

func (s *PostgresService) RoleOptions() ([]RoleProfession, error) {
	ctx, cancel := databaseContext()
	defer cancel()
	ownerID, err := databaseUserID(ctx, s)
	if err != nil {
		return nil, err
	}
	rows, err := s.pool.Query(ctx, `
		select r.id, coalesce(r.owner_id, 0), r.role_name, r.profession, r.priority,
		       coalesce(r.remark, ''), r.sort_order,
		       count(p.id)::int, r.created_at, r.updated_at, r.deleted_at
		from dn_role_profession r
		left join dn_weekly_plan p on p.role_profession_id = r.id and p.owner_id = r.owner_id
		where r.owner_id = $1 and r.deleted_at is null
		group by r.id
		order by r.sort_order asc, r.id asc
		`, ownerID)
	if err != nil {
		return nil, fmt.Errorf("list DN role options: %w", err)
	}
	defer rows.Close()
	items := make([]RoleProfession, 0)
	for rows.Next() {
		item, scanErr := scanDatabaseRole(rows, true)
		if scanErr != nil {
			return nil, fmt.Errorf("scan DN role option: %w", scanErr)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresService) SaveRole(input RoleProfessionInput) (RoleProfession, error) {
	input.RoleName = strings.TrimSpace(input.RoleName)
	input.Profession = strings.TrimSpace(input.Profession)
	input.Remark = strings.TrimSpace(input.Remark)
	if input.RoleName == "" || input.Profession == "" {
		return RoleProfession{}, fmt.Errorf("%w: role name and profession are required", ErrInvalidData)
	}
	if len([]rune(input.RoleName)) > 80 || len([]rune(input.Profession)) > 80 || len([]rune(input.Remark)) > 1000 {
		return RoleProfession{}, fmt.Errorf("%w: role field exceeds the allowed length", ErrInvalidData)
	}
	if input.Priority < 0 || input.Priority > 2 || input.SortOrder < 0 {
		return RoleProfession{}, fmt.Errorf("%w: invalid role priority or sort order", ErrInvalidData)
	}
	ctx, cancel := databaseContext()
	defer cancel()
	ownerID, err := databaseUserID(ctx, s)
	if err != nil {
		return RoleProfession{}, err
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return RoleProfession{}, fmt.Errorf("begin DN role transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	if input.ID == 0 {
		item, createErr := scanDatabaseRole(tx.QueryRow(ctx, `
			insert into dn_role_profession
			(role_name, profession, priority, remark, sort_order, owner_id, created_at, updated_at)
			values ($1, $2, $3, nullif($4, ''), $5, $6, now(), now())
			returning id, coalesce(owner_id, 0), role_name, profession, priority,
			          coalesce(remark, ''), sort_order, created_at, updated_at, deleted_at
			`, input.RoleName, input.Profession, input.Priority, input.Remark, input.SortOrder, ownerID), false)
		if createErr != nil {
			return RoleProfession{}, mapDatabaseError("create DN role", createErr)
		}
		if err := tx.Commit(ctx); err != nil {
			return RoleProfession{}, fmt.Errorf("commit DN role creation: %w", err)
		}
		return item, nil
	}

	item, err := scanDatabaseRole(tx.QueryRow(ctx, `
		update dn_role_profession
		set role_name = $1, profession = $2, priority = $3, remark = nullif($4, ''), sort_order = $5, updated_at = now()
		where id = $6 and owner_id = $7 and deleted_at is null
		returning id, coalesce(owner_id, 0), role_name, profession, priority,
		          coalesce(remark, ''), sort_order, created_at, updated_at, deleted_at
	`, input.RoleName, input.Profession, input.Priority, input.Remark, input.SortOrder, input.ID, ownerID), false)
	if errors.Is(err, pgx.ErrNoRows) {
		return RoleProfession{}, fmt.Errorf("%w: role %d", ErrNotFound, input.ID)
	}
	if err != nil {
		return RoleProfession{}, mapDatabaseError("update DN role", err)
	}
	if _, err := tx.Exec(ctx, `
		update dn_weekly_plan
		set role_name = $1, profession = $2, priority = $3, updated_at = now()
		where role_profession_id = $4 and owner_id = $5
	`, item.RoleName, item.Profession, item.Priority, item.ID, ownerID); err != nil {
		return RoleProfession{}, fmt.Errorf("cascade DN role update: %w", err)
	}
	if err := tx.QueryRow(ctx, `select count(*)::int from dn_weekly_plan where role_profession_id = $1 and owner_id = $2`, item.ID, ownerID).Scan(&item.WeeklyPlanCount); err != nil {
		return RoleProfession{}, fmt.Errorf("count DN role plans: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return RoleProfession{}, fmt.Errorf("commit DN role update: %w", err)
	}
	return item, nil
}

func (s *PostgresService) DeleteRole(id int) (RoleProfession, error) {
	if id <= 0 {
		return RoleProfession{}, fmt.Errorf("%w: invalid role id", ErrInvalidData)
	}
	ctx, cancel := databaseContext()
	defer cancel()
	ownerID, err := databaseUserID(ctx, s)
	if err != nil {
		return RoleProfession{}, err
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return RoleProfession{}, fmt.Errorf("begin DN role deletion: %w", err)
	}
	defer tx.Rollback(ctx)
	tag, err := tx.Exec(ctx, `delete from dn_weekly_plan where role_profession_id = $1 and owner_id = $2`, id, ownerID)
	if err != nil {
		return RoleProfession{}, fmt.Errorf("delete DN role plans: %w", err)
	}
	item, err := scanDatabaseRole(tx.QueryRow(ctx, `
		update dn_role_profession
		set deleted_at = now(), updated_at = now()
		where id = $1 and owner_id = $2 and deleted_at is null
		returning id, coalesce(owner_id, 0), role_name, profession, priority,
		          coalesce(remark, ''), sort_order, created_at, updated_at, deleted_at
	`, id, ownerID), false)
	if errors.Is(err, pgx.ErrNoRows) {
		return RoleProfession{}, fmt.Errorf("%w: role %d", ErrNotFound, id)
	}
	if err != nil {
		return RoleProfession{}, fmt.Errorf("delete DN role: %w", err)
	}
	item.WeeklyPlanCount = int(tag.RowsAffected())
	if err := tx.Commit(ctx); err != nil {
		return RoleProfession{}, fmt.Errorf("commit DN role deletion: %w", err)
	}
	return item, nil
}

type databaseRowScanner interface {
	Scan(dest ...any) error
}

func scanDatabaseRole(row databaseRowScanner, withCount bool) (RoleProfession, error) {
	var value RoleProfession
	var createdAt time.Time
	var updatedAt time.Time
	var deletedAt *time.Time
	var err error
	if withCount {
		err = row.Scan(
			&value.ID, &value.OwnerID, &value.RoleName, &value.Profession, &value.Priority,
			&value.Remark, &value.SortOrder, &value.WeeklyPlanCount, &createdAt, &updatedAt, &deletedAt,
		)
	} else {
		err = row.Scan(
			&value.ID, &value.OwnerID, &value.RoleName, &value.Profession, &value.Priority,
			&value.Remark, &value.SortOrder, &createdAt, &updatedAt, &deletedAt,
		)
	}
	if err != nil {
		return RoleProfession{}, err
	}
	value.CreatedAt = formatDatabaseTime(createdAt)
	value.UpdatedAt = formatDatabaseTime(updatedAt)
	if deletedAt != nil {
		value.DeletedAt = formatDatabaseTime(*deletedAt)
	}
	return value, nil
}

func normalizePage(page int, pageSize int) (int, int) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = defaultPageSize
	}
	if pageSize > maximumPageSize {
		pageSize = maximumPageSize
	}
	return page, pageSize
}

func listMeta(total int, page int, pageSize int) ListMeta {
	totalPages := 0
	if total > 0 {
		totalPages = (total + pageSize - 1) / pageSize
	}
	return ListMeta{Total: total, TotalPages: totalPages, Page: page, PageSize: pageSize}
}

func formatDatabaseTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339Nano)
}

func databaseUserID(ctx context.Context, service *PostgresService) (int, error) {
	_ = ctx
	return service.identity.CurrentUserID()
}
