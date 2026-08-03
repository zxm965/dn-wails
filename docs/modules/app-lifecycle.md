# 应用生命周期模块

## 模块目标

基于 Wails v3 Service 和窗口事件统一管理服务启动、WebView runtime 就绪、关闭协调与退出清理，并向前端提供可查询状态。

## 目录与职责

- `internal/lifecycle/service.go`：保存启动时间、就绪状态和第二实例启动次数。
- `internal/application/app.go`：实现 `ServiceStartup`、`RuntimeReady`、`ServiceShutdown`、窗口关闭和第二实例协调。
- `main.go`：注册 App Service，并把 `WindowRuntimeReady`、`WindowClosing`、`WindowFilesDropped` 接到应用门面。
- `frontend/src/shared/app-lifecycle/`：查询状态并订阅 `app:second-instance` typed event。

## 核心链路

```text
App ServiceStartup
  → 保存 Service context
  → 初始化诊断、设置与 DN 服务
  → lifecycle.Start

WindowRuntimeReady
  → 恢复窗口
  → lifecycle.MarkReady
  → 回放第二实例事件
  → 注册通知响应处理

App ServiceShutdown
  → lifecycle.Stop
  → 关闭 DN 与诊断资源

application.Options.OnShutdown
  → 销毁 SystemTray
```

## 数据契约

```ts
interface LifecycleStatus {
  startedAt: string
  ready: boolean
  secondInstanceCount: number
}
```

前端通过生成的 App Service binding 查询，并通过 `useAppLifecycle` 消费。首次查询可能早于窗口 runtime 就绪，Hook 会重试直到获得就绪状态。

## 错误与边界

- 依赖 WebView 的窗口恢复和前端事件只在 `WindowRuntimeReady` 后执行。
- runtime 就绪前收到的第二实例数据会暂存并在就绪后按顺序发送。
- 生命周期先标记为就绪，再注册可选通知响应；通知能力失败不得阻断窗口可用状态。
- 并发状态使用互斥锁保护。

## 接入与验证

长期资源应实现 Service 生命周期或挂到明确的 Wails v3 窗口事件，不在 `main.go` 堆积业务规则。

```bash
go test ./internal/lifecycle ./internal/application
cd frontend && pnpm build
```

窗口事件的真实触发顺序仍需在获准启动桌面应用后人工验证。
