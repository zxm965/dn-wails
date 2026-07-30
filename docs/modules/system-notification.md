# 系统通知模块

## 模块目标

将业务消息转换为跨平台原生通知，支持权限检测、隐私预览、免打扰和点击通知后恢复会话。

## 目录与职责

- `internal/notification/service.go`：消息校验、通知策略、正文摘要、初始化状态和点击响应。
- `internal/platform/notification/wails.go`：Wails 原生通知适配。
- `internal/application/notification.go`：Wails 绑定门面和设置策略映射。
- `frontend/src/features/system-notification/api/`：前端 API 适配。
- `frontend/src/features/system-notification/hooks/`：权限状态、发送和点击事件订阅。
- `frontend/src/features/system-notification/components/`：可嵌入测试工具页的通知测试与预览界面。
- `frontend/src/shared/components/ui/`：通知预览使用的 Card、Badge、Input、Textarea 和 Label。
- `frontend/src/features/test-tools/`：系统通知测试的统一入口。

## 总体链路

```text
React 组件
  → useSystemNotification
  → systemNotificationApi
  → Wails 生成绑定
  → application.App
  → notification.Service
  → platform/notification.Wails
  → 操作系统通知中心
```

## 初始化与权限

通知 runtime 在 `OnDomReady` 初始化。Service 使用互斥锁和完成 channel 处理并发初始化与状态查询。

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
  → runtime.OnNotificationResponse
  → Service 转换 Activation
  → windowService.Activate
  → EventsEmit("system-notification:activated")
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
| `ErrNotInitialized`   | 原生通知未完成初始化。 |
| `ErrPermissionDenied` | 操作系统权限未授予。   |
| `ErrDisabled`         | 应用设置关闭通知。     |
| `ErrDoNotDisturb`     | 应用处于免打扰状态。   |
| `ErrSenderRequired`   | 发送者为空。           |
| `ErrContentRequired`  | 正文为空。             |

业务模块只调用 `notification.Service`，不得直接调用 Wails runtime。

## 响应式处理

- 通知面板使用 Container Queries，根据自身实际内容宽度调整布局。
- 宽度不足时，消息预览与发送表单从双列变为单列，状态标签移动到标题下方。
- 极窄宽度下头像、消息间距和页头字号同步缩小，发送操作改为全宽纵向按钮。
- 权限与发送操作使用 `AppButton` 并跟随用户配置的默认按钮尺寸；纵向布局只改变宽度，不额外覆盖高度。
- 发送者、时间、正文和反馈信息均具备溢出保护，不允许撑开页面。

## 验证

```bash
go test ./internal/notification ./internal/platform/notification
cd frontend && pnpm build
```

权限弹窗、系统通知外观和点击唤醒需要人工桌面验证。
