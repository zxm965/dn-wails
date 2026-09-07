//go:build !darwin && !windows

package appupdate

import (
	"context"
	"errors"

	coreupdate "cull-pear/internal/appupdate"
)

func (i *Installer) Supported() bool {
	return false
}

func (i *Installer) Install(context.Context, string, coreupdate.InstallTarget) error {
	return errors.New("application updates are not supported on this platform")
}
