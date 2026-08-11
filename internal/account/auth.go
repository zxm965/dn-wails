package account

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"net/mail"
	"net/url"
	"strings"

	"golang.org/x/crypto/scrypt"
)

const (
	passwordHashPrefix = "scrypt"
	passwordKeyLength  = 64
)

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
	if value == "" || strings.HasPrefix(value, "data:image/") {
		return nil
	}
	parsed, err := url.ParseRequestURI(value)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return fmt.Errorf("%w: 头像必须是图片数据或 HTTP(S) 地址", ErrInvalidData)
	}
	return nil
}

func validEmail(value string) bool {
	address, err := mail.ParseAddress(value)
	return err == nil && strings.EqualFold(address.Address, value)
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
