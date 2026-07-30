# 应用内反馈模块

## 模块目标

统一提供非阻塞 Toast 和需要用户确认的对话交互，避免业务组件自行实现提示队列和确认窗口。

## 目录与职责

- `frontend/src/shared/feedback/FeedbackProvider.tsx`：Toast 队列、自动关闭和确认 Promise。
- `frontend/src/shared/feedback/FeedbackProvider.css`：提示状态和确认按钮样式。
- `frontend/src/main.tsx`：在 Overlay Provider 内注册 Feedback Provider。

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
业务组件 → useFeedback.notify → Toast 队列 → 自动或手动关闭
业务组件 → useFeedback.confirm → Overlay Manager → Promise<boolean>
```

## 边界

- API 和 Hook 层不得吞掉原始错误；Feedback 只负责用户可见提示。
- 确认窗口默认不可通过遮罩或 Escape 关闭，确保 Promise 获得明确结果。
- Provider 卸载时会清理全部定时器。
- 原生系统对话框属于 Native Kit，不由本模块替代。

## 验证

```bash
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```
