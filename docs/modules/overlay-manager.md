# Overlay Manager 模块

## 模块目标

提供稳定的应用内子视图能力，用于 Modal、确认窗口、详情面板和临时编辑器，替代当前 Wails v2 不稳定的原生多窗口方案。

## 目录与职责

- `frontend/src/shared/overlay/OverlayProvider.tsx`：维护 Overlay 栈和兼容 Context API，并组合通用 Dialog。
- `frontend/src/shared/components/ui/Dialog.tsx`：Base UI Dialog 的主题化实现。
- `frontend/src/shared/overlay/OverlayProvider.css`：仅保留 Overlay 内容兼容样式。
- `frontend/src/main.tsx`：在应用根部注册 Provider。

## API

```ts
const { openOverlay, closeOverlay, closeTopOverlay } = useOverlay()

openOverlay(
  ({ close }) => <Editor onDone={close} />,
  { title: '编辑', size: 'large', dismissible: true },
)
```

支持 `small`、`medium`、`large` 三种尺寸。

## 行为

- Overlay 按打开顺序进入堆栈。
- Escape、遮罩关闭、焦点捕获和焦点恢复由 Base UI Dialog 处理。
- 窄窗口下自动变为底部弹层布局。
- 移动尺寸下标题保持单行省略，内容区独立滚动并缩小内边距，避免超出可视高度。
- Overlay 关闭按钮使用 `AppButton size="sm"`，内容区业务操作由调用方按语义选择尺寸。
- reduced motion 环境下停用进入与退出动画。

## 边界

- 不提供独立任务栏入口、跨屏拖动或操作系统窗口句柄。
- 复杂表单应自行处理未保存状态，并通过 `dismissible: false` 阻止意外关闭。
- Overlay 内容不能直接修改 Overlay 栈，只通过传入的 `close` 或 Context API 操作。

## 验证

```bash
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```
