# 主题与外观模块

## 模块目标

提供跟随系统、浅色和深色主题，以及强调色、界面密度、默认按钮尺寸和全局默认字号组合配置。

## 目录与职责

- `internal/settings/model.go`：外观设置持久化模型和允许值。
- `frontend/src/features/settings/context/SettingsProvider.tsx`：计算有效主题并同步 DOM，外观状态不再使用独立 Provider。
- `frontend/src/app/styles/global.css.ts`：通过 vanilla-extract 全局 API 维护字体、重置、主题变量和强调色变量。
- `frontend/src/features/settings/components/SettingsPanel.tsx`：外观设置界面。

## 配置契约

```ts
interface AppearanceSettings {
  themeMode: 'system' | 'light' | 'dark'
  accent: 'green' | 'blue' | 'purple' | 'orange'
  density: 'comfortable' | 'compact'
  buttonSize: 'sm' | 'md' | 'lg'
  fontSizePreset: 'sm' | 'md' | 'lg'
}
```

字号组合默认为 `md`，默认按钮尺寸也为 `md`。字号组合使用共享语义令牌，不再通过修改根字号间接缩放固定 px 文本。

| 组合 | 正文/控件 | 辅助说明 | 区块标题 |
| --- | --- | --- | --- |
| 小号 `sm` | 12px | 11px | 16px |
| 标准 `md` | 14px | 12px | 18px |
| 大号 `lg` | 16px | 14px | 20px |

小标签、次标题也有对应令牌；大型展示数字和响应式标题保留自身层级，在原字号基础上按组合偏移 -2/0/+2px。

## 界面密度

沿用 `appearance.density` 和现有自动保存、跨窗口事件链路，不增加配置字段。`html[data-density]` 设置 `--layout-spacing`：舒适为 1（保留原布局），紧凑为 0.75。页面与面板基础留白通过 `--page-padding-*`、`--panel-padding` 消费该比例；业务卡片、列表和布局间距显式使用 `calc(原间距 * var(--layout-spacing))`。

- 页面外边距、区块间距、卡片内边距、表单列间距与弹窗内容留白同步收紧，例如 24px → 18px、16px → 12px。
- 设置开关行、菜单排序行、任务行、DN 表格和消息行通过减少上下内边距降低行高，保留文字自然高度与换行；笔记列表和侧栏按钮保留按钮高度，仅减少行间距。
- 覆盖设置概览、任务、笔记、日历、DN、实验室、站内消息、系统通知页面和共享 Card / PageHeader / Dialog / PageTabs。
- 字号、文字行高、按钮高度、图标大小、标题栏、关闭按钮避让区域与点击目标不随密度缩放；主题与字号选择器继续保持 28px 高度。日历网格和编辑区保留自身可用空间约束。
- 紧凑模式同时作用于容器查询内的小窗口间距，不增加固定布局高度；不引入布局缩放动画，reduced motion 行为保持原样。

## 核心链路

```text
SettingsProvider 读取设置
  → 计算系统/显式主题
  → 设置 html[data-theme/data-accent/data-density/data-button-size/data-font-size]
  → global.css.ts 根据 shared/theme/typography.ts 应用 --font-size-* 令牌
  → 页面、卡片与列表读取 --layout-spacing
  → Button 读取默认高度变量
```

系统主题变化通过 `matchMedia('(prefers-color-scheme: dark)')` 监听，并在组件卸载时解除订阅。

## 样式约定

- 字号统一使用 `--font-size-body/secondary/caption/micro/subtitle/title`；响应式大标题通过 `--font-size-heading-offset` 调整，禁止新增固定 px 字号。`fontSize: 0`（隐藏文本）与相对 `em` 继承保留。
- 新组件必须优先使用 `--text-*`、`--surface-*`、`--border-*`、`--accent` 等语义变量。
- 不得在业务组件中重复维护浅色和深色两套硬编码颜色。
- 强调色只用于交互和状态重点，不替代错误、警告和成功语义色。
- reduced motion 继续由各组件自己的媒体查询处理。

## 即时应用

- `SettingsProvider` 在调用 Go 保存前先更新内存快照，因此主题、强调色、密度、按钮尺寸和全局默认字号组合会在控件变化的同一轮渲染中生效。
- 持久化请求按顺序执行；最新请求失败时重新读取后端快照并展示错误。
- DN 工作区和通用 UI 组件只消费 `--text-*`、`--surface-*`、`--border-*`、`--accent` 等主题令牌，不维护独立主题开关。

## 边界

- 全局组合覆盖应用内菜单、页面、输入框、按钮、弹窗、Markdown 预览和独立进程窗口，图标与按钮高度不随字号改变；系统原生通知、菜单与文件对话框由系统控制。
- 持久化链路为外观 RadioGroup → SettingsProvider → settingsApi → Wails 生成绑定 → application.App.UpdateSettings → settings.Service → Storage；设置事件同步所有窗口，失败沿用错误提示及回读。
- v11 缺少 `fontSizePreset` 时使用标准组合，不映射旧 `fontScale` 数值；其他偏好原样保留，旧字段在下一次保存时移除。非空非法组合拒绝读取/保存。

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

后端运行 `go test ./...`，覆盖组合持久化、重置、非法值拒绝与缺省字段保留其他偏好；人工在常规桌面、1024 × 768 和极窄内容宽度下检查三套组合、弹窗、长文本及键盘焦点。

密度验收：在舒适/紧凑与小/标准/大字号组合下，检查常规桌面、1024 × 768、极窄内容宽度的设置列表、任务行、DN 表格、笔记列表和弹窗；确认留白减少、长文本可换行、焦点可见且关闭按钮不遮挡标题。
