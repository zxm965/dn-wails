package singleinstance

import (
	"path/filepath"
	"strings"
)

const (
	maxArguments      = 32
	maxArgumentLength = 4096
)

type LaunchData struct {
	Arguments        []string `json:"arguments"`
	WorkingDirectory string   `json:"workingDirectory"`
}

// Service validates and normalizes untrusted data received from a second process.
type Service struct{}

func NewService() *Service {
	return &Service{}
}

func (s *Service) Normalize(arguments []string, workingDirectory string) LaunchData {
	normalizedArguments := make([]string, 0, min(len(arguments), maxArguments))
	for _, argument := range arguments {
		if len(normalizedArguments) == maxArguments {
			break
		}

		argument = strings.TrimSpace(argument)
		if argument == "" {
			continue
		}
		if len(argument) > maxArgumentLength {
			argument = argument[:maxArgumentLength]
		}
		normalizedArguments = append(normalizedArguments, argument)
	}

	normalizedDirectory := strings.TrimSpace(workingDirectory)
	if normalizedDirectory != "" {
		normalizedDirectory = filepath.Clean(normalizedDirectory)
	}

	return LaunchData{
		Arguments:        normalizedArguments,
		WorkingDirectory: normalizedDirectory,
	}
}
