package appupdate

import "strings"

type Installer struct {
	appName    string
	bundleName string
}

func NewInstaller(appName string, bundleName string) *Installer {
	return &Installer{
		appName:    strings.TrimSpace(appName),
		bundleName: normaliseBundleName(bundleName),
	}
}

func normaliseBundleName(value string) string {
	value = strings.TrimSpace(value)
	if value == "" || value == "." || value == ".." || strings.ContainsAny(value, `/\\:`) {
		return ""
	}
	return value
}
