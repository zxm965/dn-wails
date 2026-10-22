# 日志与诊断模块

## 模块目标

记录应用运行日志并向前端提供基础运行环境信息，方便定位用户环境问题。

## 目录与职责

- `internal/diagnostics/service.go`：日志文件、轮转、标准日志输出和诊断信息，版本来自构建期 `buildinfo.Version`；开发构建由当前 Git 标签生成 `x.y.z-dev`。
- `internal/application/diagnostics.go`：Wails 基础诊断查询与打开日志目录接口。
- `internal/application/runtime_status.go`：汇总生命周期、数据库服务、通知、更新和日志状态，并过滤底层敏感错误。
- `frontend/src/shared/diagnostics/`：类型化诊断 API。
- 设置“概览”中的 `RuntimeStatusPanel`：持有运行快照并处理刷新、复制摘要、打开日志；向 DesktopOverview 传递信息，在“服务状态”中仅展示服务检查。
- 设置“概览”中的 `DesktopOverview`：整合应用标识、版本/平台/Go 版本、运行状态与时长、启动时间、第二实例计数、日志文件及检查时间，提供刷新、复制和日志入口。

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

概览不再展示独立发布通道、整体健康以及生命周期/运行环境/本地诊断三张摘要卡；运行信息合并到顶部应用概览，共用一次 GetRuntimeStatus 查询，未新增轮询。首次加载失败仍可打开日志，刷新失败保留旧快照并标注；服务明细位于下方服务状态，更新操作位于底部“应用更新”。

运行状态额外返回 `RuntimeStatus`：整体健康状态、检查时间、生命周期、运行环境、日志路径以及七项服务状态。账号、快速笔记、任务和 DN 服务实现只读 `Health()`，检查数据库连接和必要表；通知、更新与诊断通过已有能力接口汇总。

能力项按固定业务顺序排列，异常和受限通过颜色、状态文案提示，不因加载完成或刷新结果改变位置；保留后端检查顺序和诊断摘要。有配置目标的右侧状态标签复用共享 Button 与原有 Badge 组合，保留健康状态颜色和配置标记；无配置目标保持只读。配置入口由 SettingsPanel 的回调切换偏好页签，账号和龙之谷使用现有 React Router 路由，隐藏龙之谷时先进入菜单配置。

“服务状态”隐藏应用更新检查卡片，实际展示六项服务检查；外观、窗口、通知三项重复配置摘要已移除；底层运行状态、整体健康和诊断摘要仍保留七项检查，更新操作继续位于概览底部。

顶部应用卡仅保留常用运行信息；启动时间、第二实例、Go 版本、日志文件、检查时间和构建类型，以及复制摘要、打开日志入口放入默认折叠的“诊断详情”；不改变七项检查、整体健康判定或诊断摘要的数据契约。

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

## 概览加载占位

首次进入按完整布局显示字段值 Skeleton 与六项服务占位，Skeleton 沿用共享组件的 reduced motion 支持；请求完成后原位替换实际数据。`settings/hooks/useRuntimeStatus.ts` 以 `useSyncExternalStore` 订阅会话快照，页面卸载后保留最后成功结果，重复进入在成功结果 60 秒有效期内直接复用，过期才在旧快照上后台刷新；手动刷新绕过有效期，失败后下次进入立即重试，重叠请求合并。快照、错误与加载标志原子更新；失败保留旧值并明确提示，未取得快照时不会展示正常状态。缓存仅保留当前 WebView 生命周期，不改变后端七项检查或数据契约。
