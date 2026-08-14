package account

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

	"cull-pear/internal/storage"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	accountSessionStorageKey       = "account-session"
	legacyDesktopSessionStorageKey = "dn-desktop-session"
	maximumAvatarSize              = 5 * 1024 * 1024
)

var (
	ErrInvalidData     = errors.New("invalid account data")
	ErrConflict        = errors.New("account data conflicts with existing data")
	ErrUnauthenticated = errors.New("account authentication required")
	ErrForbidden       = errors.New("account operation forbidden")
	ErrUnavailable     = errors.New("账号服务暂不可用：当前桌面版本未配置安全的服务端连接")
)

type persistedSession struct {
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
	pool  *pgxpool.Pool
	store storage.Store

	sessionMu sync.RWMutex
	token     string
}

func NewPostgresService(databaseURL string, store storage.Store) (*PostgresService, error) {
	config, err := pgxpool.ParseConfig(strings.TrimSpace(databaseURL))
	if err != nil {
		return nil, fmt.Errorf("parse account database connection: %w", err)
	}
	config.MaxConns = 2
	config.MinConns = 0
	config.MaxConnIdleTime = 5 * time.Minute
	config.MaxConnLifetime = 30 * time.Minute
	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("create account database pool: %w", err)
	}
	return &PostgresService{pool: pool, store: store}, nil
}

func (s *PostgresService) Initialize() error {
	ctx, cancel := databaseContext()
	defer cancel()
	if err := s.pool.Ping(ctx); err != nil {
		return fmt.Errorf("connect account database: %w", err)
	}

	data, err := s.store.Load(accountSessionStorageKey)
	loadedLegacySession := false
	if errors.Is(err, storage.ErrNotFound) {
		data, err = s.store.Load(legacyDesktopSessionStorageKey)
		loadedLegacySession = err == nil
	}
	if errors.Is(err, storage.ErrNotFound) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("load account session: %w", err)
	}
	var session persistedSession
	if err := json.Unmarshal(data, &session); err != nil {
		return fmt.Errorf("decode account session: %w", err)
	}
	if err := s.setSessionToken(strings.TrimSpace(session.Token)); err != nil {
		return err
	}
	if loadedLegacySession {
		_ = s.store.Delete(legacyDesktopSessionStorageKey)
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
		select to_regclass('public.sys_user') is not null
			and to_regclass('public.sys_session') is not null
	`).Scan(&schemaReady); err != nil {
		return fmt.Errorf("check account database health: %w", err)
	}
	if !schemaReady {
		return fmt.Errorf("%w: account database schema is incomplete", ErrUnavailable)
	}
	return nil
}

func (s *PostgresService) CurrentUserID() (int, error) {
	current, _, err := s.currentUser(false)
	return current.ID, err
}

func (s *PostgresService) CurrentAdminUserID() (int, error) {
	current, _, err := s.currentUser(true)
	return current.ID, err
}

func (s *PostgresService) AuthState() (AuthState, error) {
	current, _, err := s.currentUser(false)
	if errors.Is(err, ErrUnauthenticated) {
		return AuthState{Authenticated: false}, nil
	}
	if err != nil {
		return AuthState{}, err
	}
	profile := profileFromDatabaseUser(current)
	return AuthState{Authenticated: true, User: &profile}, nil
}

func (s *PostgresService) Register(input RegistrationInput) (Profile, error) {
	accountName := strings.TrimSpace(input.Account)
	email := strings.ToLower(strings.TrimSpace(input.Email))
	if accountName == "" || len([]rune(accountName)) > 80 {
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
	err = s.pool.QueryRow(ctx, `select id from sys_user where account = $1 or email = $2 limit 1`, accountName, email).Scan(&existingID)
	if err == nil {
		return Profile{}, fmt.Errorf("%w: 邮箱或用户名已存在", ErrConflict)
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return Profile{}, fmt.Errorf("check user registration: %w", err)
	}
	created, err := scanDatabaseUser(s.pool.QueryRow(ctx, `
		insert into sys_user (account, name, password, email, role, status, created_at, updated_at)
		values ($1, $1, $2, $3, 0, 1, now(), now())
		returning id, account, coalesce(name, ''), password, email, role, status, coalesce(avatar, ''), created_at, updated_at
	`, accountName, passwordHash, email))
	if err != nil {
		return Profile{}, mapDatabaseError("create user", err)
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
		from sys_user where account = $1 or email = lower($1) limit 1
	`, login))
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && !verifyPassword(input.Password, current.PasswordHash)) {
		return Profile{}, fmt.Errorf("%w: 账号或密码错误", ErrUnauthenticated)
	}
	if err != nil {
		return Profile{}, fmt.Errorf("query user: %w", err)
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
			return Profile{}, fmt.Errorf("upgrade password hash: %w", updateErr)
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
			return fmt.Errorf("revoke account session: %w", err)
		}
	}
	return s.clearSessionToken()
}

func (s *PostgresService) Profile() (Profile, error) {
	current, _, err := s.currentUser(false)
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
	current, _, err := s.currentUser(false)
	if err != nil {
		return Profile{}, err
	}
	ctx, cancel := databaseContext()
	defer cancel()
	updated, err := scanDatabaseUser(s.pool.QueryRow(ctx, `
		update sys_user set name = $1, email = $2, avatar = nullif($3, ''), updated_at = now()
		where id = $4
		returning id, account, coalesce(name, ''), password, email, role, status, coalesce(avatar, ''), created_at, updated_at
	`, name, email, avatar, current.ID))
	if err != nil {
		return Profile{}, mapDatabaseError("update profile", err)
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
	current, _, err := s.currentUser(false)
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
	ctx, cancel := databaseContext()
	defer cancel()
	if _, err := s.pool.Exec(ctx, `update sys_user set password = $1, updated_at = now() where id = $2`, passwordHash, current.ID); err != nil {
		return fmt.Errorf("update password: %w", err)
	}
	return nil
}

func (s *PostgresService) ImportAvatar(path string) (string, error) {
	if _, _, err := s.currentUser(false); err != nil {
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

func (s *PostgresService) currentUser(requireAdmin bool) (databaseUser, string, error) {
	token := s.sessionToken()
	if token == "" {
		return databaseUser{}, "", ErrUnauthenticated
	}
	ctx, cancel := databaseContext()
	defer cancel()
	var current databaseUser
	var sessionID string
	err := s.pool.QueryRow(ctx, `
		select u.id, u.account, coalesce(u.name, ''), u.password, u.email, u.role, u.status,
		       coalesce(u.avatar, ''), u.created_at, u.updated_at, s.id
		from sys_session s join sys_user u on u.id = s.user_id
		where s.token_hash = $1 and s.revoked_at is null limit 1
	`, hashSessionToken(token)).Scan(
		&current.ID, &current.Account, &current.Name, &current.PasswordHash, &current.Email,
		&current.Role, &current.Status, &current.Avatar, &current.CreatedAt, &current.UpdatedAt, &sessionID,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		_ = s.clearSessionToken()
		return databaseUser{}, "", ErrUnauthenticated
	}
	if err != nil {
		return databaseUser{}, "", fmt.Errorf("resolve account session: %w", err)
	}
	if current.Status != UserStatusEnabled {
		_, _ = s.pool.Exec(ctx, `update sys_session set revoked_at = now(), updated_at = now() where id = $1`, sessionID)
		_ = s.clearSessionToken()
		return databaseUser{}, "", ErrUnauthenticated
	}
	if requireAdmin && current.Role != UserRoleAdmin {
		return databaseUser{}, "", fmt.Errorf("%w: 仅管理员可以执行此操作", ErrForbidden)
	}
	return current, sessionID, nil
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
		values ($1, $2, $3, '9999-12-31 23:59:59+00'::timestamptz, $4, 'cull-pear', $4, $4)
	`, sessionID, hashSessionToken(token), userID, now); err != nil {
		return fmt.Errorf("create account session: %w", err)
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
	data, err := json.Marshal(persistedSession{Token: token})
	if err != nil {
		return fmt.Errorf("encode account session: %w", err)
	}
	if err := s.store.Save(accountSessionStorageKey, data); err != nil {
		return fmt.Errorf("persist account session: %w", err)
	}
	s.sessionMu.Lock()
	s.token = token
	s.sessionMu.Unlock()
	return nil
}

func (s *PostgresService) clearSessionToken() error {
	if err := s.store.Delete(accountSessionStorageKey); err != nil {
		return fmt.Errorf("delete account session: %w", err)
	}
	_ = s.store.Delete(legacyDesktopSessionStorageKey)
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
		ID: value.ID, Account: value.Account, Name: value.Name, Email: value.Email,
		Role: value.Role, Status: value.Status, Avatar: value.Avatar,
		CreatedAt: value.CreatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func databaseContext() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

func randomToken(size int) (string, error) {
	data := make([]byte, size)
	if _, err := rand.Read(data); err != nil {
		return "", fmt.Errorf("generate account session token: %w", err)
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
