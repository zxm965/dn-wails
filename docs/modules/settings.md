# 设置中心模块

## 模块目标

提供类型化、可验证、可持久化的应用设置，并协调左侧菜单、主题、通知和窗口模块实时应用设置。

## 目录与职责

- `internal/settings/model.go`：设置结构、枚举常量和默认值。
- `internal/settings/service.go`：读取、校验、保存、重置和窗口边界更新。
- `internal/application/settings.go`：Wails 设置绑定门面。
- `frontend/src/features/settings/api/`：生成类型转换和 API 封装。
- `frontend/src/features/settings/context/`：全局设置状态，并将外观设置同步到 DOM。
- `frontend/src/features/settings/components/SettingsPanel.tsx`：顶部页签设置界面，默认进入“概览”，该页包含应用快照、运行状态和应用更新。
- `frontend/src/features/settings/components/DesktopOverview.tsx`、`DesktopOverview.css.ts`：应用版本、构建档案与功能快照。
- `frontend/src/features/settings/components/RuntimeStatusPanel.tsx`、`RuntimeStatusPanel.css.ts`：概览中的运行健康、服务矩阵、外观/窗口/通知配置摘要、诊断摘要和日志入口。
- `frontend/src/shared/components/ui/PageTabs.tsx`、`PageTabs.css.ts`：设置与实验室共用的顶部单行页签和键盘导航。
- `frontend/src/shared/navigation/menuConfig.ts`：菜单唯一 key、结构、标题、图标、默认显隐和偏好说明的单一配置源；日历与站内消息在这里作为独立菜单项配置。
- `frontend/src/shared/components/app-sidebar/`：通过“系统设置 → 设置”进入设置页。

## 数据结构

```text
AppSettings
├── version
├── appearance
│   ├── themeMode
│   ├── accent
│   ├── density
│   ├── buttonSize
│   └── fontScale
├── notifications
│   ├── enabled
│   ├── showPreview
│   └── doNotDisturb
├── navigation
│   └── menuVisibility: Record<string, boolean>
├── dragonNest
│   ├── shortcutEnabled
│   ├── shortcutKey
│   └── targetPath
└── window
    ├── closeBehavior
    ├── alwaysOnTop
    ├── rememberBounds
    └── bounds
```

## 核心链路

```text
App ServiceStartup → Settings.Initialize → Storage.Load
React SettingsProvider → GetSettings
用户修改任一控件 → 乐观更新全局状态 → 串行 UpdateSettings → 校验 → Storage.Save
  ├── SettingsProvider 应用外观
  ├── Button 应用默认按钮尺寸
  ├── Notification 使用新策略
  ├── AppSidebar 按菜单唯一 key 过滤入口
  └── WindowManager 应用置顶设置
```

## 校验规则

- 当前设置版本为 v8；v7 设置会在首次启动时清除旧的 龙之谷 快捷键配置、恢复默认关闭和默认 `Ctrl+F4`，然后迁移到 v8；其他旧版本仍拒绝加载。
- 主题、强调色、密度、默认按钮尺寸和关闭行为必须属于允许值。
- 默认按钮尺寸只允许 `sm`、`md`、`lg`，默认值为 `md`。
- 字体缩放范围为 `0.85` 到 `1.25`。
- `menuVisibility` 必须是对象；菜单 key 不得为空、带首尾空白或超过 64 字节。
- 窗口边界由窗口管理模块在恢复和采集时检查；偏小的历史边界不会阻断菜单、主题等普通偏好保存。
- 返回设置时会复制菜单映射和指针字段，避免调用方修改内部状态。
- Go 写入操作串行化，避免关闭保存窗口状态与前端更新设置互相覆盖。
- 前端 Provider 也维护串行持久化队列；连续切换主题、按钮尺寸或滑块时保持写入顺序，最新设置立即驱动 UI。
- 最新写入失败时显示错误并重新读取已持久化设置，避免界面长期停留在未保存状态。

## 接入方式

React 组件通过 `useSettings` 读取和更新设置。所有配置项取消独立保存按钮，菜单、主题、强调色、密度、按钮尺寸、文字缩放、通知和窗口行为在控件变化时立即更新并自动持久化。主题和强调色使用共享 `RadioGroup`，默认按钮尺寸使用三枚带 `sm/md/lg` 尺寸的共享 `Button`，文字缩放使用共享 `Slider`，布尔设置使用共享 `Switch`，下拉选项使用共享 `Select`；按钮尺寸选择器固定容器高度，切换时不引发布局跳动。设置页不直接渲染原生交互控件。Go 模块通过 `SettingsService` 获取当前快照，不直接读写 JSON 文件。

左侧菜单使用 `menuConfig.ts` 作为渲染、偏好选项和显隐读取的共同配置。`menuVisibility` 只保存用户按唯一 key 做出的覆盖值；未保存的 key 使用配置中的 `defaultVisible`。当前 `dn-system` 和 `devtools` 默认隐藏，独立的 `quick-notes`、`calendar`、`tasks` 和 `site-messages` 默认显示，`settings` 始终显示且不提供关闭开关。隐藏当前入口后，React Router 导航守卫会替换为第一个可见路由。龙之谷 的 Windows 全局快捷键仍由 `AppSettings.dragonNest` 持久化，但配置 UI 已迁移到 `龙之谷 · 进程` 页面；默认关闭、默认 `Ctrl+F4`，快捷键只接受 `Ctrl+F1` 到 `Ctrl+F11` 的完整组合。系统注册在 `WindowRuntimeReady` 后执行，窗口失焦、最小化或隐藏到托盘后仍由 Windows 全局快捷键响应；用户成功手动结束一次候选进程后，目标路径会被保存供快捷键使用。实验室 下的“桌面实验室”继续使用默认关闭的兼容 key `devtools-desktop`：父开关关闭时子开关以关闭状态禁用，父开关开启后可单独切换。新增可配置菜单或子偏好时补充同一配置项即可进入设置列表。

设置顶部页签按“概览 / 外观 / 菜单 / 通知 / 窗口”排序，默认进入概览；概览依次展示应用快照、运行状态和应用更新，不提供独立运行页签。外观方案、窗口策略和通知策略以紧凑配置卡片收敛到“能力状态”，不再在应用快照中单独占用三张大卡片。异常项优先于受限项；其余按外观、账号、系统通知、通知策略、窗口、任务、笔记、龙之谷、日志排序，后端检查数组不被修改。检查计数与配置计数分别展示，配置不参与服务健康判定；运行检查加载或失败时仍展示当前配置。其他页签分别承载对应偏好，继续自动保存；恢复默认按钮和保存状态仅在这些偏好页签展示。

能力卡片复用右侧状态标签作为配置入口：有目标时通过共享 `Button` 包裹原有 `Badge`，保留标签颜色、文案和紧凑布局，不新增底部操作区；无配置目标时保留只读标签。悬停提示说明跳转目标，可通过键盘聚焦并激活。外观/窗口/通知切换到对应设置页签，系统通知进入通知页签，账号进入个人信息页并沿用登录守卫，龙之谷进入进程页配置快捷键（菜单隐藏时先进入菜单页签）。任务、笔记和日志没有可编辑的服务配置，不提供配置跳转。设置页签跳转后滚动回页头并聚焦选中页签。能力列表不再展示“应用更新”卡片，概览底部继续提供正式版本检查；列表检查计数按实际展示的服务计算。

`App.tsx → SettingsPanel → DesktopOverview / RuntimeStatusPanel`：概览通过 settings 内部 Context 和 app-update 的公开 Hook 读取偏好及版本；运行状态通过 `shared/diagnostics`、Wails 生成的 `GetRuntimeStatus` 绑定和 `internal/application/runtime_status.go`，汇总业务服务的只读健康检查与平台能力。此迁移不修改 Go DTO、绑定或持久化结构。

隐藏实验室不影响设置中的概览和诊断。运行状态在进入概览或手动刷新时检查，不轮询；离开概览卸载组件，再次进入重新检查。复制摘要、打开日志与更新操作保留原有错误反馈，敏感连接信息不返回前端。更新状态由根级 AppUpdateProvider 维护，切换页签不影响下载。

## 响应式处理

- 页签保持单行，空间不足时先隐藏说明和编号，极窄宽度允许页签条内部横向滚动，不造成整页横向滚动；页签使用固定 `md` 按钮和 Base UI 的键盘导航及面板关联。
- 设置页以自身内容宽度作为 Container Query 条件，侧边栏展开或收起时都能正确切换布局。
- 设置复用共享 `PageHeader`；内容宽度不足 620px 时页头操作移到标题下方，设置网格在 700px 以下由双列变为单列。
- 页头展示“修改自动保存/正在同步”状态；恢复默认按钮在极窄宽度下改为全宽。
- 恢复默认操作不固定尺寸，跟随用户配置的默认按钮尺寸。
- 主题分段、强调色、下拉框、滑块和开关行不得超出卡片；说明文字允许换行。
- “左侧菜单”采用紧凑卡片网格：内容宽度超过 `1050px` 时三列，`660–1050px` 时两列，`660px` 及以下单列；卡片内收紧间距和说明文字，减少菜单增多时的纵向占用，不增加内部滚动条。
- 菜单子偏好留在对应父卡片内，保留缩进和父开关关闭时禁用的行为；长文本可换行，开关不压缩，通知和窗口设置仍使用原有行布局。

## 验证

```bash
go test ./internal/settings
cd frontend && pnpm build
```
