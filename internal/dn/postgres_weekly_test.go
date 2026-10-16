package dn

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type weeklyTestIdentity struct{}

func (weeklyTestIdentity) CurrentUserID() (int, error)      { return 1, nil }
func (weeklyTestIdentity) CurrentAdminUserID() (int, error) { return 1, nil }

func TestWeeklyPlanCurrentSchema(t *testing.T) {
	databaseURL := os.Getenv("DN_TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DN_TEST_DATABASE_URL is not set; PostgreSQL integration test skipped")
	}
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	config.MaxConns = 1
	config.ConnConfig.RuntimeParams["search_path"] = "pg_temp"
	config.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
		_, err := conn.Exec(ctx, `
			create temporary table dn_role_profession (
				id serial primary key, owner_id integer not null, role_name text not null,
				profession text not null, priority integer not null, sort_order integer not null,
				deleted_at timestamptz
			);
			insert into dn_role_profession values (1,1,'Role','Class',1,0,null), (2,2,'Other','Class',1,0,null);
			create temporary table dn_weekly_plan (
				id serial primary key, owner_id integer not null, role_name text not null,
				profession text, priority integer not null, remaining_commission_count integer not null default 6,
				has_invasion boolean not null default false, has_ark boolean not null default false,
				has_nightmare boolean not null default false, remark text, sort_order integer not null,
				role_profession_id integer, created_at timestamptz not null, updated_at timestamptz not null
			);
			insert into dn_weekly_plan
				(owner_id,role_name,profession,priority,remaining_commission_count,sort_order,role_profession_id,created_at,updated_at)
				values (2,'Other','Class',1,4,0,2,now(),now());
		`)

		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	if err := pool.Ping(ctx); err != nil {
		t.Fatal(err)
	}
	service := &PostgresService{pool: pool, identity: weeklyTestIdentity{}}
	created, err := service.SaveWeeklyPlan(WeeklyPlanInput{RoleProfessionID: 1, RemainingCommissionCount: 6})
	if err != nil || created.RemainingCommissionCount != 6 {
		t.Fatalf("create: %+v %v", created, err)
	}
	updated, err := service.SaveWeeklyPlan(WeeklyPlanInput{ID: created.ID, RoleProfessionID: 1, RemainingCommissionCount: 3, HasArk: true})
	if err != nil || updated.RemainingCommissionCount != 3 || !updated.HasArk {
		t.Fatalf("update: %+v %v", updated, err)
	}
	listed, err := service.ListWeeklyPlans(WeeklyPlanQuery{})
	if err != nil || len(listed.Items) != 1 || listed.Items[0].RemainingCommissionCount != 3 {
		t.Fatalf("list: %+v %v", listed, err)
	}
	if _, err := service.InitializeWeeklyPlans(); err != nil {
		t.Fatal(err)
	}
	plans, err := service.AllWeeklyPlans()
	if err != nil || len(plans) != 1 || plans[0].RemainingCommissionCount != 6 || plans[0].HasArk {
		t.Fatalf("reset: %+v %v", plans, err)
	}
	if _, err := service.DeleteWeeklyPlan(created.ID); err != nil {
		t.Fatal(err)
	}
	result, err := service.SyncWeeklyPlans()
	if err != nil || result.Created != 1 {
		t.Fatalf("sync missing role: %+v %v", result, err)
	}
	var otherCount int
	if err := pool.QueryRow(ctx, `select remaining_commission_count from dn_weekly_plan where owner_id=2`).Scan(&otherCount); err != nil || otherCount != 4 {
		t.Fatalf("other owner's commission count changed: %d %v", otherCount, err)
	}
}
