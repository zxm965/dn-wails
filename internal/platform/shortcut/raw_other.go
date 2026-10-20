//go:build !windows

package shortcut

import (
	"context"
	"fmt"
)

func startRawKeyboard(context.Context, string, func(), func(error)) (func() error, error) {
	return nil, fmt.Errorf("Raw Input 仅支持 Windows")
}
