package application

import (
	"errors"
	"sync"
	"time"

	"cull-pear/internal/account"
	"cull-pear/internal/dn"
	"cull-pear/internal/quicknotes"
)

const (
	RuntimeOverallHealthy  = "healthy"
	RuntimeOverallDegraded = "degraded"

	RuntimeServiceReady       = "ready"
	RuntimeServiceWarning     = "warning"
	RuntimeServiceUnavailable = "unavailable"
	RuntimeServiceError       = "error"
)

type RuntimeServiceStatus struct {
	Key    string `json:"key"`
	Label  string `json:"label"`
	Status string `json:"status"`
	Detail string `json:"detail"`
}

type RuntimeStatus struct {
	Overall             string                 `json:"overall"`
	CheckedAt           string                 `json:"checkedAt"`
	StartedAt           string                 `json:"startedAt"`
	UptimeSeconds       int64                  `json:"uptimeSeconds"`
	Ready               bool                   `json:"ready"`
	SecondInstanceCount int                    `json:"secondInstanceCount"`
	AppVersion          string                 `json:"appVersion"`
	GoVersion           string                 `json:"goVersion"`
	OS                  string                 `json:"os"`
	Arch                string                 `json:"arch"`
	LogDirectory        string                 `json:"logDirectory"`
	LogFile             string                 `json:"logFile"`
	Services            []RuntimeServiceStatus `json:"services"`
}

type runtimeHealthCheck struct {
	key         string
	label       string
	readyDetail string
	required    bool
	run         func() error
}

func (a *App) GetRuntimeStatus() RuntimeStatus {
	now := time.Now()
	lifecycleStatus := a.lifecycleService.Status()
	diagnosticsInfo := a.diagnosticsService.Info()
	checks := []runtimeHealthCheck{
		{
			key:         "account",
			label:       "账号服务",
			readyDetail: "数据库连接与账号表正常",
			required:    true,
			run:         a.accountService.Health,
		},
		{
			key:         "quick-notes",
			label:       "快速笔记",
			readyDetail: "云端笔记连接与数据表正常",
			required:    true,
			run:         a.quickNotesService.Health,
		},
		{
			key:         "dn-system",
			label:       "DN 周常",
			readyDetail: "角色、周计划与消息表正常",
			required:    true,
			run:         a.dnService.Health,
		},
	}

	services := make([]RuntimeServiceStatus, len(checks))
	var waitGroup sync.WaitGroup
	for index, check := range checks {
		waitGroup.Add(1)
		go func() {
			defer waitGroup.Done()
			services[index] = runtimeHealthStatus(check, check.run())
		}()
	}
	waitGroup.Wait()

	services = append(services, a.notificationRuntimeStatus(), a.updateRuntimeStatus())
	services = append(services, RuntimeServiceStatus{
		Key:    "diagnostics",
		Label:  "日志诊断",
		Status: RuntimeServiceReady,
		Detail: "日志文件与诊断目录可用",
	})

	overall := RuntimeOverallHealthy
	if !lifecycleStatus.Ready {
		overall = RuntimeOverallDegraded
	}
	for index, service := range services[:len(checks)] {
		if checks[index].required && service.Status != RuntimeServiceReady {
			overall = RuntimeOverallDegraded
		}
	}
	for _, service := range services[len(checks):] {
		if service.Status == RuntimeServiceError {
			overall = RuntimeOverallDegraded
		}
	}

	uptime := int64(0)
	startedAt := ""
	if !lifecycleStatus.StartedAt.IsZero() {
		startedAt = lifecycleStatus.StartedAt.UTC().Format(time.RFC3339)
		uptime = max(0, int64(now.Sub(lifecycleStatus.StartedAt).Seconds()))
	}

	return RuntimeStatus{
		Overall:             overall,
		CheckedAt:           now.UTC().Format(time.RFC3339),
		StartedAt:           startedAt,
		UptimeSeconds:       uptime,
		Ready:               lifecycleStatus.Ready,
		SecondInstanceCount: lifecycleStatus.SecondInstanceCount,
		AppVersion:          diagnosticsInfo.AppVersion,
		GoVersion:           diagnosticsInfo.GoVersion,
		OS:                  diagnosticsInfo.OS,
		Arch:                diagnosticsInfo.Arch,
		LogDirectory:        diagnosticsInfo.LogDirectory,
		LogFile:             diagnosticsInfo.LogFile,
		Services:            services,
	}
}

func runtimeHealthStatus(check runtimeHealthCheck, err error) RuntimeServiceStatus {
	status := RuntimeServiceStatus{Key: check.key, Label: check.label}
	if err == nil {
		status.Status = RuntimeServiceReady
		status.Detail = check.readyDetail
		return status
	}
	if errors.Is(err, account.ErrUnavailable) || errors.Is(err, dn.ErrUnavailable) || errors.Is(err, quicknotes.ErrUnavailable) {
		status.Status = RuntimeServiceUnavailable
		status.Detail = "当前构建未配置服务，或必要数据表尚未就绪"
		return status
	}
	status.Status = RuntimeServiceError
	status.Detail = "连接检查失败，请查看本地日志"
	return status
}

func (a *App) notificationRuntimeStatus() RuntimeServiceStatus {
	status := RuntimeServiceStatus{Key: "notifications", Label: "系统通知"}
	value, err := a.systemNotificationService.Status()
	if err != nil {
		status.Status = RuntimeServiceError
		status.Detail = "通知能力检查失败"
		return status
	}
	if !value.Available {
		status.Status = RuntimeServiceUnavailable
		status.Detail = "当前系统不支持原生通知"
		return status
	}
	if !value.Authorized {
		status.Status = RuntimeServiceWarning
		status.Detail = "等待用户授予系统通知权限"
		return status
	}
	status.Status = RuntimeServiceReady
	status.Detail = "系统通知可用且已授权"
	return status
}

func (a *App) updateRuntimeStatus() RuntimeServiceStatus {
	status := RuntimeServiceStatus{Key: "updates", Label: "应用更新"}
	info := a.applicationUpdateService.Info()
	if !info.Configured {
		status.Status = RuntimeServiceUnavailable
		status.Detail = "当前构建未配置正式更新通道"
		return status
	}
	if !info.CanInstall {
		status.Status = RuntimeServiceWarning
		status.Detail = "可以检查更新，但当前平台不能自动安装"
		return status
	}
	status.Status = RuntimeServiceReady
	status.Detail = "正式更新通道与安装能力可用"
	return status
}
