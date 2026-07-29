package greeting

import (
	"errors"
	"fmt"
	"strings"
)

var ErrNameRequired = errors.New("name is required")

type Service struct{}

func NewService() *Service {
	return &Service{}
}

func (s *Service) Greet(name string) (string, error) {
	normalizedName := strings.TrimSpace(name)
	if normalizedName == "" {
		return "", ErrNameRequired
	}

	return fmt.Sprintf("Hello %s, It's show time!", normalizedName), nil
}
