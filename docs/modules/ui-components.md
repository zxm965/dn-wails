# 通用 UI 组件

## 模块目标

将原 `dn-next` 的 Base UI、shadcn 风格组件能力迁移为桌面应用可复用的共享层，统一主题、按钮、焦点管理、弹层和反馈交互。

## 目录与职责

- `frontend/src/shared/components/ui/Button.tsx`、`Button.css.ts`：所有按钮的唯一底层实现、尺寸、变体和波纹。
- `frontend/src/shared/components/ui/Dialog.tsx`、`Dialog.css.ts`：Base UI Dialog 封装及其局部样式。
- `frontend/src/shared/components/ui/AlertDialog.tsx`、`AlertDialog.css.ts`：确认对话框及自身尺寸样式，复用 Dialog 基础样式。
- `frontend/src/shared/components/ui/FormControls.tsx`、`FormControls.css.ts`：Input、PasswordInput、Textarea、Label、Checkbox、Switch；单行输入控件支持与 Button 一致的 `sm/md/lg` 尺寸。
- `frontend/src/shared/components/ui/Select.tsx`、`Select.css.ts`：基于 Base UI 的类型化下拉选择，负责触发器、Portal 弹层、键盘导航、选中状态和滚动边界；原生表单控件文件不再渲染 `<select>`。
- `frontend/src/shared/components/ui/RadioGroup.tsx`、`RadioGroup.css.ts`：基于 Base UI 的类型化单选组，提供 segmented 和 chips 两种共享视觉形态；分段选项高度可通过局部 `--radio-segment-height` 覆盖，默认仍跟随界面密度。
- `frontend/src/shared/components/ui/Slider.tsx`、`Slider.css.ts`：基于 Base UI 的单值滑块，统一轨道、进度、拖拽点、键盘操作和焦点状态。
- `frontend/src/shared/components/ui/Card.tsx`、`Card.css.ts`：页面容器；Badge、Avatar、Progress、Tabs 也分别维护同名 `.css.ts`。
- `frontend/src/shared/components/ui/PageTabs.tsx`、`PageTabs.css.ts`：设置与实验室共用的单行吸顶页签，基于 Base UI Tabs 管理选中、焦点、方向键和面板关联，触发器通过 `render` 使用共享 `Button`；空间不足时局部滚动，内容切换提供 180ms 轻微位移与淡入，reduced motion 下关闭。
- `frontend/src/shared/components/ui/Layout.tsx`、`Layout.css.ts`：统一渐变页头 PageHeader、Pagination、ListState 和 Skeleton。
- `frontend/src/shared/components/ui/Spinner.tsx`、`Spinner.css.ts`：可复用的图标旋转状态和 reduced-motion 降级。
- `frontend/src/shared/components/ui/Toaster.tsx`：Sonner Toast 主题适配，无独立样式时不创建空样式文件。

## 依赖与组合

```text
SettingsProvider
  → CSS semantic tokens
  → shared/components/ui
      → Button
      → Base UI primitives
      → Sonner
  → existing features + dn-system
```

全局 Toast 和确认框由 `InteractionProvider` 统一挂载，通过 `useFeedback` 访问；业务表单与详情直接组合受控 `Dialog`，由组件管理打开状态。

Base UI 的弹层和组合组件使用 `render={<Button />}`，避免业务模块直接创建原生按钮。`PasswordInput` 的显隐操作同样使用固定结构的 `Button`，按钮固定在输入框内部右侧。`#root` 使用 `isolation: isolate`，保证 Portal 弹层位于应用内容之上。

每个组件从同名 `.css.ts` 导入局部类。基础规则使用 `style`；跨局部类的后代/相邻关系和 Base UI 的 `data-*` 状态通过引用局部类的 `globalStyle` 表达，不允许重新引入全局语义类或集中式 `ui.css.ts`。

## 主题与响应式

- 所有组件读取 `--surface-*`、`--text-*`、`--border-*`、`--accent`、`--danger-*` 和全局间距变量。
- Select 触发器、Input 和 PasswordInput 使用与 Button 一致的默认高度，也支持显式 `sm/md/lg` 尺寸；Textarea 保持多行输入的最小高度。选项弹层通过 Portal 避免被卡片裁切，并在窄窗口下限制为可视区域宽高；长列表直接通过滚轮、触控板或键盘滚动，不渲染额外的上下滚动按钮。
- RadioGroup、Slider、Checkbox 和 Switch 统一使用 Base UI 的受控状态与隐藏表单输入，业务模块不直接渲染原生 radio、range 或 checkbox。
- Dialog 在窄窗口下贴近底部并让操作按钮纵向全宽；内容区域独立滚动。
- PageHeader 统一主要视图的紧凑渐变背景、eyebrow、标题、说明和操作区，并在 Container Query 下自动切换为纵向布局。
- reduced motion 下关闭 Dialog、进度、Switch、Spinner 和 Skeleton 动画。

## 接入方式

```tsx
import { Card, Dialog, Input, PageHeader, PasswordInput, RadioGroup, Select, Slider } from '@/shared/components/ui'

<Select
  size='sm'
  value={status}
  options={[
    { value: 'all', label: '全部' },
    { value: 'active', label: '启用' },
  ]}
  onValueChange={setStatus}
/>
```

业务模块不得从其他 feature 引用 UI，也不得复制 Dialog、Toast、分页或空状态实现。

## 验证

```bash
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```

Dialog 焦点返回、Escape、遮罩关闭和极窄窗口布局需要人工桌面验证。

## 全局字号组合

共享控件字号消费 `--font-size-*` 语义令牌，由外观设置的 `fontSizePreset` 统一驱动；按钮高度仍按 sm/md/lg 的 28/32/36px 和默认尺寸设置控制。新增组件避免固定 px 字号，详见[主题与外观](theme-appearance.md)。

## 布局密度

Card 的面板内边距与 PageHeader、PageTabs 内容、Dialog 正文和操作区的布局间距跟随 `--layout-spacing`（舒适 1、紧凑 0.75）。Dialog 标题右侧仍预留 52px 关闭按钮空间。字号和按钮尺寸保持独立配置，列表通过内边距与间距收紧，不压缩文字行高或操作控件。

## 异步列表反馈与会话 Hook

- `QueryFeedback.tsx` / `.css.ts`：首次加载骨架屏、保留旧数据时的刷新提示、独立错误与重试按钮；空状态仍由业务页面按成功结果决定。加载骨架提供 `table`、`cards`、`list` 三种结构：角色使用表格短线、周常使用卡片轮廓、消息使用图标与标题/摘要短线，避免整行灰色大块；使用低对比度整体呼吸动画，reduced motion 下静止，窄容器自适应。
- `shared/hooks/useRequestGuard.ts`：生成请求有效性判定，后发请求或组件卸载使旧请求失效，不取消后端操作。
- `shared/hooks/useSessionState.ts`：WebView 内存中的视图状态，业务调用方为私有偏好提供包含账号 ID 的 key，并在账号切换时重新挂载。
- `shared/hooks/useSessionScroll.ts`：内容就绪后恢复滚动位置，滚动监听在卸载时解除；调用方为各账号、列表提供独立 key。
- 回归检查：`node --test frontend/tests/*.test.mjs`（Node.js 24+）。
