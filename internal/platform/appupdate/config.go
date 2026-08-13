package appupdate

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	coreupdate "dn-wails/internal/appupdate"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrSourceNotConfigured = errors.New("application update source is not configured")

type SourceSelector struct {
	AppCode  string
	Channel  string
	Platform string
	Arch     string
}

func LoadSourceConfig(databaseURL string, selector SourceSelector) (coreupdate.SourceConfig, error) {
	config, err := pgxpool.ParseConfig(strings.TrimSpace(databaseURL))
	if err != nil {
		return coreupdate.SourceConfig{}, fmt.Errorf("parse update source database connection: %w", err)
	}
	config.MaxConns = 1
	config.MinConns = 0
	config.MaxConnIdleTime = time.Minute
	config.MaxConnLifetime = 5 * time.Minute
	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return coreupdate.SourceConfig{}, fmt.Errorf("create update source database pool: %w", err)
	}
	defer pool.Close()

	appCode := strings.TrimSpace(selector.AppCode)
	channel := strings.TrimSpace(selector.Channel)
	platform := strings.TrimSpace(selector.Platform)
	arch := strings.TrimSpace(selector.Arch)
	if appCode == "" || channel == "" || platform == "" || arch == "" {
		return coreupdate.SourceConfig{}, fmt.Errorf("%w: invalid source selector", ErrSourceNotConfigured)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	var value coreupdate.SourceConfig
	err = pool.QueryRow(ctx, `
		select update_endpoint, expected_repository
		from sys_app_update_source
		where app_code = $1
		  and channel = $2
		  and is_enabled
		  and deleted_at is null
		  and (platform = $3 or platform = '*')
		  and (arch = $4 or arch = '*')
		order by (platform = $3) desc, (arch = $4) desc, priority desc, id desc
		limit 1
	`, appCode, channel, platform, arch).Scan(&value.UpdateEndpoint, &value.Repository)
	if errors.Is(err, pgx.ErrNoRows) {
		return coreupdate.SourceConfig{}, ErrSourceNotConfigured
	}
	if err != nil {
		return coreupdate.SourceConfig{}, fmt.Errorf("load application update source: %w", err)
	}
	value.UpdateEndpoint = strings.TrimSpace(value.UpdateEndpoint)
	value.Repository = strings.TrimSpace(value.Repository)
	if value.UpdateEndpoint == "" || value.Repository == "" {
		return coreupdate.SourceConfig{}, fmt.Errorf("%w: update endpoint and repository are required", ErrSourceNotConfigured)
	}
	return value, nil
}
