//go:build !darwin && !windows

package appupdate

import (
	"context"
	"errors"
)

func (i *Installer) Supported() bool {
	return false
}

func (i *Installer) Install(context.Context, string) error {
	return errors.New("application updates are not supported on this platform")
}
