# 全局账号模块

## 模块目标

提供不隶属于任何业务系统的登录、注册、会话恢复、个人资料、头像、密码修改和退出登录能力。需要账号的页面只声明路由元数据 `requiresAuth`，由应用壳统一展示登录入口；DN 和快速笔记等云端模块只读取当前账号标识。

## 目录与职责

- `database/migrations/20260811_make_desktop_sessions_persistent.sql`：把现有未撤销的桌面会话调整为长期有效。
- `internal/account/model.go`：稳定的账号 DTO、角色和状态常量。
- `internal/account/auth.go`：邮箱、密码、头像地址校验，以及与现有账号兼容的 scrypt 密码哈希。
- `internal/account/postgres_service.go`：账号查询、资料维护、头像导入、数据库会话和本地令牌持久化。
- `internal/account/unavailable_service.go`：数据库未配置时的明确降级实现。
- `internal/application/account.go`：暴露给前端的全局账号 Wails 门面。
- `frontend/src/features/account/api/`：生成绑定适配和前端账号类型。
- `frontend/src/features/account/context/AccountProvider.tsx`：应用启动时恢复登录状态，并向所有功能提供当前用户和登录操作。
- `frontend/src/features/account/components/`：登录注册页、个人信息页和标题栏头像入口。
- `frontend/src/shared/navigation/routeConfig.ts`：声明页面标题、导航类型和 `requiresAuth`。

## 依赖关系

```text
AccountProvider / AccountLogin / AccountPanel
  → account/api
  → frontend/bindings
  → application.App
  → account.PostgresService
      → storage.Store（只保存随机会话令牌）
      → PostgreSQL sys_user / sys_session

DN / Quick Notes
  → account.PostgresService.CurrentUserID
  → 当前账号 ID
```

`main.go` 创建独立的 Account、DN 和 Quick Notes 服务。DN 与快速笔记通过窄接口依赖账号身份，不读取本地令牌，也不负责登录、注册或个人资料维护。

## 数据契约

```ts
interface AuthState {
  authenticated: boolean;
  user: Profile | null;
}

interface Profile {
  id: number;
  account: string;
  name: string;
  email: string;
  role: number;
  status: number;
  avatar: string;
  createdAt: string;
}
```

Wails 门面提供：

- `GetAuthState`：恢复并校验当前本地会话。
- `RegisterUser`、`LoginUser`、`LogoutUser`：注册、登录和主动退出。
- `GetProfile`、`UpdateProfile`：读取与更新显示名称、邮箱和头像。
- `ChangePassword`：校验当前密码后更新密码哈希。
- `ImportAvatar`：读取用户主动选择的本地图片并返回数据 URL。

密码不会写入本地存储或返回前端；本地只保存随机 token，数据库只保存其 SHA-256 哈希。

## 会话持久化

```text
应用启动
  → AccountService.Initialize
  → 读取 account-session
  ├── 不存在：尝试迁移旧 dn-desktop-session
  └── 存在：恢复随机 token
  → GetAuthState 查询 sys_session 与 sys_user
  ├── 会话未撤销且账号启用：恢复登录
  └── 会话不存在、已撤销或账号禁用：清除本地 token
```

- 新会话的 `expires_at` 写为 PostgreSQL 可表示的远期时间 `9999-12-31 23:59:59+00`，用于兼容现有非空字段约束。
- 认证查询不再根据 `expires_at` 或使用间隔自动失效，也不再执行定时续期。
- 登录状态会跨应用重启保留，直到用户主动退出、数据库会话被撤销、账号被禁用或本地令牌损坏。
- `20260811_make_desktop_sessions_persistent.sql` 只迁移 `user_agent = 'dn-wails'` 且未撤销的既有会话，不影响其他客户端会话。
- 桌面应用不会自动执行数据库迁移；部署前应由数据库管理员执行迁移。

## 路由保护与标题栏

`APP_ROUTES` 是页面认证要求的唯一配置入口。`App.tsx` 在渲染活动页面前检查 `requiresAuth`：恢复状态期间显示加载态，未登录时统一展示 `AccountLogin`，登录成功后直接渲染原页面。业务页面不再自行装配登录组件或认证 Provider。

标题栏始终显示账号入口：未登录时使用小人占位图标，并通过悬浮提示说明“未登录，点击登录”；点击后进入 standalone 的 `account` 路由并展示全局登录页。登录后入口改为当前用户头像，无头像时显示名称、邮箱或账号首字母，点击进入个人资料、头像、密码和退出登录管理。`account` 页面不出现在侧栏。

## 错误与边界

- 缺少或无法解析 `DATABASE_URL` 时使用 `UnavailableService`；公共页面仍可使用，需要账号的页面展示账号服务不可用。
- 用户名不能为空且最多 80 个 Unicode 字符；邮箱规范化为小写并保持全局唯一；密码为 8–256 个 Unicode 字符。
- 头像只接受 JPEG、PNG、GIF、WebP，最大 5MB；资料接口也只接受图片数据 URL 或 HTTP(S) 地址。
- 账号被禁用时当前数据库会话会被撤销，本地 token 会被清除。
- 主动退出先撤销数据库会话，再清除新旧本地会话 key。
- 当前未实现多设备会话管理、找回密码和离线登录。

## 接入方式

新增需要登录的页面时，在 `frontend/src/shared/navigation/routeConfig.ts` 注册路由并设置 `requiresAuth: true`。后端业务服务需要账号归属时，只依赖 `CurrentUserID`；管理员用例另依赖 `CurrentAdminUserID`。

部署既有桌面会话迁移：

```bash
psql "$DATABASE_URL" -f database/migrations/20260811_make_desktop_sessions_persistent.sql
```

Go 方法或 DTO 变化后重新生成绑定：

```bash
wails3 generate bindings -clean=true -ts
```

## 验证

```bash
gofmt -w internal/account/*.go internal/application/account.go
go test ./...
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```

会话跨重启恢复、真实数据库迁移、标题栏头像点击、头像文件选择和账号禁用后的退出仍需在已配置 PostgreSQL 的桌面环境中人工验证。
