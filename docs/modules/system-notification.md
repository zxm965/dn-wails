# 系统通知模块

## 模块目标

将业务消息转换为跨平台原生通知，支持权限检测、隐私预览、免打扰和点击通知后恢复会话。

## 目录与职责

- `internal/notification/service.go`：消息校验、通知策略、正文摘要和点击响应。
- `internal/platform/notification/wails.go`：Wails v3 notifications Service 适配。
- `internal/application/notification.go`：Wails 绑定门面和设置策略映射。
- `frontend/src/features/system-notification/api/`：前端 API 适配。
- `frontend/src/features/system-notification/hooks/`：权限状态、发送和点击事件订阅。
- `frontend/src/features/system-notification/components/`：可嵌入 DevTools 页的通知测试与预览界面。
- `frontend/src/shared/components/ui/`：通知状态、短表单和发送操作使用的 Badge、Button、Input、Textarea 和 Label。
- `frontend/src/features/devtools/`：在默认关闭的“桌面实验室”分类中提供系统通知测试入口；运行状态页只读取通知能力与授权状态。

## 总体链路

```text
React 组件
  → useSystemNotification
  → systemNotificationApi
  → Wails v3 生成 bindings
  → application.App
  → notification.Service
  → platform/notification.Wails
  → 操作系统通知中心
```

## 初始化与权限

`notifications.NotificationService` 在应用创建时注册；窗口 runtime 就绪后，业务 Service 注册通知响应回调。授权状态和发送直接调用 v3 Service，不保留 v2 初始化状态机。

```text
useSystemNotification.refreshStatus
  → GetSystemNotificationStatus
  → Service.Status
  → CheckNotificationAuthorization
```

macOS 未授权时由用户点击“开启系统通知”触发授权请求，不在页面加载时自动弹出权限窗口。

## 消息契约

```ts
interface MessageNotificationRequest {
  id?: string;
  sender: string;
  content: string;
  conversationId?: string;
}
```

生成的原生通知：

| 字段                  | 内容                   | 是否展示           |
| --------------------- | ---------------------- | ------------------ |
| `Title`               | 发送者                 | 是                 |
| `Subtitle`            | 空字符串               | 否，不展示“新消息” |
| `Body`                | 正文摘要或隐私占位文字 | 是                 |
| `Data.conversationId` | 会话标识               | 否                 |

正文最多保留 160 个 Unicode 字符，超出后使用省略号。

## 应用通知策略

通知发送会读取 Settings 中的策略：

```text
enabled=false       → ErrDisabled
doNotDisturb=true   → ErrDoNotDisturb
showPreview=false   → Body="您收到一条消息"
```

操作系统权限和应用内通知开关是两个独立层级。系统已授权不代表应用设置允许发送。

## 点击回传

```text
用户点击通知
  → notifications.NotificationService.OnNotificationResponse
  → Service 转换 Activation
  → windowService.Activate
  → App.Event.Emit("system-notification:activated")
  → useSystemNotification
  → 业务页面按 conversationId 跳转
```

```ts
interface NotificationActivation {
  notificationId: string;
  conversationId?: string;
}
```

## 错误与边界

| 错误                  | 场景                   |
| --------------------- | ---------------------- |
| `ErrUnavailable`      | 平台不支持通知。       |
| `ErrPermissionDenied` | 操作系统权限未授予。   |
| `ErrDisabled`         | 应用设置关闭通知。     |
| `ErrDoNotDisturb`     | 应用处于免打扰状态。   |
| `ErrSenderRequired`   | 发送者为空。           |
| `ErrContentRequired`  | 正文为空。             |

业务模块只调用 `notification.Service`，不得直接调用 Wails v3 notifications Service。

## 响应式处理

- 通知面板使用 Container Queries，根据自身实际内容宽度调整布局。
- 面板使用紧凑实时预览条和消息编辑器结构：发送者位于顶部横向工具栏，消息正文独占下方整行；极窄宽度时发送者工具栏改为纵向排列。
- 极窄宽度下底部反馈与操作区改为纵向排列，权限和发送按钮变为全宽。
- 权限与发送操作使用 `Button` 并跟随用户配置的默认按钮尺寸；纵向布局只改变宽度，不额外覆盖高度。
- 发送者、正文预览和反馈信息均具备溢出保护，不允许撑开页面。

## 验证

```bash
go test ./internal/notification ./internal/platform/notification
cd frontend && pnpm build
```

权限弹窗、系统通知外观和点击唤醒需要人工桌面验证。
