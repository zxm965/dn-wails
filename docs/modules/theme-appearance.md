# 主题与外观模块

## 模块目标

提供跟随系统、浅色和深色主题，以及强调色、界面密度、默认按钮尺寸和字体缩放配置。

## 目录与职责

- `internal/settings/model.go`：外观设置持久化模型和允许值。
- `frontend/src/shared/theme/ThemeProvider.tsx`：计算有效主题并同步 DOM。
- `frontend/src/app/styles/global.css.ts`：通过 vanilla-extract 全局 API 维护字体、重置、主题变量和强调色变量。
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
  → Button 读取默认高度变量
```

系统主题变化通过 `matchMedia('(prefers-color-scheme: dark)')` 监听，并在组件卸载时解除订阅。

## 样式约定

- 新组件必须优先使用 `--text-*`、`--surface-*`、`--border-*`、`--accent` 等语义变量。
- 不得在业务组件中重复维护浅色和深色两套硬编码颜色。
- 强调色只用于交互和状态重点，不替代错误、警告和成功语义色。
- reduced motion 继续由各组件自己的媒体查询处理。

## 即时应用

- `SettingsProvider` 在调用 Go 保存前先更新内存快照，因此主题、强调色、密度、按钮尺寸和字体缩放会在控件变化的同一轮渲染中生效。
- 持久化请求按顺序执行；最新请求失败时重新读取后端快照并展示错误。
- DN 工作区和通用 UI 组件只消费 `--text-*`、`--surface-*`、`--border-*`、`--accent` 等主题令牌，不维护独立主题开关。

## 边界

- Wails v3 当前没有 v2 动态窗口主题方法的直接等价能力；本模块只负责 React/WebView 内容主题，原生窗口外观由操作系统控制。
- 主题会先乐观应用；若最新持久化请求失败，Provider 会恢复为实际保存值。

## 验证

```bash
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```

跟随系统主题需要人工桌面验证；原生窗口主题同步不再属于本模块能力。
