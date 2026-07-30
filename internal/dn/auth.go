package dn

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"golang.org/x/crypto/scrypt"
)

const (
	passwordHashPrefix = "scrypt"
	passwordKeyLength  = 64
	sessionDuration    = 24 * time.Hour
	sessionRefreshAge  = 5 * time.Minute
)

func (s *Service) AuthState() (AuthState, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().UTC()
	current, err := s.authenticatedUserLocked(now)
	if err == nil {
		profile := profileFromUser(*current)
		lastUsedAt, _ := time.Parse(time.RFC3339Nano, s.state.Session.LastUsedAt)
		if lastUsedAt.IsZero() || now.Sub(lastUsedAt) >= sessionRefreshAge {
			next := cloneState(s.state)
			next.Session.LastUsedAt = now.Format(time.RFC3339Nano)
			next.Session.ExpiresAt = now.Add(sessionDuration).Format(time.RFC3339Nano)
			if commitErr := s.commit(next); commitErr != nil {
				return AuthState{}, commitErr
			}
		}
		return AuthState{Authenticated: true, User: &profile, ExpiresAt: s.state.Session.ExpiresAt}, nil
	}
	if !errors.Is(err, ErrUnauthenticated) {
		return AuthState{}, err
	}
	if s.state.Session.UserID != 0 || s.state.Session.ExpiresAt != "" {
		next := cloneState(s.state)
		next.Session = session{}
		if commitErr := s.commit(next); commitErr != nil {
			return AuthState{}, commitErr
		}
	}
	return AuthState{Authenticated: false}, nil
}

func (s *Service) Register(input RegistrationInput) (Profile, error) {
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

	s.mu.Lock()
	defer s.mu.Unlock()
	next := cloneState(s.state)
	for _, existing := range next.Users {
		if strings.EqualFold(existing.Account, account) || strings.EqualFold(existing.Email, email) {
			return Profile{}, fmt.Errorf("%w: 邮箱或用户名已存在", ErrConflict)
		}
	}

	now := time.Now().UTC()
	name := account
	avatar := ""
	if len(next.Users) == 0 && next.LegacyProfile != nil {
		if legacyName := strings.TrimSpace(next.LegacyProfile.Name); legacyName != "" {
			name = legacyName
		}
		avatar = strings.TrimSpace(next.LegacyProfile.Avatar)
	}
	role := UserRoleMember
	if len(next.Users) == 0 {
		role = UserRoleAdmin
	}
	created := user{
		ID:           next.NextUserID,
		Account:      account,
		Name:         name,
		Email:        email,
		PasswordHash: passwordHash,
		Role:         role,
		Status:       UserStatusEnabled,
		Avatar:       avatar,
		CreatedAt:    now.Format(time.RFC3339Nano),
		UpdatedAt:    now.Format(time.RFC3339Nano),
	}
	next.NextUserID++
	next.Users = append(next.Users, created)
	if len(next.Users) == 1 {
		claimLegacyData(&next, created.ID)
	}
	next.Session = session{
		UserID:     created.ID,
		ExpiresAt:  now.Add(sessionDuration).Format(time.RFC3339Nano),
		LastUsedAt: now.Format(time.RFC3339Nano),
	}
	if err := s.commit(next); err != nil {
		return Profile{}, err
	}
	return profileFromUser(created), nil
}

func (s *Service) Login(input LoginInput) (Profile, error) {
	login := strings.TrimSpace(input.Login)
	if login == "" || len([]rune(login)) > 320 {
		return Profile{}, fmt.Errorf("%w: 请输入用户名或邮箱", ErrInvalidData)
	}
	if err := validatePassword(input.Password); err != nil {
		return Profile{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	next := cloneState(s.state)
	userIndex := -1
	for index := range next.Users {
		if next.Users[index].Account == login || strings.EqualFold(next.Users[index].Email, login) {
			userIndex = index
			break
		}
	}
	if userIndex < 0 || !verifyPassword(input.Password, next.Users[userIndex].PasswordHash) {
		return Profile{}, fmt.Errorf("%w: 账号或密码错误", ErrUnauthenticated)
	}
	if next.Users[userIndex].Status != UserStatusEnabled {
		return Profile{}, fmt.Errorf("%w: 当前账号已被禁用", ErrForbidden)
	}

	now := time.Now().UTC()
	next.Session = session{
		UserID:     next.Users[userIndex].ID,
		ExpiresAt:  now.Add(sessionDuration).Format(time.RFC3339Nano),
		LastUsedAt: now.Format(time.RFC3339Nano),
	}
	if err := s.commit(next); err != nil {
		return Profile{}, err
	}
	return profileFromUser(next.Users[userIndex]), nil
}

func (s *Service) Logout() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.state.Session.UserID == 0 && s.state.Session.ExpiresAt == "" {
		return nil
	}
	next := cloneState(s.state)
	next.Session = session{}
	return s.commit(next)
}

func (s *Service) Profile() (Profile, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	current, err := s.authenticatedUserLocked(time.Now())
	if err != nil {
		return Profile{}, err
	}
	return profileFromUser(*current), nil
}

func (s *Service) UpdateProfile(input ProfileInput) (Profile, error) {
	name := strings.TrimSpace(input.Name)
	email := strings.ToLower(strings.TrimSpace(input.Email))
	avatar := strings.TrimSpace(input.Avatar)
	if name == "" {
		return Profile{}, fmt.Errorf("%w: 显示名称不能为空", ErrInvalidData)
	}
	if len([]rune(name)) > 80 {
		return Profile{}, fmt.Errorf("%w: 显示名称不能超过 80 个字符", ErrInvalidData)
	}
	if !validEmail(email) {
		return Profile{}, fmt.Errorf("%w: 邮箱格式不正确", ErrInvalidData)
	}
	if err := validateAvatar(avatar); err != nil {
		return Profile{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	current, err := s.authenticatedUserLocked(time.Now())
	if err != nil {
		return Profile{}, err
	}
	next := cloneState(s.state)
	for _, existing := range next.Users {
		if existing.ID != current.ID && strings.EqualFold(existing.Email, email) {
			return Profile{}, fmt.Errorf("%w: 邮箱已存在", ErrConflict)
		}
	}
	index := findUserIndex(next.Users, current.ID)
	if index < 0 {
		return Profile{}, ErrUnauthenticated
	}
	next.Users[index].Name = name
	next.Users[index].Email = email
	next.Users[index].Avatar = avatar
	next.Users[index].UpdatedAt = time.Now().UTC().Format(time.RFC3339Nano)
	if err := s.commit(next); err != nil {
		return Profile{}, err
	}
	return profileFromUser(next.Users[index]), nil
}

func (s *Service) ChangePassword(input PasswordInput) error {
	if input.CurrentPassword == "" {
		return fmt.Errorf("%w: 当前密码不能为空", ErrInvalidData)
	}
	if err := validatePassword(input.NewPassword); err != nil {
		return err
	}
	if input.CurrentPassword == input.NewPassword {
		return fmt.Errorf("%w: 新密码不能与当前密码一致", ErrInvalidData)
	}
	passwordHash, err := hashPassword(input.NewPassword)
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	current, err := s.authenticatedUserLocked(time.Now())
	if err != nil {
		return err
	}
	if !verifyPassword(input.CurrentPassword, current.PasswordHash) {
		return fmt.Errorf("%w: 当前密码不正确", ErrInvalidData)
	}
	next := cloneState(s.state)
	index := findUserIndex(next.Users, current.ID)
	if index < 0 {
		return ErrUnauthenticated
	}
	next.Users[index].PasswordHash = passwordHash
	next.Users[index].UpdatedAt = time.Now().UTC().Format(time.RFC3339Nano)
	return s.commit(next)
}

func (s *Service) authenticatedUserLocked(now time.Time) (*user, error) {
	if s.state.Session.UserID <= 0 || s.state.Session.ExpiresAt == "" {
		return nil, ErrUnauthenticated
	}
	expiresAt, err := time.Parse(time.RFC3339Nano, s.state.Session.ExpiresAt)
	if err != nil || !expiresAt.After(now) {
		return nil, ErrUnauthenticated
	}
	index := findUserIndex(s.state.Users, s.state.Session.UserID)
	if index < 0 || s.state.Users[index].Status != UserStatusEnabled {
		return nil, ErrUnauthenticated
	}
	return &s.state.Users[index], nil
}

func (s *Service) adminUserLocked(now time.Time) (*user, error) {
	current, err := s.authenticatedUserLocked(now)
	if err != nil {
		return nil, err
	}
	if current.Role != UserRoleAdmin {
		return nil, fmt.Errorf("%w: 仅管理员可以执行此操作", ErrForbidden)
	}
	return current, nil
}

func profileFromUser(value user) Profile {
	return Profile{
		ID:        value.ID,
		Account:   value.Account,
		Name:      value.Name,
		Email:     value.Email,
		Role:      value.Role,
		Status:    value.Status,
		Avatar:    value.Avatar,
		CreatedAt: value.CreatedAt,
	}
}

func findUserIndex(items []user, id int) int {
	for index := range items {
		if items[index].ID == id {
			return index
		}
	}
	return -1
}

func claimLegacyData(value *state, userID int) {
	for index := range value.Roles {
		if value.Roles[index].OwnerID == 0 {
			value.Roles[index].OwnerID = userID
		}
	}
	for index := range value.Plans {
		if value.Plans[index].OwnerID == 0 {
			value.Plans[index].OwnerID = userID
		}
	}
	for _, legacyReceipt := range value.LegacyMessageReceipts {
		if legacyReceipt.MessageID <= 0 || legacyReceipt.ReadAt == "" {
			continue
		}
		setReceipt(value, messageReceipt{
			UserID:     userID,
			MessageID:  legacyReceipt.MessageID,
			NotifiedAt: legacyReceipt.ReadAt,
			ReadAt:     legacyReceipt.ReadAt,
		})
	}
	value.LegacyProfile = nil
	value.LegacyMessageReceipts = nil
}

func validatePassword(value string) error {
	if len([]rune(value)) < 8 {
		return fmt.Errorf("%w: 密码至少 8 位", ErrInvalidData)
	}
	if len([]rune(value)) > 256 {
		return fmt.Errorf("%w: 密码不能超过 256 位", ErrInvalidData)
	}
	return nil
}

func validateAvatar(value string) error {
	if value == "" {
		return nil
	}
	if strings.HasPrefix(value, "data:image/") {
		return nil
	}
	parsed, err := url.ParseRequestURI(value)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return fmt.Errorf("%w: 头像必须是图片数据或 HTTP(S) 地址", ErrInvalidData)
	}
	return nil
}

func hashPassword(password string) (string, error) {
	saltBytes := make([]byte, 16)
	if _, err := rand.Read(saltBytes); err != nil {
		return "", fmt.Errorf("generate password salt: %w", err)
	}
	salt := hex.EncodeToString(saltBytes)
	hash, err := derivePassword(password, salt)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s:%s:%s", passwordHashPrefix, salt, hex.EncodeToString(hash)), nil
}

func verifyPassword(password string, stored string) bool {
	parts := strings.Split(stored, ":")
	if len(parts) != 3 || parts[0] != passwordHashPrefix || parts[1] == "" || parts[2] == "" {
		return subtle.ConstantTimeCompare([]byte(password), []byte(stored)) == 1
	}
	storedHash, err := hex.DecodeString(parts[2])
	if err != nil || len(storedHash) != passwordKeyLength {
		return false
	}
	incomingHash, err := derivePassword(password, parts[1])
	if err != nil || len(incomingHash) != len(storedHash) {
		return false
	}
	return subtle.ConstantTimeCompare(incomingHash, storedHash) == 1
}

func derivePassword(password string, salt string) ([]byte, error) {
	hash, err := scrypt.Key([]byte(password), []byte(salt), 1<<14, 8, 1, passwordKeyLength)
	if err != nil {
		return nil, fmt.Errorf("derive password hash: %w", err)
	}
	return hash, nil
}
