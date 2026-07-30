# 应用生命周期模块

## 模块目标

统一管理应用启动、DOM 就绪、关闭前处理和退出清理，并向前端提供可查询的运行状态。

## 目录与职责

- `internal/lifecycle/service.go`：保存启动时间、就绪状态和第二实例启动次数。
- `internal/application/app.go`：承接 Wails 的 `OnStartup`、`OnDomReady`、`OnBeforeClose`、`OnShutdown`。
- `frontend/src/shared/app-lifecycle/`：查询生命周期状态并订阅第二实例事件。
- `DesktopOverview` 展示正式运行状态，`TestToolsPanel` 展示第二实例验证结果。

## 核心链路

```text
Wails OnStartup
  → 保存 runtime context
  → 初始化诊断与设置
  → lifecycle.Start

Wails OnDomReady
  → 恢复窗口
  → 初始化通知
  → lifecycle.MarkReady

Wails OnShutdown
  → 清理通知
  → lifecycle.Stop
  → 关闭诊断日志
```

## 数据契约

```ts
interface LifecycleStatus {
  startedAt: string
  ready: boolean
  secondInstanceCount: number
}
```

前端通过 `GetLifecycleStatus` 查询，并通过 `useAppLifecycle` 消费。

## 边界处理

- 只有保存了 Wails context 后才能调用 runtime。
- DOM 未就绪时收到的第二实例数据会暂存，待 `OnDomReady` 后发送。
- 生命周期状态使用互斥锁保护，允许 Wails 回调和绑定方法并发访问。

## 接入方式

新增长期资源时，在合适的生命周期完成初始化和清理，不要在 `main.go` 中产生运行期副作用。

## 验证

```bash
go test ./internal/lifecycle ./internal/application
cd frontend && pnpm build
```
