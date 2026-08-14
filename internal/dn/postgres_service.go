package dn

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserIdentity interface {
	CurrentUserID() (int, error)
	CurrentAdminUserID() (int, error)
}

type PostgresService struct {
	pool       *pgxpool.Pool
	identity   UserIdentity
	httpClient *http.Client

	syncMu sync.Mutex
}

func NewPostgresService(databaseURL string, identity UserIdentity) (*PostgresService, error) {
	config, err := pgxpool.ParseConfig(strings.TrimSpace(databaseURL))
	if err != nil {
		return nil, fmt.Errorf("parse DN database connection: %w", err)
	}
	config.MaxConns = 4
	config.MinConns = 0
	config.MaxConnIdleTime = 5 * time.Minute
	config.MaxConnLifetime = 30 * time.Minute
	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("create DN database pool: %w", err)
	}
	return &PostgresService{
		pool:       pool,
		identity:   identity,
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}, nil
}

func (s *PostgresService) Initialize() error {
	ctx, cancel := databaseContext()
	defer cancel()
	if err := s.pool.Ping(ctx); err != nil {
		return fmt.Errorf("connect DN database: %w", err)
	}
	return nil
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
		select to_regclass('public.dn_role_profession') is not null
			and to_regclass('public.dn_weekly_plan') is not null
			and to_regclass('public.sys_site_message') is not null
	`).Scan(&schemaReady); err != nil {
		return fmt.Errorf("check DN database health: %w", err)
	}
	if !schemaReady {
		return fmt.Errorf("%w: DN database schema is incomplete", ErrUnavailable)
	}
	return nil
}

func databaseContext() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

func mapDatabaseError(action string, err error) error {
	var postgresError *pgconn.PgError
	if errors.As(err, &postgresError) {
		switch postgresError.Code {
		case "23505":
			return fmt.Errorf("%w: duplicate database record", ErrConflict)
		case "23503", "23514":
			return fmt.Errorf("%w: database constraint rejected the value", ErrInvalidData)
		}
	}
	return fmt.Errorf("%s: %w", action, err)
}
