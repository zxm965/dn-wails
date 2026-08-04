# 通用 UI 组件

## 模块目标

将原 `dn-next` 的 Base UI、shadcn 风格组件能力迁移为桌面应用可复用的共享层，统一主题、按钮、焦点管理、弹层和反馈交互。

## 目录与职责

- `frontend/src/shared/components/ui/Button.tsx`、`Button.css.ts`：所有按钮的唯一底层实现、尺寸、变体和波纹。
- `frontend/src/shared/components/ui/Dialog.tsx`、`Dialog.css.ts`：Base UI Dialog 封装及其局部样式。
- `frontend/src/shared/components/ui/AlertDialog.tsx`、`AlertDialog.css.ts`：确认对话框及自身尺寸样式，复用 Dialog 基础样式。
- `frontend/src/shared/components/ui/FormControls.tsx`、`FormControls.css.ts`：Input、PasswordInput、Textarea、Label、Checkbox、Switch。
- `frontend/src/shared/components/ui/Select.tsx`、`Select.css.ts`：基于 Base UI 的类型化下拉选择，负责触发器、Portal 弹层、键盘导航、选中状态和滚动边界；原生表单控件文件不再渲染 `<select>`。
- `frontend/src/shared/components/ui/RadioGroup.tsx`、`RadioGroup.css.ts`：基于 Base UI 的类型化单选组，提供 segmented 和 chips 两种共享视觉形态。
- `frontend/src/shared/components/ui/Slider.tsx`、`Slider.css.ts`：基于 Base UI 的单值滑块，统一轨道、进度、拖拽点、键盘操作和焦点状态。
- `frontend/src/shared/components/ui/Card.tsx`、`Card.css.ts`：页面容器；Badge、Avatar、Progress、Tabs 也分别维护同名 `.css.ts`。
- `frontend/src/shared/components/ui/Layout.tsx`、`Layout.css.ts`：统一渐变页头 PageHeader、Pagination、ListState 和 Skeleton。
- `frontend/src/shared/components/ui/Spinner.tsx`、`Spinner.css.ts`：可复用的图标旋转状态和 reduced-motion 降级。
- `frontend/src/shared/components/ui/Toaster.tsx`：Sonner Toast 主题适配，无独立样式时不创建空样式文件。

## 依赖与组合

```text
ThemeProvider
  → CSS semantic tokens
  → shared/components/ui
      → Button
      → Base UI primitives
      → Sonner
  → existing features + dn-system
```

Base UI 的弹层和组合组件使用 `render={<Button />}`，避免业务模块直接创建原生按钮。`PasswordInput` 的显隐操作同样使用固定结构的 `Button`，按钮固定在输入框内部右侧。`#root` 使用 `isolation: isolate`，保证 Portal 弹层位于应用内容之上。

每个组件从同名 `.css.ts` 导入局部类。基础规则使用 `style`；跨局部类的后代/相邻关系和 Base UI 的 `data-*` 状态通过引用局部类的 `globalStyle` 表达，不允许重新引入全局语义类或集中式 `ui.css.ts`。

## 主题与响应式

- 所有组件读取 `--surface-*`、`--text-*`、`--border-*`、`--accent`、`--danger-*` 和全局间距变量。
- Select 触发器与 Input 使用同一控件高度和焦点样式；选项弹层通过 Portal 避免被卡片裁切，并在窄窗口下限制为可视区域宽高。
- RadioGroup、Slider、Checkbox 和 Switch 统一使用 Base UI 的受控状态与隐藏表单输入，业务模块不直接渲染原生 radio、range 或 checkbox。
- Dialog 在窄窗口下贴近底部并让操作按钮纵向全宽；内容区域独立滚动。
- PageHeader 统一主要视图的紧凑渐变背景、eyebrow、标题、说明和操作区，并在 Container Query 下自动切换为纵向布局。
- reduced motion 下关闭 Dialog、进度、Switch、Spinner 和 Skeleton 动画。

## 接入方式

```tsx
import { Card, Dialog, Input, PageHeader, PasswordInput, RadioGroup, Select, Slider } from '@/shared/components/ui'

<Select
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
