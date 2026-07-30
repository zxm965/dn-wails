package dn

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"dn-wails/internal/storage"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

const desktopSessionStorageKey = "dn-desktop-session"

type persistedDesktopSession struct {
	Token string `json:"token"`
}

type databaseUser struct {
	ID           int
	Account      string
	Name         string
	PasswordHash string
	Email        string
	Role         int
	Status       int
	Avatar       string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type PostgresService struct {
	pool       *pgxpool.Pool
	store      storage.Store
	httpClient *http.Client

	sessionMu sync.RWMutex
	token     string
	syncMu    sync.Mutex
}

func NewPostgresService(databaseURL string, store storage.Store) (*PostgresService, error) {
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
		store:      store,
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}, nil
}

func (s *PostgresService) Initialize() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := s.pool.Ping(ctx); err != nil {
		return fmt.Errorf("connect DN database: %w", err)
	}
	if _, err := s.pool.Exec(ctx, `delete from sys_session where revoked_at is not null or expires_at <= now()`); err != nil {
		return fmt.Errorf("delete expired DN sessions: %w", err)
	}
	data, err := s.store.Load(desktopSessionStorageKey)
	if errors.Is(err, storage.ErrNotFound) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("load DN desktop session: %w", err)
	}
	var session persistedDesktopSession
	if err := json.Unmarshal(data, &session); err != nil {
		return fmt.Errorf("decode DN desktop session: %w", err)
	}
	s.sessionMu.Lock()
	s.token = strings.TrimSpace(session.Token)
	s.sessionMu.Unlock()
	return nil
}

func (s *PostgresService) Close() error {
	s.pool.Close()
	return nil
}

func (s *PostgresService) AuthState() (AuthState, error) {
	ctx, cancel := databaseContext()
	defer cancel()
	current, session, err := s.currentUser(ctx, false)
	if errors.Is(err, ErrUnauthenticated) {
		return AuthState{Authenticated: false}, nil
	}
	if err != nil {
		return AuthState{}, err
	}
	profile := profileFromDatabaseUser(current)
	return AuthState{Authenticated: true, User: &profile, ExpiresAt: session.ExpiresAt.UTC().Format(time.RFC3339Nano)}, nil
}

func (s *PostgresService) Register(input RegistrationInput) (Profile, error) {
	account := strings.TrimSpace(input.Account)
	email := strings.ToLower(strings.TrimSpace(input.Email))
	if account == "" || len([]rune(account)) > 80 {
		return Profile{}, fmt.Errorf("%w: 用户名不能为空且不能超过 80 个字符", ErrInvalidData)
	}
	if !validEmail(email) {
		return Profile{}, fmt.Errorf("%w: 邮箱格式不正确", ErrInvalidData)
	}
	if err := validatePassword(input.Password); err != nil {
		return Profile{}, err
	}
	passwordHash, err := hashPassword(input.Password)
	if err != nil {
		return Profile{}, err
	}

	ctx, cancel := databaseContext()
	defer cancel()
	var existingID int
	err = s.pool.QueryRow(ctx, `select id from sys_user where account = $1 or email = $2 limit 1`, account, email).Scan(&existingID)
	if err == nil {
		return Profile{}, fmt.Errorf("%w: 邮箱或用户名已存在", ErrConflict)
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return Profile{}, fmt.Errorf("check DN user registration: %w", err)
	}

	created, err := scanDatabaseUser(s.pool.QueryRow(ctx, `
		insert into sys_user (account, name, password, email, role, status, created_at, updated_at)
		values ($1, $1, $2, $3, 0, 1, now(), now())
		returning id, account, coalesce(name, ''), password, email, role, status, coalesce(avatar, ''), created_at, updated_at
	`, account, passwordHash, email))
	if err != nil {
		return Profile{}, mapDatabaseError("create DN user", err)
	}
	if err := s.createSession(ctx, created.ID); err != nil {
		return Profile{}, err
	}
	return profileFromDatabaseUser(created), nil
}

func (s *PostgresService) Login(input LoginInput) (Profile, error) {
	login := strings.TrimSpace(input.Login)
	if login == "" {
		return Profile{}, fmt.Errorf("%w: 请输入用户名或邮箱", ErrInvalidData)
	}
	if err := validatePassword(input.Password); err != nil {
		return Profile{}, err
	}
	ctx, cancel := databaseContext()
	defer cancel()
	current, err := scanDatabaseUser(s.pool.QueryRow(ctx, `
		select id, account, coalesce(name, ''), password, email, role, status, coalesce(avatar, ''), created_at, updated_at
		from sys_user
		where account = $1 or email = lower($1)
		limit 1
	`, login))
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && !verifyPassword(input.Password, current.PasswordHash)) {
		return Profile{}, fmt.Errorf("%w: 账号或密码错误", ErrUnauthenticated)
	}
	if err != nil {
		return Profile{}, fmt.Errorf("query DN user: %w", err)
	}
	if current.Status != UserStatusEnabled {
		return Profile{}, fmt.Errorf("%w: 当前账号已被禁用", ErrForbidden)
	}
	if !strings.HasPrefix(current.PasswordHash, passwordHashPrefix+":") {
		passwordHash, hashErr := hashPassword(input.Password)
		if hashErr != nil {
			return Profile{}, hashErr
		}
		if _, updateErr := s.pool.Exec(ctx, `update sys_user set password = $1, updated_at = now() where id = $2`, passwordHash, current.ID); updateErr != nil {
			return Profile{}, fmt.Errorf("upgrade DN password hash: %w", updateErr)
		}
	}
	if err := s.createSession(ctx, current.ID); err != nil {
		return Profile{}, err
	}
	return profileFromDatabaseUser(current), nil
}

func (s *PostgresService) Logout() error {
	ctx, cancel := databaseContext()
	defer cancel()
	token := s.sessionToken()
	if token != "" {
		if _, err := s.pool.Exec(ctx, `update sys_session set revoked_at = now(), updated_at = now() where token_hash = $1 and revoked_at is null`, hashSessionToken(token)); err != nil {
			return fmt.Errorf("revoke DN session: %w", err)
		}
	}
	return s.clearSessionToken()
}

func (s *PostgresService) Profile() (Profile, error) {
	ctx, cancel := databaseContext()
	defer cancel()
	current, _, err := s.currentUser(ctx, false)
	if err != nil {
		return Profile{}, err
	}
	return profileFromDatabaseUser(current), nil
}

func (s *PostgresService) UpdateProfile(input ProfileInput) (Profile, error) {
	name := strings.TrimSpace(input.Name)
	email := strings.ToLower(strings.TrimSpace(input.Email))
	avatar := strings.TrimSpace(input.Avatar)
	if name == "" || len([]rune(name)) > 80 {
		return Profile{}, fmt.Errorf("%w: 显示名称不能为空且不能超过 80 个字符", ErrInvalidData)
	}
	if !validEmail(email) {
		return Profile{}, fmt.Errorf("%w: 邮箱格式不正确", ErrInvalidData)
	}
	if err := validateAvatar(avatar); err != nil {
		return Profile{}, err
	}
	ctx, cancel := databaseContext()
	defer cancel()
	current, _, err := s.currentUser(ctx, false)
	if err != nil {
		return Profile{}, err
	}
	updated, err := scanDatabaseUser(s.pool.QueryRow(ctx, `
		update sys_user
		set name = $1, email = $2, avatar = nullif($3, ''), updated_at = now()
		where id = $4
		returning id, account, coalesce(name, ''), password, email, role, status, coalesce(avatar, ''), created_at, updated_at
	`, name, email, avatar, current.ID))
	if err != nil {
		return Profile{}, mapDatabaseError("update DN profile", err)
	}
	return profileFromDatabaseUser(updated), nil
}

func (s *PostgresService) ChangePassword(input PasswordInput) error {
	if input.CurrentPassword == "" {
		return fmt.Errorf("%w: 当前密码不能为空", ErrInvalidData)
	}
	if err := validatePassword(input.NewPassword); err != nil {
		return err
	}
	if input.CurrentPassword == input.NewPassword {
		return fmt.Errorf("%w: 新密码不能与当前密码一致", ErrInvalidData)
	}
	ctx, cancel := databaseContext()
	defer cancel()
	current, _, err := s.currentUser(ctx, false)
	if err != nil {
		return err
	}
	if !verifyPassword(input.CurrentPassword, current.PasswordHash) {
		return fmt.Errorf("%w: 当前密码不正确", ErrInvalidData)
	}
	passwordHash, err := hashPassword(input.NewPassword)
	if err != nil {
		return err
	}
	if _, err := s.pool.Exec(ctx, `update sys_user set password = $1, updated_at = now() where id = $2`, passwordHash, current.ID); err != nil {
		return fmt.Errorf("update DN password: %w", err)
	}
	return nil
}

func (s *PostgresService) ImportAvatar(path string) (string, error) {
	ctx, cancel := databaseContext()
	defer cancel()
	if _, _, err := s.currentUser(ctx, false); err != nil {
		return "", err
	}
	path = strings.TrimSpace(path)
	if path == "" {
		return "", fmt.Errorf("%w: avatar path is required", ErrInvalidData)
	}
	info, err := os.Stat(path)
	if err != nil {
		return "", fmt.Errorf("inspect avatar file: %w", err)
	}
	if info.IsDir() || info.Size() > maximumAvatarSize {
		return "", fmt.Errorf("%w: avatar must be a file no larger than 5MB", ErrInvalidData)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("read avatar file: %w", err)
	}
	contentType := http.DetectContentType(data)
	switch contentType {
	case "image/jpeg", "image/png", "image/gif", "image/webp":
	default:
		return "", fmt.Errorf("%w: unsupported avatar format %q", ErrInvalidData, contentType)
	}
	return fmt.Sprintf("data:%s;base64,%s", contentType, base64.StdEncoding.EncodeToString(data)), nil
}

type databaseSession struct {
	ID         string
	ExpiresAt  time.Time
	LastUsedAt time.Time
}

func (s *PostgresService) currentUser(ctx context.Context, requireAdmin bool) (databaseUser, databaseSession, error) {
	token := s.sessionToken()
	if token == "" {
		return databaseUser{}, databaseSession{}, ErrUnauthenticated
	}
	var current databaseUser
	var session databaseSession
	err := s.pool.QueryRow(ctx, `
		select u.id, u.account, coalesce(u.name, ''), u.password, u.email, u.role, u.status,
		       coalesce(u.avatar, ''), u.created_at, u.updated_at,
		       s.id, s.expires_at, s.last_used_at
		from sys_session s
		join sys_user u on u.id = s.user_id
		where s.token_hash = $1 and s.revoked_at is null
		limit 1
	`, hashSessionToken(token)).Scan(
		&current.ID, &current.Account, &current.Name, &current.PasswordHash, &current.Email,
		&current.Role, &current.Status, &current.Avatar, &current.CreatedAt, &current.UpdatedAt,
		&session.ID, &session.ExpiresAt, &session.LastUsedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		_ = s.clearSessionToken()
		return databaseUser{}, databaseSession{}, ErrUnauthenticated
	}
	if err != nil {
		return databaseUser{}, databaseSession{}, fmt.Errorf("resolve DN session: %w", err)
	}
	now := time.Now().UTC()
	if current.Status != UserStatusEnabled || !session.ExpiresAt.After(now) {
		_, _ = s.pool.Exec(ctx, `update sys_session set revoked_at = now(), updated_at = now() where id = $1`, session.ID)
		_ = s.clearSessionToken()
		return databaseUser{}, databaseSession{}, ErrUnauthenticated
	}
	if requireAdmin && current.Role != UserRoleAdmin {
		return databaseUser{}, databaseSession{}, fmt.Errorf("%w: 仅管理员可以执行此操作", ErrForbidden)
	}
	if now.Sub(session.LastUsedAt) >= sessionRefreshAge {
		session.ExpiresAt = now.Add(sessionDuration)
		session.LastUsedAt = now
		if _, err := s.pool.Exec(ctx, `update sys_session set last_used_at = $1, expires_at = $2, updated_at = now() where id = $3`, session.LastUsedAt, session.ExpiresAt, session.ID); err != nil {
			return databaseUser{}, databaseSession{}, fmt.Errorf("refresh DN session: %w", err)
		}
	}
	return current, session, nil
}

func (s *PostgresService) createSession(ctx context.Context, userID int) error {
	token, err := randomToken(32)
	if err != nil {
		return err
	}
	sessionID, err := randomToken(16)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	if _, err := s.pool.Exec(ctx, `
		insert into sys_session (id, token_hash, user_id, expires_at, last_used_at, user_agent, created_at, updated_at)
		values ($1, $2, $3, $4, $5, 'dn-wails', $5, $5)
	`, sessionID, hashSessionToken(token), userID, now.Add(sessionDuration), now); err != nil {
		return fmt.Errorf("create DN session: %w", err)
	}
	if err := s.setSessionToken(token); err != nil {
		_, _ = s.pool.Exec(ctx, `update sys_session set revoked_at = now(), updated_at = now() where id = $1`, sessionID)
		return err
	}
	return nil
}

func (s *PostgresService) sessionToken() string {
	s.sessionMu.RLock()
	defer s.sessionMu.RUnlock()
	return s.token
}

func (s *PostgresService) setSessionToken(token string) error {
	data, err := json.Marshal(persistedDesktopSession{Token: token})
	if err != nil {
		return fmt.Errorf("encode DN desktop session: %w", err)
	}
	if err := s.store.Save(desktopSessionStorageKey, data); err != nil {
		return fmt.Errorf("persist DN desktop session: %w", err)
	}
	s.sessionMu.Lock()
	s.token = token
	s.sessionMu.Unlock()
	return nil
}

func (s *PostgresService) clearSessionToken() error {
	if err := s.store.Delete(desktopSessionStorageKey); err != nil {
		return fmt.Errorf("delete DN desktop session: %w", err)
	}
	s.sessionMu.Lock()
	s.token = ""
	s.sessionMu.Unlock()
	return nil
}

func scanDatabaseUser(row pgx.Row) (databaseUser, error) {
	var value databaseUser
	err := row.Scan(
		&value.ID, &value.Account, &value.Name, &value.PasswordHash, &value.Email,
		&value.Role, &value.Status, &value.Avatar, &value.CreatedAt, &value.UpdatedAt,
	)
	return value, err
}

func profileFromDatabaseUser(value databaseUser) Profile {
	return Profile{
		ID:        value.ID,
		Account:   value.Account,
		Name:      value.Name,
		Email:     value.Email,
		Role:      value.Role,
		Status:    value.Status,
		Avatar:    value.Avatar,
		CreatedAt: value.CreatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func databaseContext() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

func randomToken(size int) (string, error) {
	data := make([]byte, size)
	if _, err := rand.Read(data); err != nil {
		return "", fmt.Errorf("generate DN session token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(data), nil
}

func hashSessionToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
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
