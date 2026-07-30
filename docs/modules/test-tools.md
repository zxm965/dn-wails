# 测试工具模块

## 模块目标

集中承载通用桌面模块的人工验证入口，避免测试按钮混入应用概览、设置或正式业务页面。

## 目录与职责

- `frontend/src/features/test-tools/components/TestToolsPanel.tsx`：测试分类、操作执行和结果展示。
- `frontend/src/features/test-tools/components/TestToolsPanel.css`：分类菜单、操作网格和拖放区域。
- `frontend/src/features/system-notification/components/SystemNotificationPanel.tsx`：以 embedded 模式嵌入通知测试。
- `frontend/src/app/App.tsx`：将测试工具放入“系统设置”分组。

## 测试分类

### 交互与窗口

- Toast
- 确认对话框
- Overlay 子视图
- 窗口居中
- 窗口状态读取
- 第二实例唤醒提示

### 原生能力

- 剪贴板读取与写入
- 文件和目录选择
- 屏幕信息
- 原生消息对话框
- 日志目录
- 外部浏览器
- 文件拖放

### 系统通知

- 通知能力和权限状态
- 应用通知策略
- 消息发送和预览
- 点击通知唤醒与会话回传

## 行为约定

- 测试操作的结果统一显示在测试工具页，不影响正式业务状态。
- 需要用户主动触发的系统操作不得在页面加载时自动执行。
- 文件、剪贴板、窗口和通知等真实原生能力需要在 Wails 桌面运行环境中验证。
- 新增通用模块的人工验证入口时，优先放入本模块现有分类；确有必要时再增加分类。
- 测试工具不是生产业务 API，业务组件仍应直接使用对应模块的正式封装。

## 验证

```bash
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```

实际原生交互验证需要用户明确允许运行桌面应用。
