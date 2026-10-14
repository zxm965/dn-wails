# 窗口管理模块

## 模块目标

统一管理 Wails v3 主窗口激活、位置尺寸恢复、置顶和关闭策略。主窗口之外提供一个原生进程置顶小窗（Windows DN / macOS Firefox 测试）；普通应用内弹层继续使用 Overlay Manager。

## 目录与职责

- `internal/windowmanager/service.go`：窗口状态规则和平台接口。
- `internal/platform/window/runtime.go`：Wails v3 App 与 WebviewWindow 适配。
- `internal/platform/window/process.go`：独立进程小窗的创建、复用、置顶及关闭隐藏。
- `internal/platform/window/configure_*.go`：不同操作系统的窗口启动配置。
- `internal/application/app.go`：生命周期恢复、关闭前保存和强制退出协调。
- `frontend/src/shared/window/`：前端窗口操作封装。

## 核心链路

```text
WindowRuntimeReady
  → Settings.Window
  → windowmanager.Restore
  → 恢复位置、尺寸、最大化和置顶

关闭按钮
  → RequestWindowClose
  → 保存窗口边界
  → closeBehavior=hide：隐藏窗口
  → closeBehavior=quit：退出应用

系统托盘“显示主窗口” / 托盘点击
  → Show
  → UnMinimise
  → Focus
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

窗口默认尺寸为 `1280 × 800`，最小尺寸固定为 `1024 × 768`。窗口边界规则由本模块负责：恢复时忽略过小尺寸，采集时钳制到最小尺寸；设置模块只负责持久化，不让边界值阻断其他偏好保存。

## 接入方式

- React 组件通过 `windowManager` 调用常用窗口动作。
- 自定义标题栏关闭按钮调用 `RequestWindowClose`，不得直接调用 runtime `Quit` 绕过关闭策略。
- 需要无条件退出时调用 `QuitApplication`。
- 普通应用内弹层使用 Overlay Manager；进程小窗通过 `OpenDragonNestProcessWindow` 打开，采用系统标题栏且独立于主窗口关闭策略。

## 边界

- 隐藏到后台后可通过系统托盘或再次启动应用唤醒。
- 窗口位置是否完全恢复受操作系统和多屏布局变化影响。
- 进程小窗始终置顶，默认 `360 × 260`、最小 `280 × 220`，关闭隐藏、再次打开复用；不参与主窗口边界捕获与设置恢复，退出应用时一起释放。
- 小窗只挂载设置和进程操作，不启动全局账号、提醒或消息监听；具体链路见[窗口内快捷键](shortcut.md)。
- 置顶不保证焦点或覆盖独占全屏游戏；macOS、Windows、Linux 的实际窗口行为需分别验证。

## 验证

```bash
go test ./internal/windowmanager ./internal/platform/window
cd frontend && pnpm build
```

位置恢复、关闭隐藏和置顶需要人工桌面验证。
