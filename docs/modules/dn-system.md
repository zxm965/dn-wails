# DN 周常模块

## 模块目标

将 `dn-next` 的角色职业、周计划和站内消息迁移到 Wails 桌面应用。DN 模块只处理 DN 业务数据，不再负责登录、注册、会话、个人资料、头像或密码管理；这些能力统一由[全局账号模块](account.md)提供。

Go 服务通过 `pgxpool` 直连 PostgreSQL；本地构建从 `.env.local` 读取连接串，正式构建从 GitHub Environment Secret 生成并嵌入相同配置。

## 目录与职责

- `internal/dn/database_config.go`：按“进程环境优先、嵌入 `.env.local` 兜底”解析 PostgreSQL 连接配置。
- `internal/dn/postgres_service.go`：DN 独立数据库连接池、必要表健康检查，并通过窄接口依赖全局账号身份。
- `internal/dn/postgres_roles.go`：`dn_role_profession` 角色职业查询和维护。
- `internal/dn/postgres_weekly.go`：`dn_weekly_plan` 周计划查询、维护、同步和重置。
- `internal/dn/postgres_messages.go`：`sys_site_message`、回执、官网消息同步和集成状态。
- `internal/dn/model.go`：角色、周计划和消息 DTO；账号常量与历史本地数据 DTO 通过类型别名兼容 `internal/account`。
- `internal/dn/unavailable_service.go`：未配置安全连接时维持应用生命周期，并让 DN 用例返回明确的不可用错误。
- `internal/dn/service.go`、`internal/dn/auth.go`：保留用于历史本地数据迁移和规则测试的兼容实现，不注册为生产 Wails 账号服务。
- `internal/application/dn.go`：只暴露 DN 角色、周计划和消息 Wails 门面方法。
- `frontend/src/features/dn-system/api/`：生成绑定适配和 DN 角色/周计划业务类型。
- `frontend/src/features/dn-system/model/`：职业/巢穴常量、优先级和日期校验。
- `frontend/src/features/dn-system/components/`：DN 周计划和角色两个业务页面及响应式样式。
- `frontend/src/features/site-messages/`：独立站内消息页面、消息盒子、Provider 和 API 适配，详见[站内消息模块](site-messages.md)。
- `frontend/src/shared/navigation/menuConfig.ts`：DN 父入口、两个子菜单和独立站内消息菜单的显隐偏好配置。

## 依赖关系

```text
React DN page / SiteMessageProvider
  → dn-system/api
  → frontend/bindings
  → application.App
  → dn.PostgresService
      → account.PostgresService.CurrentUserID / CurrentAdminUserID
      → PostgreSQL DN tables
      → net/http（官网消息）
```

组合根在提供 `DATABASE_URL` 时分别创建 Account 与 DN 服务，并把 Account 作为 `UserIdentity` 注入 DN。DN 服务看不到本地会话 token，只能请求当前普通用户或管理员 ID。未提供连接或连接串无法解析时使用 `dn.UnavailableService`，应用窗口和其他公共功能仍可使用。

## 数据契约

- `RoleProfession`：用户归属、角色名、职业、权重、备注、排序和关联计划数。
- `WeeklyPlan`：用户归属、角色关联、最多六个巢穴委托、巢穴票、每日疲劳、侵蚀/方舟/噩梦、备注和排序。
- `SiteMessage`：来源、级别、标题、内容、动作、弹窗语义、发布时间、有效期、官网分类元数据和当前用户的已读状态。
- `sys_site_message_receipt`：按用户与消息保存 `notified_at` 和 `read_at`。
- `OfficialMessageSyncResult`：是否跳过、官网获取数、新增数和同步时间。
- `ListMeta`：`total`、`totalPages`、`page`、`pageSize`。

账号和 `sys_session` 契约由 Account 模块维护。DN 只继续使用角色、周计划、消息和回执表，并在每次读写时通过注入的身份接口取得账号 ID。

## 核心链路

### 数据库配置

`main.go` 通过 `all:.env*` 收集公开 `.env` 和存在时的 `.env.local`。数据库连接按以下优先级读取：

1. 进程环境变量 `DATABASE_URL`。
2. Go embed 收集的 `.env.local` 中的 `DATABASE_URL`。

本地 `.env.local` 和 `.env.*.local` 均被 Git 忽略。Release 工作流从 Environment `RELEASE` 的 `secrets.DATABASE_URL` 生成临时 `.env.local`，随后执行 Wails v3 Taskfile 构建。运行时不扫描或读取 `dn-next`，也不依赖旧的 `dn-database-connection.json` 缓存。

完整连接串不得出现在 Git 记录、构建日志、错误提示、文档示例或前端接口中。由于连接串存在于正式二进制中，应视为可提取配置，并配套最小权限、网络访问限制、数据库审计和凭据轮换。

### 登录保护

DN 的两个业务路由在 `routeConfig.ts` 中统一声明 `requiresAuth: true`。`App.tsx` 先通过全局 `AccountProvider` 判断登录状态，认证成功后才渲染 DN 页面。DN 页面不提供登录、注册或个人资料界面；独立站内消息页面由 `SiteMessageProvider` 负责全局消息状态。

### 角色与周计划

```text
创建/编辑角色
  → SaveDnRole
  → Account.CurrentUserID
  → 校验当前用户内重名与字段
  → 同步更新该用户关联计划的角色名、职业和权重
  → PostgreSQL transaction

同步角色
  → 为当前用户缺少计划的角色新增空周计划

重置每周任务
  → 保留当前用户的角色与排序
  → 清空巢穴委托、巢穴票和完成状态
```

所有角色和周计划读写都在 Go 层验证账号归属，不能通过传入其他账号的 ID 越权访问。

### 消息与官网同步

- 登录用户可分页、筛选、查看、单条已读和全部已读；已读与弹窗回执按用户隔离。
- 全局站内消息盒子登录后立即刷新，此后每 5 分钟刷新，并领取未显示过的弹窗消息。此轮询只刷新站内消息，不刷新或续期登录会话。
- 标题栏消息盒子有未读消息时仅显示圆点提醒，具体未读数量在消息盒子内展示。
- 弹窗、消息详情、确认和通知均使用共享 Base UI Dialog、Alert Dialog、Sonner 和 `Button`。
- 只有管理员可以本地发布消息或强制同步官网；管理员身份由 Account 模块确认。
- 自动同步新鲜度为 30 分钟，强制同步最短间隔为 2 分钟；请求超时为 15 秒。
- 首次同步只回看最近 2 天，每次最多发布最新 20 条，通过 `source + sourceKey` 去重。
- 官网分类为 `102,103,104,8021,8022,8023,122,7364,8167`，来源地址为龙之谷官网 `GetNewsList.ashx`。
- 站内路径动作由 React 切换 DN 子页面；兼容的 `/account` 动作进入全局个人信息页；HTTP(S) 地址通过 Native Kit 在系统浏览器打开。

## 错误与边界

- 缺少或无法解析 `DATABASE_URL` 时应用仍可启动；进入 DN 页面后显示服务不可用，设置、诊断和更新等公共功能不受影响。
- 未登录时 Account 身份接口返回未认证错误，DN 业务调用随之拒绝。
- 发布消息和官网强制同步要求管理员，否则返回禁止操作错误。
- 角色名在同一用户的活动记录中不能重复；删除角色会删除该用户关联周计划。
- 权重只允许 `0..2`，排序不能小于 0。
- 巢穴委托最多六个，只接受已知巢穴 ID。
- 巢穴票日期统一为 `M-D`，并校验真实日历日期。
- 消息动作只接受应用内 `/path` 或 HTTP(S) URL；过期、未发布或禁用消息不会出现在收件箱。
- 官网同步失败不会阻断本地消息读取，会通过消息盒子展示同步错误。

## 主题与响应式

- 两个 DN 业务页、独立消息页面、消息盒子和弹窗全部使用共享 UI 与应用语义主题令牌，跟随主题、强调色、密度、按钮尺寸和字体缩放即时变化。
- 三个业务页统一使用共享 `PageHeader`，保持页头高度、渐变背景、标题基线和操作区布局一致。
- 页面基于 `dn-page` Container Query 适配常规桌面、`1024 × 768` 最小窗口和极窄内容宽度。
- 表格只在卡片内部横向滚动，不造成整页横向滚动；卡片、过滤器、消息行和弹窗逐级降为单列。

## 接入方式

`main.tsx` 装配全局 `AccountProvider`，`App.tsx` 根据路由元数据执行认证保护，并在应用壳内装配 `SiteMessageProvider`。DN 周常侧栏入口默认隐藏，用户在“偏好设置 → 左侧菜单”开启唯一 key `dn-system` 后，侧栏显示 DN 周常父入口和两个子页面；站内消息使用不带分组标题、独立且默认显示的唯一 key `site-messages`，也可在同一处单独隐藏。登录后标题栏显示全局消息盒子和个人头像，消息盒子的“查看全部消息”跳转到独立站内消息页面。

本地配置：

```dotenv
DATABASE_URL='postgres://username:password@localhost:5432/database'
```

正式发布使用 GitHub Environment `RELEASE` 中的 `DATABASE_URL` Secret；工作流生成临时文件后嵌入安装包，不需要提交 `.env.local`。

Go 方法或 DTO 变化后执行：

```bash
wails3 generate bindings -clean=true -ts
```

## 验证

```bash
gofmt -w internal/dn/*.go internal/application/dn.go
go test ./...
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```

未启动 `wails3 dev`；侧栏展开、Dialog 焦点、消息轮询、官网真实网络和原生外链仍需人工桌面验证。
