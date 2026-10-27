# 站内消息模块

## 模块目标

提供独立于 DNTools的站内消息收件箱、右上角消息盒子、未读状态、弹窗提醒和管理员消息发布/官网同步入口。

## 目录与职责

- `frontend/src/features/site-messages/api/siteMessagesApi.ts`：站内消息 DTO、查询类型和 Wails API 适配。
- `frontend/src/features/site-messages/context/SiteMessageProvider.tsx`：登录后的官网同步判断、全局收件箱状态、轮询、已读处理、全屏提醒、展示回执和消息动作跳转。
- `frontend/src/features/site-messages/components/SiteMessages.tsx`：独立的站内消息页面，支持筛选、分页、已读、详情，以及管理员创建、编辑、删除和官网同步。
- `frontend/src/features/site-messages/components/SiteMessageCenter.tsx`：标题栏右上角消息盒子和消息弹窗。
- `frontend/src/features/site-messages/components/SiteMessageCenter.css.ts`：消息盒子、单条全屏提醒和多条合并列表弹窗的局部样式。
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

`site-messages` 是不带分组标题的独立菜单项，默认显示，用户可在“设置 → 菜单 → 左侧菜单”单独隐藏。右上角消息盒子的“查看全部消息”跳转到同一路由；消息动作直接通过共享 `getAppViewFromPath` 解析当前应用路由，例如 `/site-messages`、`/dn/weekly`、`/dn/roles`、`/account`；不保留旧路径到 DN 子页面的映射或中间导航类型。未知路径给出不可用提示，HTTP(S) 外链统一通过 Native Kit 打开。

## 错误与边界

- 未登录时清空本地收件箱状态，不执行消息轮询。
- 消息盒子与页面共享 Provider，未读数和已读操作保持一致。
- 官网同步失败不阻断本地消息读取，并通过统一反馈提示。
- 消息动作只允许应用内目标或 HTTP(S) 外链；外链通过 Native Kit 打开。
- 登录成功后立即执行一次登录同步判断：当前账号距上一次登录超过 30 分钟或没有历史记录时请求官网，否则只更新时间并跳过；此后每 5 分钟只刷新站内收件箱，不重复请求官网。
- 站内消息页向所有登录用户提供“主动同步”按钮，主动同步的最短间隔为 2 分钟；消息发布、编辑和删除仍只允许管理员操作。
- 管理员可创建包含发送类型、标题、内容和发送时间的站内信；发送时间为空时立即生效，未来时间在用户之后登录或刷新且到期后生效，不依赖定时任务。
- 管理员管理视图包含尚未发送和已过期的活动记录，可编辑或软删除；普通用户只能读取已生效且未过期的消息，不能调用管理接口。
- 管理员创建的消息固定启用弹窗提醒。每次轮询最多领取 20 条：只有 1 条时沿用全屏提醒，有多条时改为一个可滚动的合并列表弹窗，不再关闭一条后立即连续弹出下一条。
- 前端在弹窗内容实际渲染后为当前整批消息写入 `notified_at`；任一消息的回执失败时，该消息保持可领取。已提醒但未读的消息仍保留在收件箱，直到用户查看或执行全部已读。
- 编辑消息不会清空既有用户回执；需要让已提醒用户再次收到提醒时，应创建一条新消息。
- 删除使用 `status=0` 软删除，保留官网消息的来源去重键，防止下一次官网同步重新导入。

## 验证

```bash
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```

## 页面交互与请求状态

- 点击消息立即打开详情，已读写入在后台进行，失败提示后可再次打开重试。
- 页面与消息盒子共用 Provider 的 `markRead`、`markAll` 和未读计数；同一消息的在途已读写入复用请求。成功后通过 `readRevision` 重新校准页面筛选结果和分页。
- 收件箱响应检查账号和已读修订号，避免旧响应把刚更新的未读计数覆盖；账号切换后清空已读请求和记录。
- 首次加载使用骨架屏，刷新保留已有内容；失败单独显示重试入口，较旧筛选请求及卸载后响应失效。

## React 回调与生命周期

登录同步和五分钟轮询按用户 ID 建立与清理；普通重渲染不清空收件箱、不重启轮询。Effect Event 处理最新刷新逻辑，旧账号初始化完成后不得继续刷新新账号。列表重新加载由已应用筛选、管理员身份或已读修订变化触发，保留过期请求保护。

回归检查：`cd frontend && node --test tests/*.test.mjs`；这些模拟与构建检查不替代原生桌面交互验证。
