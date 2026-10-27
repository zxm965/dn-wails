package postgres

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
)

func TestNewPoolConfiguration(t *testing.T) {
	for _, maxConns := range []int32{2, 4} {
		pool, err := NewPool("  postgres://test:secret@127.0.0.1:1/app?pool_max_conns=9&pool_min_conns=0  ", "test", maxConns)
		if err != nil {
			t.Fatal(err)
		}
		config := pool.Config()
		pool.Close()
		if config.MaxConns != maxConns || config.MinConns != 0 || config.MaxConnIdleTime != 5*time.Minute || config.MaxConnLifetime != 30*time.Minute {
			t.Fatalf("unexpected pool limits: %+v", config)
		}
		if config.ConnConfig.Database != "app" {
			t.Fatalf("database = %q", config.ConnConfig.Database)
		}
	}
}

func TestNewPoolPreservesParseError(t *testing.T) {
	pool, err := NewPool("postgres://localhost/db?connect_timeout=invalid", "quick notes", 2)
	if pool != nil {
		pool.Close()
		t.Fatal("invalid connection created a pool")
	}
	var parseError *pgconn.ParseConfigError
	if !errors.As(err, &parseError) || !strings.HasPrefix(err.Error(), "parse quick notes database connection:") {
		t.Fatalf("expected contextual parse error, got %v", err)
	}
}
