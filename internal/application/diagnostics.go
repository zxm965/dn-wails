package application

import "time"

type DiagnosticsInfo struct {
	AppName      string `json:"appName"`
	AppVersion   string `json:"appVersion"`
	GoVersion    string `json:"goVersion"`
	OS           string `json:"os"`
	Arch         string `json:"arch"`
	StartedAt    string `json:"startedAt"`
	LogDirectory string `json:"logDirectory"`
	LogFile      string `json:"logFile"`
}

type LifecycleStatus struct {
	StartedAt           string `json:"startedAt"`
	Ready               bool   `json:"ready"`
	SecondInstanceCount int    `json:"secondInstanceCount"`
}

func (a *App) GetDiagnosticsInfo() DiagnosticsInfo {
	info := a.diagnosticsService.Info()
	return DiagnosticsInfo{
		AppName:      info.AppName,
		AppVersion:   info.AppVersion,
		GoVersion:    info.GoVersion,
		OS:           info.OS,
		Arch:         info.Arch,
		StartedAt:    info.StartedAt.Format(time.RFC3339),
		LogDirectory: info.LogDirectory,
		LogFile:      info.LogFile,
	}
}

func (a *App) OpenDiagnosticsDirectory() error {
	return a.nativeService.OpenPath(a.diagnosticsService.Info().LogDirectory)
}

func (a *App) GetLifecycleStatus() LifecycleStatus {
	status := a.lifecycleService.Status()
	return LifecycleStatus{
		StartedAt:           status.StartedAt.Format(time.RFC3339),
		Ready:               status.Ready,
		SecondInstanceCount: status.SecondInstanceCount,
	}
}
