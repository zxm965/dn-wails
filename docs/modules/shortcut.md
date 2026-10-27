# 全局快捷键与置顶小窗

## 模块目标

在 Windows 龙之谷、macOS Firefox 测试模式下，通过全局快捷键结束已确认的目标进程；应用最小化、隐藏、离开进程页或小窗失焦均不依赖前端键盘监听。Windows 提供标准全局和游戏兼容两种输入模式，明确区分输入通道注册、按键到达与进程执行结果。

## 目录与职责

- `internal/shortcut/service.go`：平台无关的注册状态、配置切换、过期回调隔离、并发抑制和执行结果。
- `internal/platform/shortcut/native.go`：Wails `GlobalShortcut.Register` 适配及平台选择。
- `internal/platform/shortcut/raw_windows.go`：Windows Raw Input 后台接收、独立 OS 线程、消息窗口、设备生命周期及资源释放。
- `internal/platform/shortcut/keyboard.go`：仅跟踪功能键和修饰键的按下/释放状态，不保存输入文本。
- `internal/application/shortcut.go`：运行时就绪协调、状态查询与注册重试；回调复用 `KillDragonNestProcess`。
- `internal/application/dn_process.go`：进程用例、路径记忆、跨窗口并发防护与刷新事件。
- `frontend/src/features/dn-system/api/dnProcessApi.ts`：生成绑定、typed event 和错误适配。
- `frontend/src/features/dn-system/hooks/useDnShortcut.ts`：订阅状态、首次及重新聚焦时查询、注册重试、版本顺序保护。
- `frontend/src/features/dn-system/hooks/useDnProcessActions.ts`：主窗口与小窗的启动/结束操作；不监听 `keydown`。
- `frontend/src/features/dn-system/components/DnProcessKiller.tsx`：启用开关、键位、Windows 输入模式、诊断信息与小窗入口。
- `frontend/src/features/dn-system/components/DnProcessWindow.tsx`：进程列表、手动操作、全局输入状态和最近结果。
- `internal/platform/window/process.go`：原生置顶小窗创建、复用、显示和关闭隐藏。

## 依赖与核心链路

```text
main → platform/shortcut.New(Wails App) → application.Dependencies.Shortcut
WindowRuntimeReady → application.syncDragonNestShortcut → shortcut.Service.Configure
  → 标准：Wails GlobalShortcut → Windows RegisterHotKey / macOS Carbon hotkey
  → Windows 游戏兼容：Raw Input / RIDEV_INPUTSINK → WM_INPUT
  → shortcut.Service → application.KillDragonNestProcess
  → dnprocess.Service.TerminateConfigured → platform/dnprocess → 系统进程 API
  → dn-shortcut:changed / dn-process:changed → 前端 API → Hook → 主窗口与小窗

进程页 → SettingsProvider → UpdateSettings → 保存成功 → 同步全局注册
main.tsx 的 ?window=dn-process 分支 → SettingsProvider → DnProcessWindow
```

注册在 `WindowRuntimeReady` 后进行，避免把 Wails 启动前的待注册队列当作操作系统已确认成功；主窗口事件中异步协调，避免阻塞 UI 线程。修改设置、重置或重试均读取后端最新设置并串行协调。保存失败不修改当前输入通道。注册失败仍保留已保存的意图，单独展示注册错误，可更换键位或重试，不把“保存成功”当作“热键可用”。

两种输入模式互斥，切换时先停旧通道再启动新通道，不同时使用 Wails、键盘钩子和轮询竞争触发。旧通道注销失败时拒绝启动新通道；过期回调通过代次校验丢弃。执行中忽略重入；手动操作与全局回调仍共用应用门面的进程锁。

## Windows 游戏兼容模式

使用 `RegisterRawInputDevices` 注册键盘 `UsagePage=1, Usage=6`，标记 `RIDEV_INPUTSINK | RIDEV_DEVNOTIFY`，将事件送入专用 message-only window；固定 OS 线程持续处理 `WM_INPUT`，通过 `GetRawInputData` 读取键盘数据。它不依赖 WebView 焦点、传统 `WM_KEYDOWN` 或 `WH_KEYBOARD_LL` 钩子链，也不使用 `RIDEV_EXINPUTSINK` 的前台未注册条件。依据[微软 Raw Input 文档](https://learn.microsoft.com/en-us/windows/win32/inputdev/about-raw-input)。

每个键盘单独跟踪功能键和左右修饰键，跨设备合并修饰键；只在首次按下匹配键时触发，长按重复包被忽略，设备移除时清除状态。启动时只读取一次修饰键初始状态，不进行后台轮询。回调在 Go goroutine 执行业务，消息线程不等待进程结束。`WM_INPUT` 读完后始终交给 `DefWindowProc` 清理。

游戏兼容模式不拦截或吞掉游戏原有按键；游戏可能同时响应 F4，因此提供 `Ctrl+Shift+F4`。它是系统公开的后台输入接口，不注入游戏、不安装驱动、不绕过游戏保护；不能承诺所有反作弊、独占输入、远程会话或安全桌面下都能收到。**游戏兼容性必须以 Windows 实机“收到次数是否增加”与执行结果分别验收。**

停用或换键时通知线程退出，注销设备并销毁窗口；应用上下文取消也会停止该线程。Wails 在应用退出时自动释放标准全局热键，ServiceShutdown 仅使回调失效，不再次等待主线程注销。

## 数据契约

设置继续使用 v11，保留 `dragonNest.localShortcutKey` 字段名以免丢失已有键位，语义改为所选全局键位：

- `localShortcutKey`：F1–F12 或 `Ctrl+Shift+F4`，默认 F4。Windows 标准模式明确拒绝保留给调试器的 F12；游戏兼容可观察 F12。
- `globalShortcutEnabled`：可选 bool，新安装及恢复默认设置时为 true，运行时就绪后自动注册默认 F4；已有 v11 文件保留原值（历史省略字段仍视为 false），手动停用后重启保持停用。
- `gameShortcutMode`：可选 bool，新安装及恢复默认设置时为 true，已有偏好保持不变（历史省略字段仍视为 false）；Windows 为 true 时使用 Raw Input，macOS 忽略此模式并使用 Wails Carbon hotkey，Linux 不支持进程操作。
- `targetPath`、`launcherPath`：继续分别表示终止目标和启动器，普通设置保存保留后端最新路径。

`GetDragonNestShortcutStatus()` 和 `RetryDragonNestShortcut()` 返回 `shortcut.Status`；typed event `dn-shortcut:changed` 使用同一结构：`revision`、`enabled`、`key`、`gameMode`、`registered`、`registrationError`、`triggerCount`、`lastTriggeredAt`、`running`、`lastError`、`lastProcess`。

状态和计数保留在后端内存，不随路由切换或小窗关闭丢失；应用重启后清零。最近触发时间为 RFC3339Nano UTC，前端按本地时间显示。前端先订阅再读取，以 revision 拒绝旧响应，并在卸载时解除订阅。后台没有任何进程页面时仍能执行，重新打开后可查询结果。`registered` 表示输入通道已注册，不表示已验证游戏兼容；只有 `triggerCount` 增加才能证明按键到达。

## 进程操作与小窗

全局触发复用既有路径白名单、同一进程句柄校验、最多 3 秒退出等待和错误映射；终止成功才记录目标路径。没有已记忆路径且有多个候选时，要求在主窗口手动选择；不会通过 `taskkill /IM` 批量关闭。权限不足单独报告，管理员启动不是输入通道未注册的修复方式。

主窗口与小窗的启动、扫描、配置启动路径、终止和跨窗口刷新链路保持一致，详见[DN 系统模块](dn-system.md)。`dn-process:changed` 驱动列表刷新；初次打开和重新聚焦时也会扫描，启动后有限重试 5 秒，旧扫描结果不得覆盖新结果。启动和结束共用并发防护；启动器与终止目标路径分开保存，macOS 仅操作 Firefox 主应用，Linux 显示不可用。

小窗默认 `360 × 260`，最小 `280 × 220`，使用系统标题栏、置顶与关闭隐藏；重复打开复用，随应用退出释放。标题显示目标软件名称，内容展示全局键位、注册/触发状态、候选进程和操作结果。长状态单行省略并提供完整 title，内容可纵向滚动；主窗口快捷键操作区自动折行，长错误可换行。

## 错误与边界

- 标准模式注册冲突、Windows F12、Raw Input 启动/读取/消息循环失败均显示为输入通道错误，并提供重试；不会默默退回前端监听。
- 全局快捷键在输入框和弹窗内也生效；停用开关用于释放键位。Fn 属于硬件功能键模式，不是可注册的修饰键。
- 两种模式各自抑制长按，标准 Windows 使用 Wails 的 `MOD_NOREPEAT`，游戏兼容使用按下/释放状态。
- 全局回调与手动操作冲突时可能返回“正在操作进程”，不会重复终止；停用不会撤销已经开始的终止操作。
- 游戏权限、进程保护、独占全屏和系统窗口管理器仍需实机验证；本工具不修改 manifest 强制提升整个应用。

## 验证方式

自动检查：`go test ./...`，shortcut/platform/application/settings 包 race 检查，Windows amd64/arm64 交叉编译，`pnpm fmt:check`、`pnpm lint`、`pnpm build`；绑定和 typed event 变化后生成并审查绑定。测试覆盖未就绪不注册、保存失败不切换、重试、过期回调、切换模式、停用、重置、权限错误、并发触发、长按、修饰键、多设备及 Windows ABI 布局（Windows 测试需该平台运行）。

Windows 实机验收（启动应用前需授权）：

1. 使用新建或重置设置，在主窗口进程页确认目标、默认 F4 和游戏兼容模式，检查快捷键自动注册为“已就绪”；已有设置则按保存的开关与模式注册。
2. 切到记事本、最小化主窗口、小窗失焦分别按 F4，确认次数与结果更新；长按仅触发一次。
3. 游戏置于前台，分别测试标准全局、游戏兼容、Ctrl+Shift+F4，以及窗口化/无边框/独占全屏；记录收到次数、最近触发时间、结果和日志 `shortcut:` 行。
4. 次数为零表示输入未到达，次数增加但失败表示进程操作问题；拒绝访问时再比较普通与管理员运行。
5. 验证切换键位和模式、旧键失效、其他应用占用键位、注册重试、停用后不响应、退出后键位释放，以及多键盘拔插。
6. macOS 测试 Firefox 的前台/后台触发和 Fn；Linux 检查不可用提示。

自动测试与交叉编译不代替 Windows 游戏实机验收。

## React 回调与生命周期

进程列表与快捷键状态订阅按挂载生命周期建立，焦点及原生事件通过 Effect Event 调用最新处理逻辑，普通重渲染不重新扫描或订阅；卸载继续取消监听、等待与过期请求。手动刷新、重试、启动和结束操作使用普通函数。

回归检查：`cd frontend && node --test tests/*.test.mjs`；这些模拟与构建检查不替代原生桌面交互验证。
