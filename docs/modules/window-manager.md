# 窗口管理模块

## 模块目标

统一管理主窗口激活、位置尺寸恢复、置顶和关闭策略。当前项目保持单原生窗口，不实现 Wails v2 原生多窗口。

## 目录与职责

- `internal/windowmanager/service.go`：窗口状态规则和平台接口。
- `internal/platform/window/runtime.go`：Wails runtime 适配。
- `internal/platform/window/configure_*.go`：不同操作系统的窗口启动配置。
- `internal/application/app.go`：生命周期恢复、关闭前保存和强制退出协调。
- `frontend/src/shared/window/`：前端窗口操作封装。

## 核心链路

```text
OnDomReady
  → Settings.Window
  → windowmanager.Restore
  → 恢复位置、尺寸、最大化和置顶

关闭按钮
  → RequestWindowClose
  → 保存窗口边界
  → closeBehavior=hide：隐藏窗口
  → closeBehavior=quit：退出应用
```

## 设置契约

```ts
interface WindowSettings {
  closeBehavior: 'quit' | 'hide'
  alwaysOnTop: boolean
  rememberBounds: boolean
  bounds?: WindowBounds
}
```

窗口最小尺寸为 `720 × 520`。无效或过小的持久化尺寸不会被恢复。

## 接入方式

- React 组件通过 `windowManager` 调用常用窗口动作。
- 自定义标题栏关闭按钮调用 `RequestWindowClose`，不得直接调用 runtime `Quit` 绕过关闭策略。
- 需要无条件退出时调用 `QuitApplication`。
- 应用内“子窗口”使用 Overlay Manager。

## 边界

- 隐藏到后台后可通过再次启动应用唤醒。
- 窗口位置是否完全恢复受操作系统和多屏布局变化影响。
- 原生多窗口不属于本模块当前范围。

## 验证

```bash
go test ./internal/windowmanager ./internal/platform/window
cd frontend && pnpm build
```

位置恢复、关闭隐藏和置顶需要人工桌面验证。
