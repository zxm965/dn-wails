# 窗口内快捷键

## 模块目标

为 Windows 龙之谷、macOS Firefox 测试的进程页及置顶小窗提供可配置 F1–F12（默认 F4）操作；移除系统全局注册、键盘钩子、后台轮询及全局启用开关。

## 目录与职责

- `frontend/src/features/dn-system/hooks/useDnProcessShortcut.ts`：窗口内按键订阅、修饰键/长按过滤、请求防重入与结果提示。
- `frontend/src/features/dn-system/components/DnProcessKiller.tsx`：进程扫描、手动选择、快捷键和打开小窗入口。
- `frontend/src/features/dn-system/components/DnProcessWindow.tsx`：小窗刷新按钮、进程名称/PID 列表、焦点状态和结果反馈。
- `frontend/src/features/dn-system/hooks/useDnProcessList.ts`：小窗候选扫描、加载/失败状态和扫描结果时序保护。
- `frontend/src/features/dn-system/api/dnProcessApi.ts`：生成绑定适配与进程错误提示。
- `internal/application/dn_process.go`：打开小窗、调用进程用例、记忆路径及跨窗口并发操作防护。
- `internal/platform/dnprocess/firefox_darwin.go`、`firefox_darwin.m`：macOS Firefox 主应用识别、关闭与退出确认。
- `internal/platform/window/process.go`：原生小窗创建、复用、置顶、显示与关闭隐藏。

## 依赖与核心链路

```text
main.tsx 的 ?window=dn-process 分支 → SettingsProvider → DnProcessWindow
DnProcessKiller / DnProcessWindow → useDnProcessShortcut → dnProcessApi
  → Wails KillDragonNestProcess → application.App → dnprocess.Service
  → platform/dnprocess → 操作系统进程 API

DnProcessKiller → dnProcessApi → Wails OpenDragonNestProcessWindow
  → application.App → platform/window.ProcessWindow.Open
```

进程页采用紧凑操作条：快捷键选择、保存状态与打开小窗并排，窄内容区域自动折行，底部仅显示焦点/Fn 简短提示；下拉选择 F1–F12 后自动保存，`settings:changed` typed event 携带 `AppSettings` 同步已打开的小窗；Provider 卸载时解除订阅，正在保存的窗口以保存结果为准。

小窗首次打开、重新获得焦点、点击右上角刷新按钮以及成功终结后都会读取最新候选列表；展示名称/PID，悬停查看路径，多项在局部区域滚动。未发现进程时显示“未运行 · 启动后刷新”；扫描失败显示错误并允许重试。较早扫描的迟到响应不得覆盖更新的结果，卸载后忽略未完成扫描。终结用例每次重新扫描当前进程并按已记录路径匹配，因此关闭后重新启动会操作新 PID，不复用旧 PID；多个候选且无法自动匹配时仍需主窗口选择。

小窗使用独立 React 入口，只挂载设置 Provider 和进程操作，不重复装配账号、消息轮询、任务提醒或更新监听。主窗口的进程页卸载后移除其按键订阅；小窗不跟随主窗口路由变化。

## 数据契约

- `dragonNest.localShortcutKey` 持久化窗口内功能键，允许 `F1`–`F12`，默认/重置为 `F4`；不支持修饰键组合配置，Fn 是否必需取决于键盘功能键模式。
- `OpenDragonNestProcessWindow() error` 创建或激活唯一小窗。
- `KillDragonNestProcess()` 沿用已有进程 DTO 和目标选择规则，读取后端最新 `dragonNest.targetPath`。
- 设置 v11 保留 `dragonNest.targetPath` 并新增 `localShortcutKey`；v7–v10 迁移时移除旧全局字段，初始化本地键位为 F4，保留其他偏好。

## 错误与边界

- **置顶不等于获得键盘焦点**：需先点击小窗，再按配置的功能键；切回游戏、最小化或隐藏后不响应。界面显示当前焦点提示，也提供直接点击的“终结”按钮，与配置的功能键共用操作；小窗标题为“Firefox进程关闭”或“DN进程关闭”；聚焦和失焦提示都展示当前键位及 Fn+键位，保持单行，长结果省略并通过悬停查看全文。
- 输入框、可编辑区域、弹窗内不响应；Ctrl/Shift/Alt/Meta 组合键、输入法组合和长按重复事件不触发。
- 前端防止重复提交，门面共享锁拒绝跨窗口重叠操作并返回 `ErrBusy`；成功、失败均显示状态。
- Windows 终止 DN；macOS 测试模式仅关闭 bundle ID 为 `org.mozilla.firefox`、可执行文件名为 `firefox` 的主应用，排除内容/辅助进程；Linux 显示不可用。既有权限、完整路径校验、候选数量限制和退出等待规则继续生效。
- 小窗默认 `360 × 260`，最小 `280 × 220`，使用系统标题栏拖动和关闭；关闭仅隐藏，重新打开复用，随应用退出释放；打开状态和尺寸不写入主窗口偏好。
- 原生置顶效果受系统窗口管理器、独占全屏与权限限制，必须实机验证。

## 接入与验证

通过进程页“打开置顶小窗”接入；主窗口进程页和小窗内均可按配置的功能键（默认 F4），快捷操作会优先选择已记录路径，没有记录时只接受唯一候选。

执行 `go test ./...`、`pnpm fmt:check`、`pnpm lint`、`pnpm build`，服务签名变化后重新生成绑定。测试验证旧配置迁移、目标路径保留与跨窗口并发拒绝。

人工桌面验收：重复打开只有一个小窗、始终置顶、失焦提示、聚焦后 F4、切回游戏不触发、长按不重复、错误提示、关闭/重开以及应用退出；macOS 验证 Firefox 扫描、手动关闭、F4（部分键盘需 Fn + F4）与小窗关闭，Linux 验证不可用提示和窗口生命周期。启动应用前须获用户授权。
