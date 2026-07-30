# 主题与外观模块

## 模块目标

提供跟随系统、浅色和深色主题，以及强调色、界面密度、默认按钮尺寸和字体缩放配置。

## 目录与职责

- `internal/settings/model.go`：外观设置持久化模型和允许值。
- `frontend/src/shared/theme/ThemeProvider.tsx`：计算有效主题并同步 DOM 和窗口主题。
- `frontend/src/app/styles/global.css`：主题 CSS 变量和强调色变量。
- `frontend/src/features/settings/components/SettingsPanel.tsx`：外观设置界面。

## 配置契约

```ts
interface AppearanceSettings {
  themeMode: 'system' | 'light' | 'dark'
  accent: 'green' | 'blue' | 'purple' | 'orange'
  density: 'comfortable' | 'compact'
  buttonSize: 'sm' | 'md' | 'lg'
  fontScale: number
}
```

字体缩放允许范围为 `0.85` 到 `1.25`；默认按钮尺寸为 `md`。

## 核心链路

```text
SettingsProvider 读取设置
  → ThemeProvider 计算系统/显式主题
  → 设置 html[data-theme/data-accent/data-density/data-button-size]
  → 更新 --font-scale
  → AppButton 读取默认高度变量
  → 同步 Wails Windows 窗口主题
```

系统主题变化通过 `matchMedia('(prefers-color-scheme: dark)')` 监听，并在组件卸载时解除订阅。

## 样式约定

- 新组件必须优先使用 `--text-*`、`--surface-*`、`--border-*`、`--accent` 等语义变量。
- 不得在业务组件中重复维护浅色和深色两套硬编码颜色。
- 强调色只用于交互和状态重点，不替代错误、警告和成功语义色。
- reduced motion 继续由各组件自己的媒体查询处理。

## 边界

- macOS 和 Linux 的原生窗口外观主要由系统控制；WebView 内容主题始终由 CSS 变量控制。
- 设置保存成功后才更新全局 Provider 状态，保存失败不会产生假持久化状态。

## 验证

```bash
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```

跟随系统和原生标题栏外观需要人工桌面验证。
