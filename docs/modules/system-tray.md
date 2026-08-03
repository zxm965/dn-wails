# 系统托盘模块

## 模块目标

使用 Wails v3 原生 `SystemTray` 保持应用在窗口隐藏后可恢复，并提供明确的退出入口。

## 目录与职责

- `main.go`：创建托盘、设置图标和提示文字、注册点击行为与菜单，并在应用关闭时销毁托盘。
- `build/appicon.png`：托盘图标源文件，同时也是平台应用图标的生成源。
- `internal/application/app.go`：提供 `QuitApplication`，统一设置强制退出状态并交给窗口服务退出。
- `internal/windowmanager/service.go`：处理窗口显示、取消最小化、聚焦、隐藏和退出规则。
- `internal/settings/model.go`：保存 `closeBehavior`，决定关闭按钮是隐藏还是退出。

## 依赖关系

```text
main.setupSystemTray
  → Wails v3 App.SystemTray
  → WebviewWindow Show / UnMinimise / Focus
  → application.App.QuitApplication
  → windowmanager.Service
```

## 核心链路

```text
应用启动
  → 创建 SystemTray
  → SetIcon(build/appicon.png)
  → SetTooltip(应用展示名称)
  → 注册托盘点击和菜单

关闭按钮 + closeBehavior=hide
  → WindowClosing hook 取消默认关闭
  → 保存窗口边界
  → 隐藏主窗口

点击托盘 / “显示主窗口”
  → Show
  → UnMinimise
  → Focus

“退出”
  → QuitApplication
  → 标记强制退出
  → App.Quit
  → OnShutdown Destroy SystemTray
```

## 菜单契约

- 点击托盘图标：显示并聚焦主窗口。
- `显示主窗口`：与托盘点击行为一致。
- `退出`：无条件退出应用，不受关闭行为设置影响。

## 错误与边界

- macOS 设置 `ApplicationShouldTerminateAfterLastWindowClosed=false`；Windows 和 Linux 禁用最后窗口关闭即退出，确保隐藏后托盘仍存活。
- 托盘只负责应用级恢复和退出，不向前端暴露 binding。
- 托盘外观、点击方式和菜单位置由操作系统决定，应用内预览不能替代原生验证。
- 当前使用通用 PNG；若后续平台要求模板图或单色图，应在 v3 原生接口范围内按 build tag 提供平台资源，不回退到 v2 或第三方托盘兼容层。

## 接入与验证

新增托盘菜单动作应调用现有 application 或 feature service，不在回调中实现业务规则。

```bash
go test ./...
wails3 task darwin:build
```

托盘显示、菜单点击、关闭隐藏、恢复焦点和退出必须在 macOS、Windows、Linux 目标环境中人工验证；本次自动验证不会启动桌面应用。
