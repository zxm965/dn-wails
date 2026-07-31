# 应用生命周期模块

## 模块目标

统一管理应用启动、DOM 就绪、关闭前处理和退出清理，并向前端提供可查询的运行状态。

## 目录与职责

- `internal/lifecycle/service.go`：保存启动时间、就绪状态和第二实例启动次数。
- `internal/application/app.go`：承接 Wails 的 `OnStartup`、`OnDomReady`、`OnBeforeClose`、`OnShutdown`。
- `frontend/src/shared/app-lifecycle/`：查询生命周期状态并订阅第二实例事件。
- 测试工具中的 `DesktopOverview` 展示运行状态，`TestToolsPanel` 处理第二实例验证结果。

## 核心链路

```text
Wails OnStartup
  → 保存 runtime context
  → 初始化诊断与设置
  → lifecycle.Start

Wails OnDomReady
  → 恢复窗口
  → lifecycle.MarkReady
  → 回放第二实例事件
  → 初始化通知

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

前端通过 `GetLifecycleStatus` 查询，并通过 `useAppLifecycle` 消费。首次查询可能早于 `OnDomReady`，Hook 会在未就绪时短间隔重试，临时读取失败时降频重试，直到获得就绪状态。

## 边界处理

- 只有保存了 Wails context 后才能调用 runtime。
- DOM 未就绪时收到的第二实例数据会暂存，待 `OnDomReady` 后发送。
- 生命周期在窗口恢复后立即标记为就绪；系统通知属于可选原生能力，其初始化失败或阻塞不得影响应用就绪状态和第二实例事件回放。
- 生命周期状态使用互斥锁保护，允许 Wails 回调和绑定方法并发访问。
- 概览页区分读取中、初始化中、读取失败和运行正常，避免首次读取到 `ready=false` 后长期停留在加载文案。

## 接入方式

新增长期资源时，在合适的生命周期完成初始化和清理，不要在 `main.go` 中产生运行期副作用。

## 验证

```bash
go test ./internal/lifecycle ./internal/application
cd frontend && pnpm build
```
