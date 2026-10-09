package tasks

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserIdentity interface {
	CurrentUserID() (int, error)
}

type PostgresService struct {
	pool     *pgxpool.Pool
	identity UserIdentity
}

func NewPostgresService(databaseURL string, identity UserIdentity) (*PostgresService, error) {
	config, err := pgxpool.ParseConfig(strings.TrimSpace(databaseURL))
	if err != nil {
		return nil, fmt.Errorf("parse tasks database connection: %w", err)
	}
	config.MaxConns = 2
	config.MinConns = 0
	config.MaxConnIdleTime = 5 * time.Minute
	config.MaxConnLifetime = 30 * time.Minute
	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("create tasks database pool: %w", err)
	}
	return &PostgresService{pool: pool, identity: identity}, nil
}

func (s *PostgresService) Initialize() error {
	ctx, cancel := databaseContext()
	defer cancel()
	if err := s.pool.Ping(ctx); err != nil {
		return fmt.Errorf("connect tasks database: %w", err)
	}
	return s.Health()
}

func (s *PostgresService) Close() error {
	s.pool.Close()
	return nil
}

func (s *PostgresService) Health() error {
	ctx, cancel := databaseContext()
	defer cancel()
	var schemaReady bool
	if err := s.pool.QueryRow(ctx, `
		select to_regclass('public.app_task_list') is not null
			and to_regclass('public.app_task') is not null
	`).Scan(&schemaReady); err != nil {
		return fmt.Errorf("check tasks database health: %w", err)
	}
	if !schemaReady {
		return fmt.Errorf("%w: task database migrations have not been applied", ErrUnavailable)
	}
	return nil
}

func (s *PostgresService) Workspace() (Workspace, error) {
	ownerID, err := s.identity.CurrentUserID()
	if err != nil {
		return Workspace{}, err
	}
	ctx, cancel := databaseContext()
	defer cancel()
	if err := s.ensureDefaultList(ctx, ownerID); err != nil {
		return Workspace{}, err
	}
	return s.workspace(ctx, ownerID)
}

func (s *PostgresService) SaveList(input ListInput) (List, error) {
	normalized, err := normalizeListInput(input)
	if err != nil {
		return List{}, err
	}
	ownerID, err := s.identity.CurrentUserID()
	if err != nil {
		return List{}, err
	}
	ctx, cancel := databaseContext()
	defer cancel()

	var row pgx.Row
	if normalized.ID == 0 {
		row = s.pool.QueryRow(ctx, `
			insert into app_task_list (owner_id, title, sort_order, is_default)
			select $1, $2, coalesce(max(sort_order), 0) + 1024,
				not exists (select 1 from app_task_list where owner_id = $1 and deleted_at is null)
			from app_task_list where owner_id = $1 and deleted_at is null
			returning id, title, sort_order, is_default, created_at, updated_at
		`, ownerID, normalized.Title)
	} else {
		row = s.pool.QueryRow(ctx, `
			update app_task_list set title = $1, updated_at = now()
			where id = $2 and owner_id = $3 and deleted_at is null
			returning id, title, sort_order, is_default, created_at, updated_at
		`, normalized.Title, normalized.ID, ownerID)
	}
	list, err := scanList(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return List{}, fmt.Errorf("%w: %d", ErrListNotFound, normalized.ID)
	}
	if err != nil {
		return List{}, fmt.Errorf("save task list: %w", err)
	}
	return list, nil
}

func (s *PostgresService) DeleteList(id int64) error {
	if id <= 0 {
		return fmt.Errorf("%w: list id must be positive", ErrInvalidData)
	}
	ownerID, err := s.identity.CurrentUserID()
	if err != nil {
		return err
	}
	ctx, cancel := databaseContext()
	defer cancel()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin delete task list: %w", err)
	}
	defer tx.Rollback(ctx)

	var count int
	var isDefault bool
	if err := tx.QueryRow(ctx, `
		select (
			select count(*) from app_task_list where owner_id = $2 and deleted_at is null
		), is_default from app_task_list
		where id = $1 and owner_id = $2 and deleted_at is null
		for update
	`, id, ownerID).Scan(&count, &isDefault); errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("%w: %d", ErrListNotFound, id)
	} else if err != nil {
		return fmt.Errorf("load task list for deletion: %w", err)
	}
	if count <= 1 {
		return fmt.Errorf("%w: at least one task list must remain", ErrConflict)
	}
	if _, err := tx.Exec(ctx, `
		update app_task set deleted_at = now(), updated_at = now()
		where list_id = $1 and owner_id = $2 and deleted_at is null
	`, id, ownerID); err != nil {
		return fmt.Errorf("delete tasks in list: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		update app_task_list set deleted_at = now(), updated_at = now(), is_default = false
		where id = $1 and owner_id = $2 and deleted_at is null
	`, id, ownerID); err != nil {
		return fmt.Errorf("delete task list: %w", err)
	}
	if isDefault {
		if _, err := tx.Exec(ctx, `
			update app_task_list set is_default = true, updated_at = now()
			where id = (
				select id from app_task_list where owner_id = $1 and deleted_at is null order by sort_order, id limit 1
			)
		`, ownerID); err != nil {
			return fmt.Errorf("select replacement default list: %w", err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit task list deletion: %w", err)
	}
	return nil
}

func (s *PostgresService) ReorderLists(input ReorderListsInput) error {
	ownerID, err := s.identity.CurrentUserID()
	if err != nil {
		return err
	}
	if err := validateOrderedIDs(input.OrderedIDs); err != nil {
		return err
	}
	ctx, cancel := databaseContext()
	defer cancel()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin reorder task lists: %w", err)
	}
	defer tx.Rollback(ctx)
	for index, id := range input.OrderedIDs {
		result, execErr := tx.Exec(ctx, `
			update app_task_list set sort_order = $1, updated_at = now()
			where id = $2 and owner_id = $3 and deleted_at is null
		`, int64(index+1)*1024, id, ownerID)
		if execErr != nil {
			return fmt.Errorf("reorder task list: %w", execErr)
		}
		if result.RowsAffected() == 0 {
			return fmt.Errorf("%w: %d", ErrListNotFound, id)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit task list order: %w", err)
	}
	return nil
}

func (s *PostgresService) SaveTask(input TaskInput) (Task, error) {
	normalized, err := normalizeTaskInput(input)
	if err != nil {
		return Task{}, err
	}
	ownerID, err := s.identity.CurrentUserID()
	if err != nil {
		return Task{}, err
	}
	ctx, cancel := databaseContext()
	defer cancel()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Task{}, fmt.Errorf("begin save task: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := validateTaskLocation(ctx, tx, ownerID, normalized); err != nil {
		return Task{}, err
	}
	if normalized.ID > 0 {
		var hasChildren bool
		if err := tx.QueryRow(ctx, `
			select exists(select 1 from app_task where parent_id = $1 and owner_id = $2 and deleted_at is null)
		`, normalized.ID, ownerID).Scan(&hasChildren); err != nil {
			return Task{}, fmt.Errorf("inspect task subtasks: %w", err)
		}
		if hasChildren && normalized.Repeat.Frequency != "none" {
			return Task{}, fmt.Errorf("%w: tasks with subtasks cannot repeat", ErrConflict)
		}
		if hasChildren && normalized.ParentID > 0 {
			return Task{}, fmt.Errorf("%w: a task with subtasks cannot become a subtask", ErrConflict)
		}
	}

	scheduledAt, err := timestampValue(normalized.ScheduledAt)
	if err != nil {
		return Task{}, err
	}
	deadlineAt, err := timestampValue(normalized.DeadlineAt)
	if err != nil {
		return Task{}, err
	}
	var row pgx.Row
	if normalized.ID == 0 {
		row = tx.QueryRow(ctx, `
			insert into app_task (
				owner_id, list_id, parent_id, title, details, scheduled_at, deadline_at,
				time_zone, is_starred, starred_at, sort_order, repeat_frequency, repeat_interval,
				repeat_end_mode, repeat_end_date, repeat_count
			)
			select $1, $2, nullif($3, 0), $4, $5, $6, $7, $8, $9,
				case when $9 then now() else null end,
				coalesce(max(sort_order), 0) + 1024, $10, $11, $12, nullif($13, '')::date, $14
			from app_task
			where owner_id = $1 and list_id = $2 and coalesce(parent_id, 0) = $3 and deleted_at is null
			returning `+taskColumns+`
		`, ownerID, normalized.ListID, normalized.ParentID, normalized.Title, normalized.Details,
			scheduledAt, deadlineAt, normalized.TimeZone, normalized.Starred, normalized.Repeat.Frequency, normalized.Repeat.Interval,
			normalized.Repeat.EndMode, normalized.Repeat.EndDate, normalized.Repeat.Count)
	} else {
		row = tx.QueryRow(ctx, `
			update app_task set
				list_id = $1, parent_id = nullif($2, 0), title = $3, details = $4,
				scheduled_at = $5, deadline_at = $6, time_zone = $7, is_starred = $8,
				starred_at = case when $8 and not is_starred then now() when $8 then starred_at else null end,
				repeat_frequency = $9::varchar, repeat_interval = $10, repeat_end_mode = $11,
				repeat_end_date = nullif($12, '')::date, repeat_count = $13,
				repeat_series_id = case when $9 = 'none' then null else repeat_series_id end,
				notification_sent_for = case
					when scheduled_at is not distinct from $5 and deadline_at is not distinct from $6 then notification_sent_for
					else null
				end,
				updated_at = now()
			where id = $14 and owner_id = $15 and deleted_at is null
			returning `+taskColumns+`
		`, normalized.ListID, normalized.ParentID, normalized.Title, normalized.Details, scheduledAt, deadlineAt,
			normalized.TimeZone, normalized.Starred, normalized.Repeat.Frequency, normalized.Repeat.Interval, normalized.Repeat.EndMode,
			normalized.Repeat.EndDate, normalized.Repeat.Count, normalized.ID, ownerID)
	}
	task, err := scanTask(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Task{}, fmt.Errorf("%w: %d", ErrTaskNotFound, normalized.ID)
	}
	if err != nil {
		return Task{}, fmt.Errorf("save task: %w", err)
	}
	if task.Repeat.Frequency != "none" && task.RepeatSeriesID == 0 {
		if _, err := tx.Exec(ctx, `update app_task set repeat_series_id = id where id = $1`, task.ID); err != nil {
			return Task{}, fmt.Errorf("initialize task repeat series: %w", err)
		}
		task.RepeatSeriesID = task.ID
	}
	if normalized.ID > 0 && normalized.ParentID == 0 {
		if _, err := tx.Exec(ctx, `
			update app_task set list_id = $1, updated_at = now()
			where parent_id = $2 and owner_id = $3 and deleted_at is null
		`, normalized.ListID, normalized.ID, ownerID); err != nil {
			return Task{}, fmt.Errorf("move task subtasks: %w", err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return Task{}, fmt.Errorf("commit task save: %w", err)
	}
	return task, nil
}

func (s *PostgresService) SetCompleted(id int64, completed bool) (Workspace, error) {
	if id <= 0 {
		return Workspace{}, fmt.Errorf("%w: task id must be positive", ErrInvalidData)
	}
	ownerID, err := s.identity.CurrentUserID()
	if err != nil {
		return Workspace{}, err
	}
	ctx, cancel := databaseContext()
	defer cancel()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Workspace{}, fmt.Errorf("begin update task completion: %w", err)
	}
	defer tx.Rollback(ctx)

	task, err := scanTask(tx.QueryRow(ctx, `
		select `+taskColumns+` from app_task where id = $1 and owner_id = $2 and deleted_at is null for update
	`, id, ownerID))
	if errors.Is(err, pgx.ErrNoRows) {
		return Workspace{}, fmt.Errorf("%w: %d", ErrTaskNotFound, id)
	}
	if err != nil {
		return Workspace{}, fmt.Errorf("load task completion state: %w", err)
	}
	if completed {
		if _, err := tx.Exec(ctx, `
			update app_task set completed_at = coalesce(completed_at, now()), updated_at = now()
			where (id = $1 or parent_id = $1) and owner_id = $2 and deleted_at is null
		`, id, ownerID); err != nil {
			return Workspace{}, fmt.Errorf("complete task: %w", err)
		}
		if task.CompletedAt == "" && task.Repeat.Frequency != "none" {
			if err := createNextOccurrence(ctx, tx, ownerID, task); err != nil {
				return Workspace{}, err
			}
		}
	} else {
		if _, err := tx.Exec(ctx, `
			update app_task set completed_at = null, updated_at = now()
			where (id = $1 or parent_id = $1) and owner_id = $2 and deleted_at is null
		`, id, ownerID); err != nil {
			return Workspace{}, fmt.Errorf("restore task: %w", err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return Workspace{}, fmt.Errorf("commit task completion: %w", err)
	}
	return s.workspace(ctx, ownerID)
}

func (s *PostgresService) DeleteTask(id int64, deleteSeries bool) error {
	if id <= 0 {
		return fmt.Errorf("%w: task id must be positive", ErrInvalidData)
	}
	ownerID, err := s.identity.CurrentUserID()
	if err != nil {
		return err
	}
	ctx, cancel := databaseContext()
	defer cancel()
	var seriesID sql.NullInt64
	if err := s.pool.QueryRow(ctx, `
		select repeat_series_id from app_task where id = $1 and owner_id = $2 and deleted_at is null
	`, id, ownerID).Scan(&seriesID); errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("%w: %d", ErrTaskNotFound, id)
	} else if err != nil {
		return fmt.Errorf("load task for deletion: %w", err)
	}
	var affected int64
	if deleteSeries && seriesID.Valid {
		result, execErr := s.pool.Exec(ctx, `
			update app_task set deleted_at = now(), updated_at = now()
			where owner_id = $1 and repeat_series_id = $2 and deleted_at is null
		`, ownerID, seriesID.Int64)
		err = execErr
		affected = result.RowsAffected()
	} else {
		result, execErr := s.pool.Exec(ctx, `
			update app_task set deleted_at = now(), updated_at = now()
			where owner_id = $1 and (id = $2 or parent_id = $2) and deleted_at is null
		`, ownerID, id)
		err = execErr
		affected = result.RowsAffected()
	}
	if err != nil {
		return fmt.Errorf("delete task: %w", err)
	}
	if affected == 0 {
		return fmt.Errorf("%w: %d", ErrTaskNotFound, id)
	}
	return nil
}

func (s *PostgresService) DeleteCompleted(listID int64) (int64, error) {
	if listID <= 0 {
		return 0, fmt.Errorf("%w: list id must be positive", ErrInvalidData)
	}
	ownerID, err := s.identity.CurrentUserID()
	if err != nil {
		return 0, err
	}
	ctx, cancel := databaseContext()
	defer cancel()
	result, err := s.pool.Exec(ctx, `
		update app_task set deleted_at = now(), updated_at = now()
		where owner_id = $1 and list_id = $2 and completed_at is not null and deleted_at is null
	`, ownerID, listID)
	if err != nil {
		return 0, fmt.Errorf("delete completed tasks: %w", err)
	}
	return result.RowsAffected(), nil
}

func (s *PostgresService) ReorderTasks(input ReorderTasksInput) error {
	if input.ListID <= 0 || input.ParentID < 0 {
		return fmt.Errorf("%w: task location is invalid", ErrInvalidData)
	}
	if err := validateOrderedIDs(input.OrderedIDs); err != nil {
		return err
	}
	ownerID, err := s.identity.CurrentUserID()
	if err != nil {
		return err
	}
	ctx, cancel := databaseContext()
	defer cancel()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin reorder tasks: %w", err)
	}
	defer tx.Rollback(ctx)
	for index, id := range input.OrderedIDs {
		result, execErr := tx.Exec(ctx, `
			update app_task set sort_order = $1, updated_at = now()
			where id = $2 and owner_id = $3 and list_id = $4
				and coalesce(parent_id, 0) = $5 and deleted_at is null
		`, int64(index+1)*1024, id, ownerID, input.ListID, input.ParentID)
		if execErr != nil {
			return fmt.Errorf("reorder task: %w", execErr)
		}
		if result.RowsAffected() == 0 {
			return fmt.Errorf("%w: %d", ErrTaskNotFound, id)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit task order: %w", err)
	}
	return nil
}

func (s *PostgresService) ClaimDueReminders(limit int) ([]Task, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	ownerID, err := s.identity.CurrentUserID()
	if err != nil {
		return nil, err
	}
	ctx, cancel := databaseContext()
	defer cancel()
	rows, err := s.pool.Query(ctx, `
		with due as (
			select id, coalesce(scheduled_at, deadline_at) as notify_for
			from app_task
			where owner_id = $1 and completed_at is null and deleted_at is null
				and coalesce(scheduled_at, deadline_at) <= now()
				and notification_sent_for is distinct from coalesce(scheduled_at, deadline_at)
			order by coalesce(scheduled_at, deadline_at), id
			limit $2
			for update skip locked
		)
		update app_task task set notification_sent_for = due.notify_for, updated_at = now()
		from due where task.id = due.id
		returning
			task.id, task.list_id, coalesce(task.parent_id, 0), task.title, task.details,
			task.scheduled_at, task.deadline_at, task.time_zone, task.is_starred, task.starred_at, task.completed_at,
			task.sort_order, task.repeat_frequency, task.repeat_interval, task.repeat_end_mode,
			coalesce(to_char(task.repeat_end_date, 'YYYY-MM-DD'), ''), task.repeat_count,
			coalesce(task.repeat_series_id, 0), task.created_at, task.updated_at
	`, ownerID, limit)
	if err != nil {
		return nil, fmt.Errorf("claim due task reminders: %w", err)
	}
	defer rows.Close()
	reminders := make([]Task, 0)
	for rows.Next() {
		task, scanErr := scanTask(rows)
		if scanErr != nil {
			return nil, fmt.Errorf("scan due task reminder: %w", scanErr)
		}
		reminders = append(reminders, task)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate due task reminders: %w", err)
	}
	return reminders, nil
}

func (s *PostgresService) ensureDefaultList(ctx context.Context, ownerID int) error {
	if _, err := s.pool.Exec(ctx, `
		insert into app_task_list (owner_id, title, sort_order, is_default)
		select $1, '我的任务', 1024, true
		where not exists (select 1 from app_task_list where owner_id = $1 and deleted_at is null)
	`, ownerID); err != nil {
		return fmt.Errorf("ensure default task list: %w", err)
	}
	return nil
}

func (s *PostgresService) workspace(ctx context.Context, ownerID int) (Workspace, error) {
	listRows, err := s.pool.Query(ctx, `
		select id, title, sort_order, is_default, created_at, updated_at
		from app_task_list where owner_id = $1 and deleted_at is null order by sort_order, id
	`, ownerID)
	if err != nil {
		return Workspace{}, fmt.Errorf("list task lists: %w", err)
	}
	lists := make([]List, 0)
	for listRows.Next() {
		list, scanErr := scanList(listRows)
		if scanErr != nil {
			listRows.Close()
			return Workspace{}, fmt.Errorf("scan task list: %w", scanErr)
		}
		lists = append(lists, list)
	}
	if err := listRows.Err(); err != nil {
		listRows.Close()
		return Workspace{}, fmt.Errorf("iterate task lists: %w", err)
	}
	listRows.Close()

	taskRows, err := s.pool.Query(ctx, `
		select `+taskColumns+` from app_task
		where owner_id = $1 and deleted_at is null
		order by list_id, coalesce(parent_id, 0), sort_order, id
	`, ownerID)
	if err != nil {
		return Workspace{}, fmt.Errorf("list tasks: %w", err)
	}
	defer taskRows.Close()
	tasks := make([]Task, 0)
	for taskRows.Next() {
		task, scanErr := scanTask(taskRows)
		if scanErr != nil {
			return Workspace{}, fmt.Errorf("scan task: %w", scanErr)
		}
		tasks = append(tasks, task)
	}
	if err := taskRows.Err(); err != nil {
		return Workspace{}, fmt.Errorf("iterate tasks: %w", err)
	}
	return Workspace{Lists: lists, Tasks: tasks}, nil
}

func validateTaskLocation(ctx context.Context, tx pgx.Tx, ownerID int, input TaskInput) error {
	var listExists bool
	if err := tx.QueryRow(ctx, `
		select exists(select 1 from app_task_list where id = $1 and owner_id = $2 and deleted_at is null)
	`, input.ListID, ownerID).Scan(&listExists); err != nil {
		return fmt.Errorf("validate task list: %w", err)
	}
	if !listExists {
		return fmt.Errorf("%w: %d", ErrListNotFound, input.ListID)
	}
	if input.ParentID > 0 {
		var parentListID int64
		var grandparentID sql.NullInt64
		if err := tx.QueryRow(ctx, `
			select list_id, parent_id from app_task
			where id = $1 and owner_id = $2 and deleted_at is null
		`, input.ParentID, ownerID).Scan(&parentListID, &grandparentID); errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("%w: parent %d", ErrTaskNotFound, input.ParentID)
		} else if err != nil {
			return fmt.Errorf("validate parent task: %w", err)
		}
		if parentListID != input.ListID || grandparentID.Valid {
			return fmt.Errorf("%w: subtasks must share a list and cannot be nested", ErrConflict)
		}
	}
	if input.ID > 0 {
		var existingListID int64
		var repeatFrequency string
		if err := tx.QueryRow(ctx, `
			select list_id, repeat_frequency from app_task
			where id = $1 and owner_id = $2 and deleted_at is null
		`, input.ID, ownerID).Scan(&existingListID, &repeatFrequency); errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("%w: %d", ErrTaskNotFound, input.ID)
		} else if err != nil {
			return fmt.Errorf("validate existing task: %w", err)
		}
		if existingListID != input.ListID && repeatFrequency != "none" {
			return fmt.Errorf("%w: repeating tasks cannot move to another list", ErrConflict)
		}
	}
	return nil
}

func createNextOccurrence(ctx context.Context, tx pgx.Tx, ownerID int, task Task) error {
	nextScheduled, err := advanceTimestamp(task.ScheduledAt, task.Repeat, task.TimeZone)
	if err != nil {
		return err
	}
	nextDeadline, err := advanceTimestamp(task.DeadlineAt, task.Repeat, task.TimeZone)
	if err != nil {
		return err
	}
	nextRule := task.Repeat
	if nextRule.EndMode == "count" {
		if nextRule.Count <= 1 {
			return nil
		}
		nextRule.Count--
		if nextRule.Count == 1 {
			nextRule = RepeatRule{Frequency: "none", Interval: 1, EndMode: "never"}
		}
	}
	if task.Repeat.EndMode == "date" {
		endDate, _ := time.Parse("2006-01-02", task.Repeat.EndDate)
		candidate := nextScheduled
		if candidate == "" {
			candidate = nextDeadline
		}
		candidateTime, parseErr := time.Parse(time.RFC3339Nano, candidate)
		if parseErr != nil || candidateTime.After(endDate.Add(24*time.Hour-time.Nanosecond)) {
			return nil
		}
	}
	scheduledAt, _ := timestampValue(nextScheduled)
	deadlineAt, _ := timestampValue(nextDeadline)
	if _, err := tx.Exec(ctx, `
		insert into app_task (
			owner_id, list_id, title, details, scheduled_at, deadline_at, time_zone, is_starred, starred_at,
			sort_order, repeat_frequency, repeat_interval, repeat_end_mode, repeat_end_date,
			repeat_count, repeat_series_id
		) values (
			$1, $2, $3, $4, $5, $6, $7, $8, case when $8 then now() else null end,
			$9, $10, $11, $12, nullif($13, '')::date, $14, $15
		)
	`, ownerID, task.ListID, task.Title, task.Details, scheduledAt, deadlineAt, task.TimeZone, task.Starred,
		task.SortOrder, nextRule.Frequency, nextRule.Interval, nextRule.EndMode, nextRule.EndDate,
		nextRule.Count, task.RepeatSeriesID); err != nil {
		return fmt.Errorf("create next repeating task: %w", err)
	}
	return nil
}

func validateOrderedIDs(ids []int64) error {
	seen := make(map[int64]struct{}, len(ids))
	for _, id := range ids {
		if id <= 0 {
			return fmt.Errorf("%w: ordered ids must be positive", ErrInvalidData)
		}
		if _, exists := seen[id]; exists {
			return fmt.Errorf("%w: ordered ids must be unique", ErrInvalidData)
		}
		seen[id] = struct{}{}
	}
	return nil
}

func timestampValue(value string) (*time.Time, error) {
	if value == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		return nil, fmt.Errorf("%w: timestamp must use RFC3339", ErrInvalidData)
	}
	return &parsed, nil
}

const taskColumns = `
	id, list_id, coalesce(parent_id, 0), title, details, scheduled_at, deadline_at, time_zone,
	is_starred, starred_at, completed_at, sort_order, repeat_frequency, repeat_interval,
	repeat_end_mode, coalesce(to_char(repeat_end_date, 'YYYY-MM-DD'), ''), repeat_count,
	coalesce(repeat_series_id, 0), created_at, updated_at
`

type rowScanner interface {
	Scan(dest ...any) error
}

func scanList(row rowScanner) (List, error) {
	var list List
	var createdAt time.Time
	var updatedAt time.Time
	if err := row.Scan(&list.ID, &list.Title, &list.SortOrder, &list.IsDefault, &createdAt, &updatedAt); err != nil {
		return List{}, err
	}
	list.CreatedAt = createdAt.UTC().Format(time.RFC3339Nano)
	list.UpdatedAt = updatedAt.UTC().Format(time.RFC3339Nano)
	return list, nil
}

func scanTask(row rowScanner) (Task, error) {
	var task Task
	var scheduledAt sql.NullTime
	var deadlineAt sql.NullTime
	var starredAt sql.NullTime
	var completedAt sql.NullTime
	var createdAt time.Time
	var updatedAt time.Time
	if err := row.Scan(
		&task.ID, &task.ListID, &task.ParentID, &task.Title, &task.Details, &scheduledAt, &deadlineAt, &task.TimeZone,
		&task.Starred, &starredAt, &completedAt, &task.SortOrder, &task.Repeat.Frequency, &task.Repeat.Interval,
		&task.Repeat.EndMode, &task.Repeat.EndDate, &task.Repeat.Count, &task.RepeatSeriesID,
		&createdAt, &updatedAt,
	); err != nil {
		return Task{}, err
	}
	if scheduledAt.Valid {
		task.ScheduledAt = scheduledAt.Time.UTC().Format(time.RFC3339Nano)
	}
	if deadlineAt.Valid {
		task.DeadlineAt = deadlineAt.Time.UTC().Format(time.RFC3339Nano)
	}
	if starredAt.Valid {
		task.StarredAt = starredAt.Time.UTC().Format(time.RFC3339Nano)
	}
	if completedAt.Valid {
		task.CompletedAt = completedAt.Time.UTC().Format(time.RFC3339Nano)
	}
	task.CreatedAt = createdAt.UTC().Format(time.RFC3339Nano)
	task.UpdatedAt = updatedAt.UTC().Format(time.RFC3339Nano)
	return task, nil
}

func databaseContext() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}
