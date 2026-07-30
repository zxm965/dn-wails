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
用户保存 → UpdateSettings → 校验 → Storage.Save
  ├── ThemeProvider 应用外观
  ├── Notification 使用新策略
  └── WindowManager 应用置顶设置
```

## 校验规则

- 设置版本必须为当前版本。
- 主题、强调色、密度和关闭行为必须属于允许值。
- 字体缩放范围为 `0.85` 到 `1.25`。
- 保存的窗口尺寸不得低于应用最小尺寸。
- 返回设置时会复制指针字段，避免调用方修改内部状态。
- 写入操作串行化，避免关闭保存窗口状态与前端更新设置互相覆盖。

## 接入方式

React 组件通过 `useSettings` 读取和更新设置。Go 模块通过 `SettingsService` 获取当前快照，不直接读写 JSON 文件。

## 验证

```bash
go test ./internal/settings
cd frontend && pnpm build
```
