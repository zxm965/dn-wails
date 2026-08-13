# 站内消息模块

## 模块目标

提供独立于 DN 周常管理的站内消息收件箱、右上角消息盒子、未读状态、弹窗提醒和管理员消息发布/官网同步入口。

## 目录与职责

- `frontend/src/features/site-messages/api/siteMessagesApi.ts`：站内消息 DTO、查询类型和 Wails API 适配。
- `frontend/src/features/site-messages/context/SiteMessageProvider.tsx`：登录后的全局收件箱状态、轮询、已读处理、弹窗和消息动作跳转。
- `frontend/src/features/site-messages/components/SiteMessages.tsx`：独立的站内消息页面，支持筛选、分页、已读、详情、发布和官网同步。
- `frontend/src/features/site-messages/components/SiteMessageCenter.tsx`：标题栏右上角消息盒子和消息弹窗。
- `frontend/src/shared/navigation/menuConfig.ts`：独立菜单 key `site-messages`、默认显隐和偏好说明。

## 核心链路

```text
App → SiteMessageProvider
       ├── SiteMessageCenter（标题栏消息盒子）
       └── SiteMessages（独立左侧菜单页面）
            → siteMessagesApi
            → Wails application.App
            → internal/dn 消息查询与回执服务
```

站内消息页面不再属于 `features/dn-system` 的组件或 API 文件；后端暂继续复用 DN 数据服务提供的消息表、官网同步和权限校验。

## 导航与配置

`site-messages` 是不带分组标题的独立菜单项，默认显示，用户可在“偏好设置 → 左侧菜单”单独隐藏。右上角消息盒子的“查看全部消息”跳转到同一路由；消息动作中的 `/messages` 保持兼容内部目标协议。

## 错误与边界

- 未登录时清空本地收件箱状态，不执行消息轮询。
- 消息盒子与页面共享 Provider，未读数和已读操作保持一致。
- 官网同步失败不阻断本地消息读取，并通过统一反馈提示。
- 消息动作只允许应用内目标或 HTTP(S) 外链；外链通过 Native Kit 打开。

## 验证

```bash
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```
