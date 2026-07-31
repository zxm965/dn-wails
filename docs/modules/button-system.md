# 按钮尺寸系统

## 模块目标

统一应用内按钮的尺寸类型和基础 DOM 实现，避免各页面自行声明按钮高度。

## 目录与职责

- `frontend/src/shared/components/ui/Button.tsx`：类型化按钮组件和原生 button 属性透传。
- `frontend/src/shared/components/ui/Button.css.ts`：按钮高度令牌、局部样式、尺寸选择器和波纹关键帧。
- `frontend/src/shared/components/ui/index.ts`：公共导出入口。
- `frontend/src/features/settings/`：持久化并配置普通操作按钮的默认尺寸。
- `frontend/src/shared/theme/ThemeProvider.tsx`：将默认尺寸同步到 `html[data-button-size]`。

## 尺寸契约

```ts
type ButtonSize = 'sm' | 'md' | 'lg'
```

| 尺寸 | 高度 | 使用场景 |
| ---- | ---- | -------- |
| `sm` | 28px | Toast、Dialog 等紧凑图标按钮 |
| `md` | 32px | 默认值、分类切换和标准操作 |
| `lg` | 36px | 侧栏导航、窗口控制等结构性按钮 |

`size` 是可选属性。省略时读取偏好设置中的默认尺寸；显式传入时只允许上述三个值，并覆盖用户默认值。

## 接入方式

```tsx
import { Button } from '@/shared/components/ui'

<Button type='submit'>
  保存资料
</Button>
```

- 业务模块不得直接渲染原生 `<button>`，统一使用 `Button`。
- 普通页面操作、提交和确认按钮省略 `size`，跟随用户偏好；只有尺寸具有固定结构或交互语义时才显式传入。
- 侧栏和标题栏按钮固定为 `lg`，分类切换固定为 `md`，Toast 和 Overlay 紧凑关闭按钮固定为 `sm`。
- 模块样式只控制按钮宽度、颜色、边框、内边距和布局，不重复声明高度。
- 图标按钮仍必须提供 `aria-label`。
- `Button` 提供 `primary`、`secondary`、`outline`、`ghost`、`danger` 视觉变体和 reduced-motion 兼容的点击波纹。
- Base UI 的 Trigger、Close 等组合场景通过 `render={<Button />}` 复用同一底层按钮。
- 新增按钮视觉类型时优先扩展 variant，不新增高度档位。

## 验证

```bash
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```

响应式人工验证需确认偏好设置切换为 `sm`、`md`、`lg` 后，普通操作按钮分别为 28px、32px、36px，固定语义按钮不受影响，并且常规窗口和窄窗口下不会产生文字裁切或横向溢出。
