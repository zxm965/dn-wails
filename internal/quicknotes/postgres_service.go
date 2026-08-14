package quicknotes

import (
	"context"
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
		return nil, fmt.Errorf("parse quick notes database connection: %w", err)
	}
	config.MaxConns = 2
	config.MinConns = 0
	config.MaxConnIdleTime = 5 * time.Minute
	config.MaxConnLifetime = 30 * time.Minute
	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("create quick notes database pool: %w", err)
	}
	return &PostgresService{pool: pool, identity: identity}, nil
}

func (s *PostgresService) Initialize() error {
	ctx, cancel := databaseContext()
	defer cancel()
	if err := s.pool.Ping(ctx); err != nil {
		return fmt.Errorf("connect quick notes database: %w", err)
	}
	var tableExists bool
	if err := s.pool.QueryRow(ctx, `select to_regclass('public.app_quick_note') is not null`).Scan(&tableExists); err != nil {
		return fmt.Errorf("inspect quick notes schema: %w", err)
	}
	if !tableExists {
		return fmt.Errorf("%w: database migration app_quick_note has not been applied", ErrUnavailable)
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
	if err := s.pool.QueryRow(ctx, `select to_regclass('public.app_quick_note') is not null`).Scan(&schemaReady); err != nil {
		return fmt.Errorf("check quick notes database health: %w", err)
	}
	if !schemaReady {
		return fmt.Errorf("%w: quick notes database schema is incomplete", ErrUnavailable)
	}
	return nil
}

func (s *PostgresService) List() ([]Note, error) {
	ownerID, err := s.identity.CurrentUserID()
	if err != nil {
		return nil, err
	}
	ctx, cancel := databaseContext()
	defer cancel()
	rows, err := s.pool.Query(ctx, `
		select id, title, content, is_pinned, created_at, updated_at
		from app_quick_note
		where owner_id = $1 and deleted_at is null
		order by is_pinned desc, updated_at desc, id desc
	`, ownerID)
	if err != nil {
		return nil, fmt.Errorf("list quick notes: %w", err)
	}
	defer rows.Close()

	notes := make([]Note, 0)
	for rows.Next() {
		note, scanErr := scanNote(rows)
		if scanErr != nil {
			return nil, fmt.Errorf("scan quick note: %w", scanErr)
		}
		notes = append(notes, note)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate quick notes: %w", err)
	}
	return notes, nil
}

func (s *PostgresService) Save(input NoteInput) (Note, error) {
	normalized, err := normalizeInput(input)
	if err != nil {
		return Note{}, err
	}
	ownerID, err := s.identity.CurrentUserID()
	if err != nil {
		return Note{}, err
	}
	ctx, cancel := databaseContext()
	defer cancel()

	var row pgx.Row
	if normalized.ID == 0 {
		row = s.pool.QueryRow(ctx, `
			insert into app_quick_note (owner_id, title, content, is_pinned)
			values ($1, $2, $3, $4)
			returning id, title, content, is_pinned, created_at, updated_at
		`, ownerID, normalized.Title, normalized.Content, normalized.Pinned)
	} else {
		row = s.pool.QueryRow(ctx, `
			update app_quick_note
			set title = $1, content = $2, is_pinned = $3, updated_at = now()
			where id = $4 and owner_id = $5 and deleted_at is null
			returning id, title, content, is_pinned, created_at, updated_at
		`, normalized.Title, normalized.Content, normalized.Pinned, normalized.ID, ownerID)
	}

	note, err := scanNote(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Note{}, fmt.Errorf("%w: %d", ErrNoteNotFound, normalized.ID)
	}
	if err != nil {
		return Note{}, fmt.Errorf("save quick note: %w", err)
	}
	return note, nil
}

func (s *PostgresService) Delete(id int64) error {
	if id <= 0 {
		return fmt.Errorf("%w: note id must be positive", ErrInvalidNote)
	}
	ownerID, err := s.identity.CurrentUserID()
	if err != nil {
		return err
	}
	ctx, cancel := databaseContext()
	defer cancel()
	result, err := s.pool.Exec(ctx, `
		update app_quick_note
		set deleted_at = now(), updated_at = now()
		where id = $1 and owner_id = $2 and deleted_at is null
	`, id, ownerID)
	if err != nil {
		return fmt.Errorf("delete quick note: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("%w: %d", ErrNoteNotFound, id)
	}
	return nil
}

type noteScanner interface {
	Scan(dest ...any) error
}

func scanNote(row noteScanner) (Note, error) {
	var note Note
	var createdAt time.Time
	var updatedAt time.Time
	if err := row.Scan(&note.ID, &note.Title, &note.Content, &note.Pinned, &createdAt, &updatedAt); err != nil {
		return Note{}, err
	}
	note.CreatedAt = createdAt.UTC().Format(time.RFC3339Nano)
	note.UpdatedAt = updatedAt.UTC().Format(time.RFC3339Nano)
	return note, nil
}

func databaseContext() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}
