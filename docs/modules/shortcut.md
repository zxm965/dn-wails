# 窗口内快捷键

## 模块目标

为 Windows 龙之谷、macOS Firefox 测试的进程页及置顶小窗提供可配置 F1–F12（默认 F4）操作；移除系统全局注册、键盘钩子、后台轮询及全局启用开关。

## 目录与职责

- `frontend/src/features/dn-system/hooks/useDnProcessActions.ts`：统一主窗口选择结束、小窗结束、快捷键与启动操作，共用防重入和结果提示；维护窗口内按键订阅与过滤。
- `frontend/src/features/dn-system/components/DnProcessKiller.tsx`：进程扫描、手动选择、快捷键和打开小窗入口。
- `frontend/src/features/dn-system/components/DnLauncherSettings.tsx`：双端启动路径配置、原生文件选择、保存/修改和扫描缺失提示。
- `frontend/src/features/dn-system/components/DnProcessWindow.tsx`：小窗刷新按钮、进程名称/PID 列表、焦点状态和结果反馈。
- `frontend/src/features/dn-system/hooks/useDnProcessList.ts`：主窗口与小窗共用候选扫描、加载/失败状态、进程事件订阅和扫描结果时序保护。
- `frontend/src/features/dn-system/api/dnProcessApi.ts`：生成绑定适配与进程错误提示。
- `internal/application/dn_process.go`：打开小窗、调用进程用例、记忆路径及跨窗口并发操作防护。
- `internal/platform/dnprocess/firefox_darwin.go`、`firefox_darwin.m`：macOS Firefox 主应用识别、关闭与退出确认。
- `internal/platform/window/process.go`：原生小窗创建、复用、置顶、显示与关闭隐藏。

## 依赖与核心链路

```text
main.tsx 的 ?window=dn-process 分支 → SettingsProvider → DnProcessWindow
DnProcessKiller / DnProcessWindow → useDnProcessActions → dnProcessApi
  → Wails TerminateDragonNestProcess / KillDragonNestProcess / LaunchDragonNestProcess → application.App → dnprocess.Service
  → platform/dnprocess → 操作系统进程 API

DnProcessKiller → dnProcessApi → Wails OpenDragonNestProcessWindow
  → application.App → platform/window.ProcessWindow.Open
```

进程页采用紧凑操作条：快捷键选择、保存状态与打开小窗并排，窄内容区域自动折行，底部仅显示焦点/Fn 简短提示；下拉选择 F1–F12 后自动保存，`settings:changed` typed event 携带 `AppSettings` 同步已打开的小窗；Provider 卸载时解除订阅，正在保存的窗口以保存结果为准。

小窗首次打开、重新获得焦点、点击右上角刷新按钮以及成功终结后都会读取最新候选列表；展示名称/PID，悬停查看路径，多项在局部区域滚动。未发现进程时显示“未运行 · 启动后刷新”；扫描失败显示错误并允许重试。较早扫描的迟到响应不得覆盖更新的结果，卸载后忽略未完成扫描。终结用例每次重新扫描当前进程并按已记录路径匹配，因此关闭后重新启动会操作新 PID，不复用旧 PID；多个候选且无法自动匹配时仍需主窗口选择。

应用门面在启动/终结操作后广播 `dn-process:changed` typed event：`action=launch` 表示启动请求成功，`terminate` 表示终结尝试完成，`refresh` 表示启动失败后校准状态；包括可能已生效但返回失败的终结请求，锁占用拒绝不广播。主窗口进程页和小窗各自订阅并重新读取候选，启动事件触发有限重试；操作完成只通过该事件触发列表刷新，操作 Hook 不再额外回调扫描；路径设置也只通过 `settings:changed` 同步，避免重复读取。双方共用请求序号防止旧结果回写，卸载时解除订阅和取消等待。主窗口仍不在首次进入时主动扫描，但打开期间会响应操作事件刷新。这里“关闭”指终结目标应用，小窗自身关闭仅隐藏窗口。

主窗口在进程卡片顶部操作栏左侧放置“启动、结束”，右侧并排放置“扫描”和路径配置入口，窄内容区域自动折行；未选中进程时结束按钮禁用，选中状态直接显示在列表和扫描信息中，不再额外重复展示目标卡片。主窗口选择结束、小窗结束与快捷键共用 `useDnProcessActions`；启动按钮复用同一 Hook 和跨窗口事件同步，启动中禁用重复操作并展示结果。主窗口与小窗的操作按钮统一使用“启动”“结束”，不附加应用名称；小窗两项操作并排展示；启动使用已保存的启动器路径，目标已运行时不重复启动，且与终结共享前后端并发防护。启动请求成功后最多重试扫描 5 秒，发现进程后结束等待；操作结果仅提示请求已发送，是否运行以扫描列表为准。新扫描和卸载会取消旧扫描的等待计时器，只有显式启动触发这段有限重试。

Windows 扫描白名单包含 `DNLauncher.exe`、`DragonNest.exe` 和 `DragonNest_x64.exe`。尚未记录启动器时，扫描发现唯一安装路径则自动持久化 `dragonNest.launcherPath`，与终结目标 `targetPath` 分开；多个安装路径不自动选取。启动优先使用已保存的 `DNLauncher.exe`；仅接受明确的启动器路径，不从游戏目录猜测；未发现时由用户配置。通过 `ShellExecuteW` 的普通“打开”动作启动，以启动器目录为工作目录，不拼接命令行、不经过命令解释器；目标已运行则不重复启动，不直接运行游戏 exe 代替登录启动器。按照[微软游戏 UAC 指南](https://learn.microsoft.com/en-us/windows/win32/dxtecharts/user-account-control-for-game-developers)，系统 Shell 启动可处理启动器清单要求的提权提示，取消或失败需返回错误；本工具不强制以管理员运行所有启动器。

主窗口在进程卡片右上角的扫描按钮旁提供“配置启动路径 / 修改启动路径”按钮，点击后通过弹窗选择文件、直接填写、保存或取消；未扫描到应用且没有配置时显示提醒，不自动打开表单。保存成功关闭弹窗并隐藏路径，重新打开回填已保存值；取消丢弃未保存修改，保存失败保留弹窗与输入，选择文件或保存期间禁止关闭。已保存路径在启动器未运行时仍可使用，不把未运行等同于文件不存在。保存经 `SaveDragonNestLauncherPath → dnprocess.ValidateLauncherPath → Windows platform` 校验绝对路径、名称、非系统目录及普通文件存在性；无效路径与落盘失败保留旧配置并展示错误。扫描、自动记忆和普通偏好更新均不会覆盖已有路径，显式保存才修改它；路径保存成功广播设置和进程刷新事件。macOS 同样提供配置弹窗，可选择 Firefox.app 或输入其 firefox 可执行文件路径；原生选择器不加扩展名筛选，避免系统将应用包置灰，选中后统一执行 Firefox 身份校验；后端校验 bundle ID、可执行文件名及执行权限，统一保存可执行文件路径，以匹配进程扫描结果。Linux 不显示配置入口并返回不可用。

两端共用配置弹窗、保存接口、扫描记忆唯一启动路径、启动并发防护及事件刷新逻辑；前端差异集中在 `PROCESS_TARGET` 的软件名称、路径说明和文件筛选数据。未记录路径时统一提示配置或先打开目标应用后扫描，不隐式猜测安装位置。macOS 校验 Firefox bundle ID、可执行路径和文件可执行性，经 `/usr/bin/open -g -a` 启动。启动时用 `--env MOZ_DISABLE_AUTO_SAFE_MODE=1` 仅向该应用传入环境变量，跳过连续强制退出后的自动排障模式提示；不修改 Firefox 配置文件或全局环境，也不改变用户主动启用的排障模式设置。依据 [Mozilla 启动实现](https://github.com/mozilla-firefox/firefox/blob/main/toolkit/components/startup/nsAppStartup.cpp) 的 `GetAutomaticSafeModeNecessary`。已经打开的排障提示不会被“启动”按钮强行重启，需先退出该 Firefox 实例后再启动。

小窗使用独立 React 入口，只挂载设置 Provider 和进程操作，不重复装配账号、消息轮询、任务提醒或更新监听。标题仅显示在系统标题栏，内容区首行并排展示快捷键/Fn 提示与刷新按钮，避免重复标题占用空间。主窗口的进程页卸载后移除其按键订阅；小窗不跟随主窗口路由变化。

## 数据契约

- `dragonNest.localShortcutKey` 持久化窗口内功能键，允许 `F1`–`F12`，默认/重置为 `F4`；不支持修饰键组合配置，Fn 是否必需取决于键盘功能键模式。
- `OpenDragonNestProcessWindow() error` 创建或激活唯一小窗。
- `KillDragonNestProcess()` 沿用已有进程 DTO 和目标选择规则，读取后端最新 `dragonNest.targetPath`。
- `LaunchDragonNestProcess() error` 只读取后端最新 `launcherPath`，不回退到终结目标 `targetPath`，调用 `LaunchConfigured`；`ErrLaunchPathRequired`、`ErrLaunchNotFound` 分别表示尚未记住启动路径与目标应用不存在，Linux 返回不可用。
- `dn-process:changed` 使用应用 DTO `DnProcessChange { action: string }`，所有已打开的进程列表重新扫描，不直接信任事件推断进程存活状态。
- `SaveDragonNestLauncherPath(DnLauncherConfiguration) (DnLauncherConfiguration, error)`，请求和响应均为 `{ path: string }`；请求 trim 后校验非空、4096 字符以内及不含换行/NUL，Windows 仅接受存在的 `DNLauncher.exe`；macOS 接受有效 Firefox.app 或其可执行文件，返回规范化可执行文件完整路径。通过共享 Native Kit `pickFiles` 选择文件不直接执行程序。
- 设置 v11 使用可选 `dragonNest.launcherPath`，未配置时为空；扫描和成功终结启动器仅在未配置时自动记录，普通偏好保存保留后端最新路径。
- 设置仅接受 v11，包含 `dragonNest.targetPath` 与 `localShortcutKey`，默认键位 F4；不提供旧版设置迁移。

## 错误与边界

- **置顶不等于获得键盘焦点**：需先点击小窗，再按配置的功能键；切回游戏、最小化或隐藏后不响应。界面显示当前焦点提示，也提供直接点击的“终结”按钮，与配置的功能键共用操作；系统标题仅显示“Firefox”或“龙之谷”；聚焦和失焦提示都展示当前键位及 Fn+键位，保持单行，长结果省略并通过悬停查看全文。
- 输入框、可编辑区域、弹窗内不响应；Ctrl/Shift/Alt/Meta 组合键、输入法组合和长按重复事件不触发。
- 前端防止重复提交，门面共享锁拒绝跨窗口重叠操作并返回 `ErrBusy`；成功、失败均显示状态。
- Windows 终止 DN；macOS 测试模式仅关闭 bundle ID 为 `org.mozilla.firefox`、可执行文件名为 `firefox` 的主应用，排除内容/辅助进程；Linux 显示不可用。既有权限、完整路径校验、候选数量限制和退出等待规则继续生效。
- 小窗默认 `360 × 260`，最小 `280 × 220`，使用系统标题栏拖动和关闭；关闭仅隐藏，重新打开复用，随应用退出释放；打开状态和尺寸不写入主窗口偏好。
- 原生置顶效果受系统窗口管理器、独占全屏与权限限制，必须实机验证。

## 接入与验证

通过进程页“打开置顶小窗”接入；主窗口进程页和小窗内均可按配置的功能键（默认 F4），快捷操作会优先选择已记录路径，没有记录时只接受唯一候选。

执行 `go test ./...`、`pnpm fmt:check`、`pnpm lint`、`pnpm build`，服务签名变化后重新生成绑定。测试验证旧版设置拒绝且不覆写、目标路径保留与跨窗口并发拒绝。

人工桌面验收：重复打开只有一个小窗、始终置顶、失焦提示、聚焦后 F4、切回游戏不触发、长按不重复、错误提示、关闭/重开以及应用退出；macOS 验证 Firefox 扫描、手动关闭、F4（部分键盘需 Fn + F4）与小窗关闭；Windows 验证启动器路径、启动与结束同步。启动应用前须获用户授权。
