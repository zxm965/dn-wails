# 全局快捷键

## 模块目标

为龙之谷进程工具提供不依赖应用窗口焦点的全局快捷键；Windows 直接响应选定的 F1–F12 单键，F1–F11 保留系统热键注册，F1–F12 同时使用独立线程的低级键盘监听与后台检测。

## 目录与职责

- `internal/platform/shortcut/shortcut.go`：Wails 热键适配、后台监测生命周期、单键范围校验、去重与并发执行控制。
- `internal/platform/shortcut/keyboard.go`：跨平台可测的功能键与左右修饰键状态跟踪。
- `internal/platform/shortcut/keyboard_windows.go`：`WH_KEYBOARD_LL` 监听、固定 OS 线程、独立消息循环和注销协调。
- `internal/platform/shortcut/keyboard_test.go`：验证异步按键状态始终为零时的触发、修饰键、去重与监听生命周期。
- `internal/platform/shortcut/windows.go`：装配监听，并通过 `GetAsyncKeyState` 读取当前配置的功能键与修饰键状态，仅使用高位的当前按下状态。
- `internal/platform/shortcut/other.go`：macOS、Linux 沿用 Wails 原有全局热键，不启动 Windows 兜底检测。
- `internal/platform/shortcut/shortcut_test.go`：使用原生注册和按键读取 stub 验证消息缺失、多条链路去重、按住不重复、配置切换与注销。
- `internal/application/app.go`：在 `RuntimeReady` 时注册、配置变化时替换、`ServiceShutdown` 时注销；回调调用既有进程终止用例。

## 依赖与核心链路

```text
DnProcessKiller → settings API / Hook → Wails UpdateSettings
  → application.App.syncDragonNestShortcut
  → platform/shortcut.New(Wails GlobalShortcut)
      → RegisterHotKey / WM_HOTKEY（仅 F1–F11）
      → Windows WH_KEYBOARD_LL / 独立线程 GetMessage
      → Windows GetAsyncKeyState（每 20ms，仅开启时运行）
  → application.App.KillDragonNestProcess
  → dnprocess.Service.TerminateConfigured
  → platform/dnprocess 的路径检查与进程终止
```

三条输入链路共享一次触发状态（F12 只有监听与采样两条）。功能键从抬起变为按下且 Ctrl/Shift/Alt/Win 均未按下时触发；监听通过按下/释放事件跟踪左右修饰键，不在钩子回调中查询尚未更新的异步键状态。监听认为功能键仍按住时，采样返回零不会清除其按下状态，避免在游戏前台重复终止。持续按住不重复执行，注册时已经按下的功能键须先释放；再次按键与前次触发至少间隔 150ms，以过滤释放后迟到的原生消息。进程终止未完成时不并发执行下一次操作。

## 数据契约

- 适配器实现已有 `Register(string, func()) error` 与 `Unregister(string) error`，不新增 Wails 方法、DTO 或事件。
- 只接受设置已允许的 `F1` 至 `F12`；快捷键键位、开关和目标路径继续使用 `AppSettings.dragonNest`。
- 监听仅保留当前功能键和修饰键的状态，其他按键立即传递给下一钩子，不保存按键内容；后台采样仅查询当前功能键与修饰键。

## 错误与边界

- F12 是 [Windows 为调试器保留的键位](https://learn.microsoft.com/zh-cn/windows/win32/api/winuser/nf-winuser-registerhotkey)，不调用原生注册或注销，通过低级键盘监听与后台采样触发；监听总是调用 `CallNextHookEx`，不会拦截前台应用的 F12 行为。
- F1–F11 原生注册失败（例如键位被其他软件占用）继续返回错误，不通过兜底绕过占用；设置更新沿用既有回滚和日志处理。
- 监听安装失败会返回错误并回滚已经注册的系统热键。原生注销失败时保留监听；监听注销失败时恢复原生注册并保留检测，恢复失败也返回具体错误。成功注销后卸载钩子、结束监听线程和采样定时器，并忽略已排队的旧回调；正在执行的终止操作正常完成。
- 此能力不要求窗口激活、页面打开或 WebView 处理键盘事件；程序必须仍在运行，真正退出后不响应。
- 按键状态检测受 Windows 桌面与 UIPI 权限限制，安全桌面、权限不足或游戏保护机制可能使查询不可用；20ms 采样也可能遗漏极短的按键，因此增加事件监听。游戏保护或后安装钩子截断事件链时，监听仍可能无法收到按键；不存在已确认适用于所有龙之谷版本的保证。
- 未授予额外进程权限、不自动提权，不承诺关闭受保护进程；游戏以管理员权限运行时，应在相应权限下验证本工具。
- 后端保留目标路径、候选数量和 PID 校验规则，避免快捷键选错进程。
- 回调分别记录快捷键已触发、终止失败或确认退出的 PID/名称；进程操作在同一 Windows 句柄上完成校验、终止与最多 3 秒的退出等待，详见[龙之谷模块](dn-system.md#社区方式对照与实机验收)。

## 接入与验证

监听在固定的 OS 线程上安装并运行消息循环；回调只更新状态和调度后台任务，始终继续传递事件，进程终止不会阻塞钩子。Go 回调指针只创建一次，切换键位时复用。注册日志 `global shortcut keyboard listener ready: key=F4 thread=...` 表示安装与消息线程已就绪。[微软 LowLevelKeyboardProc 文档](https://learn.microsoft.com/en-us/windows/win32/winmsg/lowlevelkeyboardproc)要求消息循环及快速返回，[AutoHotkey 官方说明](https://github.com/AutoHotkey/AutoHotkeyDocs/blob/v2/docs/lib/InstallKeybdHook.htm)也提供对 `RegisterHotKey` 之外热键使用键盘钩子的方式；这只是可审查的通用方案，不能当作龙之谷实机兼容证明。

组合根在创建 Wails App 后，将 `shortcut.New(wailsApp.GlobalShortcut)` 注入 `application.Dependencies.GlobalShortcut`。React 入口、偏好和原有绑定保持不变，详见[龙之谷模块](dn-system.md)。

执行 `go test ./...`、`go test -race ./internal/platform/shortcut`，并交叉编译 Windows 实现；测试覆盖单键校验、修饰键排除、F12 无原生注册的触发与清理、异步状态为零时的监听触发、监听错误回滚和 v7/v8 设置迁移。实际 Windows 验证须分别覆盖游戏前台、其他程序前台、最小化/托盘、按住不重复、切换键位、关闭开关与退出释放；必须获得授权后再启动桌面应用。
