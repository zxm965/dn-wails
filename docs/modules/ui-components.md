# 通用 UI 组件

## 模块目标

将原 `dn-next` 的 Base UI、shadcn 风格组件能力迁移为桌面应用可复用的共享层，统一主题、按钮、焦点管理、弹层和反馈交互。

## 目录与职责

- `frontend/src/shared/components/button/`：所有按钮的唯一底层实现、尺寸、变体和波纹。
- `frontend/src/shared/components/ui/Dialog.tsx`：Base UI Dialog 封装。
- `frontend/src/shared/components/ui/AlertDialog.tsx`：确认与危险操作对话框。
- `frontend/src/shared/components/ui/FormControls.tsx`：Input、PasswordInput、Textarea、Select、Label、Checkbox、Switch。
- `frontend/src/shared/components/ui/Card.tsx`、`Badge.tsx`：页面容器和状态标签。
- `frontend/src/shared/components/ui/Progress.tsx`、`Tabs.tsx`、`Avatar.tsx`：进度、页签和头像。
- `frontend/src/shared/components/ui/Layout.tsx`：PageHeader、Pagination、ListState 和 Skeleton。
- `frontend/src/shared/components/ui/Toaster.tsx`：Sonner Toast 主题适配。
- `frontend/src/shared/components/ui/ui.css`：只使用应用语义主题令牌的普通 CSS。

## 依赖与组合

```text
ThemeProvider
  → CSS semantic tokens
  → shared/components/ui
      → AppButton
      → Base UI primitives
      → Sonner
  → existing features + dn-system
```

Base UI 的弹层和组合组件使用 `render={<AppButton />}`，避免业务模块直接创建原生按钮。`PasswordInput` 的显隐操作同样使用固定结构的 `AppButton`。`#root` 使用 `isolation: isolate`，保证 Portal 弹层位于应用内容之上。

## 主题与响应式

- 所有组件读取 `--surface-*`、`--text-*`、`--border-*`、`--accent`、`--danger-*` 和全局间距变量。
- Dialog 在窄窗口下贴近底部并让操作按钮纵向全宽；内容区域独立滚动。
- PageHeader、Pagination、表单和列表状态可在 Container Query 下自动收窄。
- reduced motion 下关闭 Dialog、进度、Switch、Spinner 和 Skeleton 动画。

## 接入方式

```tsx
import { Card, Dialog, Input, PageHeader, PasswordInput } from '@/shared/components/ui'
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
