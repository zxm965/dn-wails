# 设置中心模块

## 模块目标

提供类型化、可验证、可持久化的应用设置，并协调主题、通知和窗口模块实时应用设置。

## 目录与职责

- `internal/settings/model.go`：设置结构、枚举常量和默认值。
- `internal/settings/service.go`：读取、校验、保存、重置和窗口边界更新。
- `internal/application/settings.go`：Wails 设置绑定门面。
- `frontend/src/features/settings/api/`：生成类型转换和 API 封装。
- `frontend/src/features/settings/context/`：全局设置状态。
- `frontend/src/features/settings/components/SettingsPanel.tsx`：设置界面。
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
└── window
    ├── closeBehavior
    ├── alwaysOnTop
    ├── rememberBounds
    └── bounds
```

## 核心链路

```text
OnStartup → Settings.Initialize → Storage.Load
React SettingsProvider → GetSettings
用户修改任一控件 → 乐观更新全局状态 → 串行 UpdateSettings → 校验 → Storage.Save
  ├── ThemeProvider 应用外观
  ├── AppButton 应用默认按钮尺寸
  ├── Notification 使用新策略
  └── WindowManager 应用置顶设置
```

## 校验规则

- 当前设置版本为 v2；读取 v1 设置时自动补充 `buttonSize: "md"`、升级版本并重新持久化。
- 主题、强调色、密度、默认按钮尺寸和关闭行为必须属于允许值。
- 默认按钮尺寸只允许 `sm`、`md`、`lg`，默认值为 `md`。
- 字体缩放范围为 `0.85` 到 `1.25`。
- 保存的窗口尺寸不得低于应用最小尺寸。
- 返回设置时会复制指针字段，避免调用方修改内部状态。
- Go 写入操作串行化，避免关闭保存窗口状态与前端更新设置互相覆盖。
- 前端 Provider 也维护串行持久化队列；连续切换主题、按钮尺寸或滑块时保持写入顺序，最新设置立即驱动 UI。
- 最新写入失败时显示错误并重新读取已持久化设置，避免界面长期停留在未保存状态。

## 接入方式

React 组件通过 `useSettings` 读取和更新设置。所有配置项取消独立保存按钮，主题、强调色、密度、按钮尺寸、文字缩放、通知和窗口行为在控件变化时立即更新并自动持久化。Go 模块通过 `SettingsService` 获取当前快照，不直接读写 JSON 文件。

## 响应式处理

- 设置页以自身内容宽度作为 Container Query 条件，侧边栏展开或收起时都能正确切换布局。
- 内容宽度不足 700px 时，页头操作移到标题下方，设置网格由双列变为单列。
- 页头展示“修改自动保存/正在同步”状态；恢复默认按钮在极窄宽度下改为全宽。
- 恢复默认操作不固定尺寸，跟随用户配置的默认按钮尺寸。
- 主题分段、强调色、下拉框、滑块和开关行不得超出卡片；说明文字允许换行。

## 验证

```bash
go test ./internal/settings
cd frontend && pnpm build
```
