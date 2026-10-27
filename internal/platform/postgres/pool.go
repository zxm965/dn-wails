// Package postgres provides connection pool configuration shared by database adapters.
package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPool creates an independent, lazily connected pool owned by the calling service.
func NewPool(databaseURL, service string, maxConns int32) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(strings.TrimSpace(databaseURL))
	if err != nil {
		return nil, fmt.Errorf("parse %s database connection: %w", service, err)
	}
	config.MaxConns = maxConns
	config.MinConns = 0
	config.MaxConnIdleTime = 5 * time.Minute
	config.MaxConnLifetime = 30 * time.Minute
	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("create %s database pool: %w", service, err)
	}
	return pool, nil
}
