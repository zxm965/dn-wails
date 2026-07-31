# 应用内反馈模块

## 模块目标

统一提供非阻塞 Toast 和需要用户确认的对话交互，避免业务组件自行实现提示队列和确认窗口。

## 目录与职责

- `frontend/src/shared/feedback/FeedbackProvider.tsx`：兼容既有 API，并组合通用 Sonner Toast 与 Base UI Alert Dialog。
- `frontend/src/shared/components/ui/Toaster.tsx`：主题化 Toast 容器。
- `frontend/src/shared/components/ui/AlertDialog.tsx`：可访问的确认对话框。
- `frontend/src/main.tsx`：在应用根部注册 Feedback Provider。

## API

```ts
const { notify, confirm, dismiss } = useFeedback()

notify({
  title: '保存成功',
  message: '设置已经生效。',
  tone: 'success',
})

const accepted = await confirm({
  title: '删除记录',
  message: '该操作无法撤销。',
  tone: 'danger',
})
```

Toast 支持 `info`、`success`、`warning`、`error`。`duration: 0` 表示不自动关闭。

## 核心链路

```text
业务组件 → useFeedback.notify → Sonner Toast → 自动或手动关闭
业务组件 → useFeedback.confirm → Base UI Alert Dialog → Promise<boolean>
```

## 边界

- API 和 Hook 层不得吞掉原始错误；Feedback 只负责用户可见提示。
- 确认窗口默认不可通过遮罩或 Escape 关闭，确保 Promise 获得明确结果。
- Provider 卸载时会结束未完成的确认 Promise。
- 原生系统对话框属于 Native Kit，不由本模块替代。
- 窄窗口下 Toast 使用左右安全间距并占满可用宽度；确认按钮在极窄宽度下改为纵向全宽布局。
- Toast 颜色、边框和背景读取应用主题变量；确认和取消操作使用 `Button` 并跟随用户配置的默认按钮尺寸。

## 验证

```bash
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```
