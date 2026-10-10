# 日志与诊断模块

## 模块目标

记录应用运行日志并向前端提供基础运行环境信息，方便定位用户环境问题。

## 目录与职责

- `internal/diagnostics/service.go`：日志文件、轮转、标准日志输出和诊断信息，版本来自构建期 `buildinfo.Version`；开发构建由当前 Git 标签生成 `x.y.z-dev`。
- `internal/application/diagnostics.go`：Wails 基础诊断查询与打开日志目录接口。
- `internal/application/runtime_status.go`：汇总生命周期、数据库服务、通知、更新和日志状态，并过滤底层敏感错误。
- `frontend/src/shared/diagnostics/`：类型化诊断 API。
- 设置“概览”中的 `RuntimeStatusPanel`：展示运行环境、健康矩阵、诊断摘要和日志入口，并在“能力状态”中展示外观、窗口和通知的配置摘要。
- 设置“概览”中的 `DesktopOverview`：展示版本、更新通道与功能启用地图，外观/窗口/通知策略统一由 RuntimeStatusPanel 展示。

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

运行状态额外返回 `RuntimeStatus`：整体健康状态、检查时间、生命周期、运行环境、日志路径以及七项服务状态。账号、快速笔记、任务和 DN 服务实现只读 `Health()`，检查数据库连接和必要表；通知、更新与诊断通过已有能力接口汇总。

能力项按异常、受限优先排序，其他项以外观为首；排序只影响前端展示，保留后端检查顺序和诊断摘要。有配置目标的右侧状态标签复用共享 Button 与原有 Badge 组合，保留健康状态颜色和配置标记；无配置目标保持只读。配置入口由 SettingsPanel 的回调切换偏好页签，账号和龙之谷使用现有 React Router 路由，隐藏龙之谷时先进入菜单配置。

“能力状态”隐藏应用更新检查卡片，实际展示六项服务检查与三项配置；底层运行状态、整体健康和诊断摘要仍保留七项检查，更新操作继续位于概览底部。

配置摘要直接读取 SettingsProvider，使用“配置”标记，与后端服务的健康检查区分；不改变七项检查、整体健康判定或诊断摘要的数据契约。

## 日志规则

- 日志目录位于系统用户缓存目录下的 `cull-pear/logs/`。
- 当前日志文件为 `app.log`，权限为 `0600`。
- 文件达到 5 MiB 后轮转为 `app.log.1`。
- 初始化后标准库 `log` 同时输出到原输出和日志文件。
- 退出时恢复原日志 Writer 并关闭文件。

## 生命周期

诊断服务在 App Service 的 `ServiceStartup` 初始化，在 `ServiceShutdown` 清理。bindings 生成阶段不会创建日志文件。

## 边界

- 日志不得记录 Token、密码、完整消息正文等敏感信息。
- 运行状态不得返回数据库连接串或原始数据库错误；前端只接收“正常、受限、未启用、异常”和安全说明。
- 当前仅保留一个备份文件，不承担审计日志职责。
- `OpenDiagnosticsDirectory` 只打开模块自己创建的日志目录，不接受前端任意路径。

## 验证

```bash
go test ./internal/diagnostics ./internal/application
cd frontend && pnpm build
```

实际打开日志目录需要人工桌面验证。
