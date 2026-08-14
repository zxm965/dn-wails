# 设置中心模块

## 模块目标

提供类型化、可验证、可持久化的应用设置，并协调左侧菜单、主题、通知和窗口模块实时应用设置。

## 目录与职责

- `internal/settings/model.go`：设置结构、枚举常量和默认值。
- `internal/settings/service.go`：读取、校验、保存、重置和窗口边界更新。
- `internal/application/settings.go`：Wails 设置绑定门面。
- `frontend/src/features/settings/api/`：生成类型转换和 API 封装。
- `frontend/src/features/settings/context/`：全局设置状态。
- `frontend/src/features/settings/components/SettingsPanel.tsx`：设置界面。
- `frontend/src/shared/navigation/menuConfig.ts`：菜单唯一 key、结构、标题、图标、默认显隐和偏好说明的单一配置源；站内消息在这里作为独立菜单项配置。
- `frontend/src/shared/components/app-sidebar/`：通过“系统设置 → 偏好设置”进入设置页。

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
  ├── ThemeProvider 应用外观
  ├── Button 应用默认按钮尺寸
  ├── Notification 使用新策略
  ├── AppSidebar 按菜单唯一 key 过滤入口
  └── WindowManager 应用置顶设置
```

## 校验规则

- 当前设置版本为 v6，只接受当前最新版结构，不迁移或兼容旧版本设置。
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

React 组件通过 `useSettings` 读取和更新设置。所有配置项取消独立保存按钮，菜单、主题、强调色、密度、按钮尺寸、文字缩放、通知和窗口行为在控件变化时立即更新并自动持久化。主题、强调色和按钮尺寸使用共享 `RadioGroup`，文字缩放使用共享 `Slider`，布尔设置使用共享 `Switch`，下拉选项使用共享 `Select`；设置页不直接渲染原生交互控件。Go 模块通过 `SettingsService` 获取当前快照，不直接读写 JSON 文件。

左侧菜单使用 `menuConfig.ts` 作为渲染、偏好选项和显隐读取的共同配置。`menuVisibility` 只保存用户按唯一 key 做出的覆盖值；未保存的 key 使用配置中的 `defaultVisible`。当前 `dn-system` 和 `devtools` 默认隐藏，独立的 `site-messages` 默认显示，`settings` 始终显示且不提供关闭开关。DevTools 下的“桌面实验室”继续使用默认关闭的兼容 key `devtools-desktop`：父开关关闭时子开关以关闭状态禁用，父开关开启后可单独切换。新增可配置菜单或子偏好时补充同一配置项即可进入偏好设置列表。

应用更新检查位于设置页最底部的“应用更新”区块；DevTools 的应用概览只展示当前版本，不再提供手动更新入口。

## 响应式处理

- 设置页以自身内容宽度作为 Container Query 条件，侧边栏展开或收起时都能正确切换布局。
- 偏好设置复用共享 `PageHeader`；内容宽度不足 620px 时页头操作移到标题下方，设置网格在 700px 以下由双列变为单列。
- 页头展示“修改自动保存/正在同步”状态；恢复默认按钮在极窄宽度下改为全宽。
- 恢复默认操作不固定尺寸，跟随用户配置的默认按钮尺寸。
- 主题分段、强调色、下拉框、滑块和开关行不得超出卡片；说明文字允许换行。

## 验证

```bash
go test ./internal/settings
cd frontend && pnpm build
```
