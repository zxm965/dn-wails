package tasks

import (
	"context"
	"database/sql"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type taskTestIdentity struct{}

func (taskTestIdentity) CurrentUserID() (int, error) { return 1, nil }

func TestPostgresSaveTaskEdit(t *testing.T) {
	databaseURL := os.Getenv("TASKS_TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("set TASKS_TEST_DATABASE_URL to run PostgreSQL task-save regression tests")
	}
	service := newTaskTestService(t, databaseURL)
	list, err := service.SaveList(ListInput{Title: "编辑回归测试"})
	if err != nil {
		t.Fatalf("create task list: %v", err)
	}

	for _, frequency := range []string{"none", "daily", "weekly", "monthly", "yearly"} {
		t.Run(frequency, func(t *testing.T) {
			input := TaskInput{ListID: list.ID, Title: "原始任务"}
			if frequency != "none" {
				input.ScheduledAt = "2026-10-09T01:00:00Z"
				input.DeadlineAt = "2026-10-09T02:00:00Z"
			}
			created, err := service.SaveTask(input)
			if err != nil {
				t.Fatalf("create task: %v", err)
			}
			input.ID = created.ID
			input.Title = "已编辑任务"
			input.Details = "更新说明"
			input.TimeZone = "Asia/Shanghai"
			input.Starred = true
			input.Repeat = RepeatRule{Frequency: frequency, Interval: 2, EndMode: "count", Count: 4}
			updated, err := service.SaveTask(input)
			if err != nil {
				t.Fatalf("edit task: %v", err)
			}
			if updated.ID != created.ID || updated.ListID != list.ID || updated.Title != input.Title ||
				updated.Details != input.Details || updated.TimeZone != input.TimeZone || !updated.Starred || updated.StarredAt == "" ||
				updated.ScheduledAt != input.ScheduledAt || updated.DeadlineAt != input.DeadlineAt {
				t.Fatalf("edited task fields were not saved: %#v", updated)
			}
			expectedRule := input.Repeat
			var expectedSeriesID int64
			if frequency == "none" {
				expectedRule = RepeatRule{Frequency: "none", Interval: 1, EndMode: "never"}
			} else {
				expectedSeriesID = created.ID
			}
			if updated.Repeat != expectedRule || updated.RepeatSeriesID != expectedSeriesID {
				t.Fatalf("unexpected repeat state: %#v", updated)
			}

			// Editing without changing dates must preserve the claimed reminder and series.
			ctx, cancel := databaseContext()
			defer cancel()
			if _, err := service.pool.Exec(ctx, `
				update app_task set notification_sent_for = scheduled_at where id = $1
			`, created.ID); err != nil {
				t.Fatalf("mark reminder claimed: %v", err)
			}
			resaved, err := service.SaveTask(input)
			if err != nil {
				t.Fatalf("edit task again: %v", err)
			}
			if resaved.RepeatSeriesID != expectedSeriesID || resaved.StarredAt != updated.StarredAt {
				t.Fatalf("repeat series or star timestamp changed: %#v", resaved)
			}
			var claimed sql.NullTime
			if err := service.pool.QueryRow(ctx, `select notification_sent_for from app_task where id = $1`, created.ID).Scan(&claimed); err != nil {
				t.Fatalf("load claimed reminder: %v", err)
			}
			if claimed.Valid != (input.ScheduledAt != "") || (claimed.Valid && claimed.Time.UTC().Format(time.RFC3339) != input.ScheduledAt) {
				t.Fatalf("claimed reminder changed: %#v", claimed)
			}

			input.Repeat = RepeatRule{Frequency: "none"}
			input.Starred = false
			input.ScheduledAt = ""
			input.DeadlineAt = ""
			stopped, err := service.SaveTask(input)
			if err != nil {
				t.Fatalf("disable repeat and clear dates: %v", err)
			}
			if stopped.Repeat.Frequency != "none" || stopped.RepeatSeriesID != 0 || stopped.Starred ||
				stopped.StarredAt != "" || stopped.ScheduledAt != "" || stopped.DeadlineAt != "" {
				t.Fatalf("task state was not cleared: %#v", stopped)
			}
			if err := service.pool.QueryRow(ctx, `select notification_sent_for from app_task where id = $1`, created.ID).Scan(&claimed); err != nil {
				t.Fatalf("load reset reminder: %v", err)
			}
			if claimed.Valid {
				t.Fatalf("changed dates did not reset claimed reminder: %#v", claimed)
			}
		})
	}
}

func newTaskTestService(t *testing.T, databaseURL string) *PostgresService {
	t.Helper()
	migration, err := os.ReadFile("../../database/migrations/20260908_create_tasks.sql")
	if err != nil {
		t.Fatalf("read task migration: %v", err)
	}
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		t.Fatalf("parse test database connection: %v", err)
	}
	config.MaxConns = 1
	// Restrict every query to connection-local tables, even if the database has app tables.
	config.ConnConfig.RuntimeParams["search_path"] = "pg_temp"
	config.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
		if _, err := conn.Exec(ctx, `create temporary table sys_user (id integer primary key); insert into sys_user (id) values (1)`); err != nil {
			return err
		}
		_, err := conn.Exec(ctx, strings.ReplaceAll(string(migration), "create table if not exists", "create temporary table"))
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		t.Fatalf("create test pool: %v", err)
	}
	t.Cleanup(pool.Close)
	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("initialize temporary task tables: %v", err)
	}
	return &PostgresService{pool: pool, identity: taskTestIdentity{}}
}
