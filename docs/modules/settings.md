# 设置中心模块

## 模块目标

提供类型化、可验证、可持久化的应用设置，并协调左侧菜单、主题、通知和窗口模块实时应用设置。

## 目录与职责

- `internal/settings/model.go`：设置结构、枚举常量和默认值。
- `internal/settings/service.go`：读取、校验、保存、重置和窗口边界更新。
- `internal/application/settings.go`：Wails 设置绑定门面。
- `frontend/src/features/settings/api/`：生成类型转换和 API 封装。
- `frontend/src/features/settings/context/`：全局设置状态，并将外观设置同步到 DOM。
- `frontend/src/features/settings/components/SettingsPanel.tsx`：顶部页签设置界面，首次进入“概览”，该页包含精简应用信息、服务状态和应用更新；后续恢复会话内上次分类与滚动位置。
- `frontend/src/features/settings/components/MenuPreferences.tsx`、`MenuPreferences.css.ts`：菜单显隐、组内拖动排序、键盘排序与顺序恢复。
- `frontend/src/features/settings/components/DesktopOverview.tsx`、`DesktopOverview.css.ts`：应用标识、版本、构建平台、Go 版本、生命周期与日志摘要整合为一张卡片，并提供刷新、复制摘要与打开日志入口。
- `frontend/src/features/settings/components/RuntimeStatusPanel.tsx`、`RuntimeStatusPanel.css.ts`：统一加载运行快照、处理刷新/复制/日志动作，将快照传入 DesktopOverview，下方仅渲染六项服务检查，不重复外观/窗口/通知配置摘要。
- `frontend/src/features/settings/hooks/useRuntimeStatus.ts`：60 秒运行快照缓存、并发请求合并和强制刷新。
- `frontend/src/features/settings/hooks/useSettingsViewState.ts`、`lib/settingsViewSession.ts`：会话内的分类、滚动位置与诊断展开状态，不进入持久化偏好。
- `frontend/src/features/settings/lib/runtimeStatus.ts`：概览与复制摘要共用的日期、时长和日志文件名格式化。
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
│   └── fontSizePreset
├── notifications
│   ├── enabled
│   ├── showPreview
│   └── doNotDisturb
├── navigation
│   ├── menuVisibility: Record<string, boolean>
│   └── menuOrder: Record<string, string[]>（可选，按分组/父菜单 key 保存顺序）
├── dragonNest
│   ├── localShortcutKey（保留字段名，全局键位）
│   ├── globalShortcutEnabled（可选，默认关闭）
│   ├── gameShortcutMode（可选，Windows Raw Input）
│   ├── targetPath
│   └── launcherPath（可选，应用启动文件）
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
  ├── AppSidebar 按菜单唯一 key 排序并过滤入口
  └── WindowManager 应用置顶设置
```

## 校验规则

- 当前设置版本为 v11，只接受该版本；不再自动迁移 v7–v10，遇到其他版本返回错误且初始化不覆盖原文件。
- 主题、强调色、密度、默认按钮尺寸和关闭行为必须属于允许值。
- 界面密度 `comfortable` / `compact` 分别使用原布局与 75% 留白，控制页面、卡片、表单及列表行间距；通过外观 CSS 变量立即应用，不改变字号和按钮尺寸，详见[主题与外观](theme-appearance.md)。
- 默认按钮尺寸只允许 `sm`、`md`、`lg`，默认值为 `md`。
- 全局字号组合为 `sm` / `md` / `lg`，默认 `md`；v11 缺少字段时使用标准组合并保留其他偏好，不映射旧缩放值，保存时移除旧字段；非空非法值拒绝。
- `menuVisibility` 必须是对象；菜单 key 不得为空、带首尾空白或超过 64 字节。
- 窗口边界由窗口管理模块在恢复和采集时检查；偏小的历史边界不会阻断菜单、主题等普通偏好保存。
- `menuOrder` 缺省或为空时采用默认顺序；最多 32 个分组，每组最多 128 项，组名与菜单 key 不得为空、带首尾空白或超过 64 字节，同组不得重复。菜单归属由前端配置确定，解析顺序时忽略未知或跨组 key，未列出的菜单按默认顺序补到组尾。
- 返回设置时会复制菜单映射、排序切片和指针字段，避免调用方修改内部状态。
- Go 写入操作串行化，避免关闭保存窗口状态与前端更新设置互相覆盖。
- 前端 Provider 也维护串行持久化队列；连续切换主题、按钮尺寸或字号组合时保持写入顺序，最新设置立即驱动 UI。
- 最新写入失败时显示错误并重新读取已持久化设置，避免界面长期停留在未保存状态。

## 接入方式

React 组件通过 `useSettings` 读取和更新设置。所有配置项取消独立保存按钮，菜单、主题、强调色、密度、按钮尺寸、字号组合、通知和窗口行为在控件变化时立即更新并自动持久化。主题和强调色使用共享 `RadioGroup`，默认按钮尺寸使用三枚带 `sm/md/lg` 尺寸的共享 `Button`，字号组合使用共享 `RadioGroup` 并显示标题、正文、辅助说明的实时预览，布尔设置使用共享 `Switch`，下拉选项使用共享 `Select`；主题与字号分段选择器使用 28px 选项高度，连同字号预览和按钮尺寸选择器限制为最大 300px 宽，窄容器下自动收缩；按钮尺寸选择器固定 36px 容器高度，保留 sm/md/lg 真实尺寸预览，切换时不引发布局跳动。设置页不直接渲染原生交互控件。Go 模块通过 `SettingsService` 获取当前快照，不直接读写 JSON 文件。

左侧菜单使用 `menuConfig.ts` 作为渲染、偏好选项和显隐读取的共同配置。`menuVisibility` 只保存用户按唯一 key 做出的覆盖值；未保存的 key 使用配置中的 `defaultVisible`。当前 `dn-system` 和 `devtools` 默认隐藏，独立的 `quick-notes`、`calendar`、`tasks` 和 `site-messages` 默认显示，`settings` 始终显示且不提供关闭开关。隐藏当前入口后，React Router 导航守卫会替换为第一个可见路由。进程工具在 Windows 操作 DN、macOS 测试 Firefox，提供可配置全局快捷键 F1–F12 或 Ctrl+Shift+F4（默认 F4，需显式启用），Windows 可切换 Raw Input 游戏兼容模式，详见[全局快捷键](shortcut.md)，进程页提供始终置顶小窗入口；`AppSettings.dragonNest` 持久化全局启用状态、游戏兼容模式、键位和成功终止后的 `targetPath`，以及扫描记忆或弹窗配置的 `launcherPath`（Windows DNLauncher.exe / macOS Firefox 可执行文件）；后者为 v11 的可选新增字段，未配置时保持空值，不重置快捷键。两个路径由后端进程用例维护并广播设置事件，普通偏好更新保留后端最新路径，避免旧窗口快照覆盖。实验室仅保留入口显隐开关，进入后固定显示文本工具与桌面实验室；桌面实验室不再提供独立配置，不读取或迁移历史独立开关。新增可配置菜单时补充同一配置项即可进入设置列表。

菜单排序通过 `MenuPreferences → SettingsProvider → settingsApi → Wails UpdateSettings → internal/application/settings.go → internal/settings.Service → Storage` 保存，返回结果与 `settings:changed` typed event 同步到各窗口；DTO 新增 `navigation.menuOrder` 后重新生成绑定，设置版本仍为 v11。未配置顺序直接使用默认配置，不增加历史迁移，也不恢复已删除的桌面实验室独立开关。

- 主导航、系统设置分别在各自组内排序，龙之谷子菜单在父级内排序，分组顺序固定。设置入口可排序但始终显示；隐藏菜单仍参与排序，恢复显示时保留位置。
- 拖动手柄超过 5px 后出现跟随指针的浮层，原行以虚线占位，列表在拖动期间保持原顺序；目标行上/下半区显示插入线。松开时重新命中检测，只有同组有效且实际改变位置才保存一次。跨组、原位、无效区域、Esc、指针取消或窗口失焦均不保存；临近滚动区域边缘自动滚动。拖动期间若收到不同顺序，则取消旧拖动，避免覆盖外部更新。
- 上下按钮及手柄的方向键可调整顺序，边界按钮禁用，屏幕阅读器播报位置；“恢复默认顺序”只清空排序，不修改显隐或其他偏好。所有操作沿用串行保存和错误回读。
- 按钮聚焦使用 `preventScroll`，顺序提交前记录滚动祖先的位置，在提交布局阶段恢复，并关闭菜单区滚动锚定；排序不主动滚动到被移动条目。
- `getOrderedMenuGroups` 为设置、侧栏与折叠浮层统一计算顺序；启动和隐藏当前页面后的回退按排序选取第一个可见入口，排序本身不切换当前页面，龙之谷父入口仍默认打开周常。
- 松开后的菜单位移使用 220ms 动画，拖动项从浮层位置落到新位置；页签切换使用 180ms 淡入。`prefers-reduced-motion` 下关闭过渡，保留指针跟随与明确的插入提示。

设置顶部页签按“概览 / 外观 / 菜单 / 通知 / 窗口”排序。页头只保留紧凑“设置”标题和必要操作，移除装饰性英文与重复的“概览”内容标题。概览显示应用名称、版本、平台和运行状态；版本号只在此展示，更新区显示“已是最新版”或目标新版本，不重复当前版本。

“诊断详情”首次默认收起，展开后显示启动时间、第二实例、Go 版本、日志文件、检查时间和构建类型，以及复制摘要、打开日志入口。展开按钮采用共享 Button 和 aria-expanded/aria-controls，隐藏时内容不能聚焦；会话内记住展开状态，reduced motion 下关闭箭头转动过渡。打开日志不依赖运行快照成功获取，失败仍可打开诊断详情并查看日志。

“服务状态”固定展示账号、系统通知、任务、笔记、龙之谷、日志六项检查，异常通过颜色和标签提示，不重新排序；移除外观、窗口、通知三项重复配置摘要。右侧状态标签有目标时由共享 Button 包裹 Badge：系统通知进入通知页签，账号进入个人信息页，龙之谷进入进程页（菜单隐藏时进入菜单设置）；其余保持只读。更新检查仍包含在诊断摘要中，更新操作位于底部独立区域。

`App.tsx → SettingsPanel → RuntimeStatusPanel → useRuntimeStatus → shared/diagnostics → Wails GetRuntimeStatus → internal/application/runtime_status.go`：检查仍是现有只读业务与平台能力，未修改后端 DTO 或健康判定。成功快照从请求完成时起缓存 60 秒；有效期内再次进入直接复用，过期后展示旧快照并后台检查，手动刷新始终绕过有效期，重叠请求复用。失败保留旧快照和错误，下次进入立即重试，不用有效期遮蔽错误；无定时轮询或磁盘缓存。

首次加载使用共享 Skeleton 显示字段值和六项服务的描述占位，服务标签标记为“待获取”，不伪造正常状态。快照、加载状态、错误原子更新，卸载只解除订阅，进行中的请求仍可更新会话缓存。更新状态由根级 AppUpdateProvider 管理，切换分类不影响下载。

`useSettingsViewState` 在实际滚动祖先上记录每个分类的 scrollTop，切换分类前保存当前位置；重新进入设置恢复上次分类，在布局阶段恢复该分类位置，卸载解除滚动监听。首次访问分类从顶部开始；从服务卡跳转偏好明确从顶部显示并以 preventScroll 聚焦页签。会话状态只在内存保留，重启后回到概览，不影响其他页面或持久化设置。

偏好页签的恢复操作明确命名为“恢复全部默认设置”，确认文案列明外观、菜单、通知、窗口、龙之谷快捷键与路径都将恢复，业务数据不会删除；仍调用现有 ResetSettings，不改为局部重置。

## 响应式处理

- 概览品牌、运行状态及操作区允许换行，版本与平台保留两列槽位；诊断详情在 620px 以下双列、360px 以下单列，字段溢出省略并通过 title 提供完整文本，错误信息可换行。

- 页签保持单行，空间不足时先隐藏说明和编号，极窄宽度允许页签条内部横向滚动，不造成整页横向滚动；页签使用固定 `md` 按钮和 Base UI 的键盘导航及面板关联。
- 设置页以自身内容宽度作为 Container Query 条件，侧边栏展开或收起时都能正确切换布局。
- 设置使用局部紧凑页头，操作自动换行；设置网格在 700px 以下由双列变为单列。
- 页头展示“修改自动保存/正在同步”状态；恢复默认按钮在极窄宽度下改为全宽。
- 恢复默认操作不固定尺寸，跟随用户配置的默认按钮尺寸。
- 主题分段、强调色、下拉框、滑块和开关行不得超出卡片；说明文字允许换行。
- “左侧菜单”采用与侧栏顺序一致的分组单列列表；基于 `menu-preferences` 容器在 420px 以下收紧内边距与子菜单缩进，操作区允许换行，长说明可折行，不增加横向滚动。
- 菜单卡片仅展示入口显隐开关；长文本可换行，开关不压缩，通知和窗口设置仍使用原有行布局。

成功保存或重置后，门面发送 `settings:changed` typed event（payload 为 `AppSettings`），各窗口的 SettingsProvider 通过功能 API 订阅同步偏好，并在卸载时解除订阅。

## 验证

```bash
go test ./internal/settings
cd frontend && pnpm build
```

诊断详情使用 260ms 网格高度与间距过渡、内容淡入/位移及箭头旋转，快速切换从当前进度反向衔接；收起后通过 `inert` 与 `aria-hidden` 禁止隐藏控件参与焦点导航，减少动态效果时立即切换，展开状态继续保存在当前会话。
