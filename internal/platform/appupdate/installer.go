package appupdate

import "strings"

type Installer struct {
	appName string
}

func NewInstaller(appName string) *Installer {
	return &Installer{appName: strings.TrimSpace(appName)}
}
