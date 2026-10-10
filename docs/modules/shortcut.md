# 全局快捷键

## 模块目标

为龙之谷进程工具提供不依赖应用窗口焦点的全局快捷键；Windows 保留系统热键注册，并在热键消息没有送达时通过后台按键状态检测补充触发。

## 目录与职责

- `internal/platform/shortcut/shortcut.go`：Wails 热键适配、后台监测生命周期、组合键范围校验、去重与并发执行控制。
- `internal/platform/shortcut/windows.go`：通过 `GetAsyncKeyState` 读取当前配置的功能键与修饰键状态，仅使用高位的当前按下状态。
- `internal/platform/shortcut/other.go`：macOS、Linux 沿用 Wails 原有全局热键，不启动 Windows 兜底检测。
- `internal/platform/shortcut/shortcut_test.go`：使用原生注册和按键读取 stub 验证消息缺失、两条链路去重、按住不重复、配置切换与注销。
- `internal/application/app.go`：在 `RuntimeReady` 时注册、配置变化时替换、`ServiceShutdown` 时注销；回调调用既有进程终止用例。

## 依赖与核心链路

```text
DnProcessKiller → settings API / Hook → Wails UpdateSettings
  → application.App.syncDragonNestShortcut
  → platform/shortcut.New(Wails GlobalShortcut)
      → RegisterHotKey / WM_HOTKEY
      → Windows GetAsyncKeyState（每 20ms，仅开启时运行）
  → application.App.KillDragonNestProcess
  → dnprocess.Service.TerminateConfigured
  → platform/dnprocess 的路径检查与进程终止
```

两条输入链路共享一次触发状态。功能键从抬起变为按下且 Ctrl 按下、Shift/Alt/Win 未按下时，后台检测才触发。持续按住不重复执行，注册时已经按下的功能键须先释放；再次按键与前次触发至少间隔 150ms，以过滤释放后迟到的原生消息。进程终止未完成时不并发执行下一次操作。

## 数据契约

- 适配器实现已有 `Register(string, func()) error` 与 `Unregister(string) error`，不新增 Wails 方法、DTO 或事件。
- 只接受设置已允许的 `Ctrl+F1` 至 `Ctrl+F11`；快捷键键位、开关和目标路径继续使用 `AppSettings.dragonNest`。
- 后台检测仅查询当前组合涉及的键，不采集或保存其他按键内容。

## 错误与边界

- 原生注册失败（例如键位被其他软件占用）继续返回错误，不通过兜底绕过占用；设置更新沿用既有回滚和日志处理。
- 注销失败保留检测，保持原生注册和偏好回滚一致；注销成功停止定时器并忽略已排队的旧回调，已经执行中的终止操作正常完成。
- 此能力不要求窗口激活、页面打开或 WebView 处理键盘事件；程序必须仍在运行，真正退出后不响应。
- 按键状态检测受 Windows 桌面与 UIPI 权限限制，安全桌面、权限不足或游戏保护机制可能使查询不可用；20ms 采样也可能遗漏极短的按键，此时仍由原生热键处理。
- 未授予额外进程权限、不自动提权，不承诺关闭受保护进程；游戏以管理员权限运行时，应在相应权限下验证本工具。
- 后端保留目标路径、候选数量和 PID 校验规则，避免快捷键选错进程。

## 接入与验证

组合根在创建 Wails App 后，将 `shortcut.New(wailsApp.GlobalShortcut)` 注入 `application.Dependencies.GlobalShortcut`。React 入口、偏好和原有绑定保持不变，详见[龙之谷模块](dn-system.md)。

执行 `go test ./...`、`go test -race ./internal/platform/shortcut`，并交叉编译 Windows 实现。实际 Windows 验证须分别覆盖游戏前台、其他程序前台、最小化/托盘、按住不重复、切换键位、关闭开关与退出释放；必须获得授权后再启动桌面应用。
