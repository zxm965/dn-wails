# 日志与诊断模块

## 模块目标

记录应用运行日志并向前端提供基础运行环境信息，方便定位用户环境问题。

## 目录与职责

- `internal/diagnostics/service.go`：日志文件、轮转、标准日志输出和诊断信息，版本来自构建期 `buildinfo.Version`。
- `internal/application/diagnostics.go`：Wails 查询与打开日志目录接口。
- `frontend/src/shared/diagnostics/`：类型化诊断 API。
- 测试工具中的 `DesktopOverview`：展示只读运行信息。
- `TestToolsPanel`：提供打开日志目录的验证入口。

## 诊断数据

```ts
interface DiagnosticsInfo {
  appName: string
  appVersion: string
  goVersion: string
  os: string
  arch: string
  startedAt: string
  logDirectory: string
  logFile: string
}
```

## 日志规则

- 日志目录位于系统用户缓存目录下的 `dn-wails/logs/`。
- 当前日志文件为 `app.log`，权限为 `0600`。
- 文件达到 5 MiB 后轮转为 `app.log.1`。
- 初始化后标准库 `log` 同时输出到原输出和日志文件。
- 退出时恢复原日志 Writer 并关闭文件。

## 生命周期

诊断服务在 `OnStartup` 初始化，在 `OnShutdown` 清理。绑定生成阶段不会创建日志文件。

## 边界

- 日志不得记录 Token、密码、完整消息正文等敏感信息。
- 当前仅保留一个备份文件，不承担审计日志职责。
- `OpenDiagnosticsDirectory` 只打开模块自己创建的日志目录，不接受前端任意路径。

## 验证

```bash
go test ./internal/diagnostics ./internal/application
cd frontend && pnpm build
```

实际打开日志目录需要人工桌面验证。
