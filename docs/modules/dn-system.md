# DN 周常管理模块

## 模块目标

将 `dn-next` 的登录注册、角色职业、周计划、仪表盘、站内消息和个人中心完整迁移到 Wails 桌面应用，并以 Go 服务与 `storage.Store` 替代 Next Route Handler、Drizzle、PostgreSQL Cookie 会话和 Vercel Blob。

## 目录与职责

- `internal/dn/model.go`：认证、账号、角色、周计划、消息和持久化状态 DTO。
- `internal/dn/auth.go`：注册、登录、退出、24 小时会话、资料和密码修改。
- `internal/dn/service.go`：状态初始化与 v1 迁移、数据隔离、CRUD、周任务同步/重置、消息回执和头像导入。
- `internal/dn/official_sync.go`：龙之谷官网消息抓取、游标、频率限制和去重。
- `internal/dn/service_test.go`：认证、隔离、迁移、消息、官网同步和持久化测试。
- `internal/application/dn.go`：Wails 门面方法。
- `frontend/src/features/dn-system/api/`：生成绑定适配和前端类型。
- `frontend/src/features/dn-system/context/`：登录状态与全局消息中心状态。
- `frontend/src/features/dn-system/model/`：职业/巢穴常量、优先级、日期和仪表盘纯计算。
- `frontend/src/features/dn-system/components/`：登录、五个业务页面、全局消息盒子和响应式样式。
- `frontend/src/shared/components/app-sidebar/`：DN 父入口与五个子菜单。

## 依赖关系

```text
React DN page / provider
  → dn-system/api
  → frontend/wailsjs
  → application.App
  → dn.Service
      → storage.Store
      → net/http（官网消息）
  → user configuration directory / Dragon Nest official site
```

DN 业务服务与 React、生成绑定、Wails runtime 和数据库驱动无关。头像选择通过 Native Kit 获取用户明确选择的路径，再由 DN 服务校验文件大小与格式并转换为数据 URL。

## 数据契约

- `AuthState`：当前是否登录、会话用户和过期时间。
- `Profile`：账号、显示名称、邮箱、头像、角色和状态；不向前端暴露密码哈希。
- `RoleProfession`：用户归属、角色名、职业、权重、备注、排序和关联计划数。
- `WeeklyPlan`：用户归属、角色关联、最多六个巢穴委托、巢穴票、每日疲劳、侵蚀/方舟/噩梦、备注和排序。
- `SiteMessage`：来源、级别、标题、内容、动作、弹窗语义、发布时间、有效期、官网分类元数据和当前用户的已读状态。
- `messageReceipt`：按 `UserID + MessageID` 保存 `NotifiedAt` 和 `ReadAt`。
- `OfficialMessageSyncResult`：是否跳过、官网获取数、新增数和同步时间。
- `ListMeta`：`total`、`totalPages`、`page`、`pageSize`。

持久化状态版本为 v2，存储键为 `dn-system`。密码格式与源项目一致：`scrypt:<salt hex>:<64-byte hash hex>`。盐值本身以十六进制文本参与 scrypt，参数为 `N=16384`、`r=8`、`p=1`。

## 核心链路

### 登录、注册与旧数据认领

```text
应用启动
  → Initialize
  → 读取 dn-system
  → v1 时迁移为 v2 待认领数据
  → GetDnAuthState 恢复有效会话

首次注册
  → 校验账号、邮箱和密码
  → 创建管理员账号和 24 小时会话
  → 将 OwnerID=0 的旧角色/计划归属新用户
  → 将旧消息已读状态转换为该用户的 receipt

后续注册
  → 创建普通用户
  → 使用独立角色和周计划数据
```

前端每 5 分钟刷新一次认证状态。Go 在会话使用间隔达到 5 分钟时续期 24 小时；账号被禁用、会话损坏或过期时返回未认证状态。

### 角色与周计划

```text
创建/编辑角色
  → SaveDnRole
  → 从 Go 会话确定 OwnerID
  → 校验当前用户内重名与字段
  → 同步更新该用户关联计划的角色名、职业和权重
  → Storage.Save

同步角色
  → 为当前用户缺少计划的角色新增空周计划

重置每周任务
  → 保留当前用户的角色与排序
  → 清空巢穴委托、巢穴票和完成状态
```

所有角色和周计划读写都在 Go 层验证会话和归属，不能通过传入其他账号的 ID 越权访问。

### 消息与官网同步

- 登录用户可分页、筛选、查看、单条已读和全部已读；已读与弹窗回执按用户隔离。
- 全局消息盒子登录后立即刷新，此后每 5 分钟刷新，并领取未显示过的弹窗消息。
- 弹窗、消息详情、确认和通知均使用共享 Base UI Dialog、Alert Dialog、Sonner 和 `AppButton`。
- 只有管理员可以本地发布消息或强制同步官网。
- 自动同步新鲜度为 30 分钟，强制同步最短间隔为 2 分钟；请求超时为 15 秒。
- 首次同步只回看最近 2 天，每次最多发布最新 20 条，通过 `source + sourceKey` 去重。
- 官网分类为 `102,103,104,8021,8022,8023,122,7364,8167`，来源地址为龙之谷官网 `GetNewsList.ashx`。
- 站内路径动作由 React 切换 DN 子页面，HTTP(S) 地址通过 Native Kit 在系统浏览器打开。

### 仪表盘

Go 返回当前用户的完整周计划 DTO；前端纯函数计算总完成度、待办角色和三天内到期票券，不产生额外持久化副作用。

### 个人中心

- 资料页修改显示名称、唯一邮箱和头像。
- 密码与安全页验证当前密码后写入新的 scrypt 哈希。
- 退出登录会清除持久化会话，并立即回到 DN 登录/注册入口。

## 错误与边界

- 未登录时所有 DN 业务方法都会返回 `ErrUnauthenticated`。
- 发布消息和官网强制同步要求管理员，否则返回 `ErrForbidden`。
- 用户名和邮箱全局唯一；邮箱规范化为小写；密码至少 8 位。
- 角色名在同一用户的活动记录中不能重复；删除角色会删除该用户关联周计划。
- 权重只允许 `0..2`，排序不能小于 0。
- 巢穴委托最多六个，只接受已知巢穴 ID。
- 巢穴票日期统一为 `M-D`，并校验真实日历日期。
- 头像只接受 JPEG、PNG、GIF、WebP，最大 5MB。
- 消息动作只接受应用内 `/path` 或 HTTP(S) URL；过期、未发布或禁用消息不会出现在收件箱。
- 官网同步失败不会阻断本地消息读取，会通过消息盒子展示同步错误。

## 主题与响应式

- 登录页、五个业务页、消息盒子和弹窗全部使用共享 UI 与应用语义主题令牌，跟随主题、强调色、密度、按钮尺寸和字体缩放即时变化。
- 页面基于 `dn-page` Container Query 适配常规桌面、`720 × 520` 最小窗口和极窄内容宽度。
- 表格只在卡片内部横向滚动，不造成整页横向滚动；卡片、过滤器、消息行、账户表单和弹窗逐级降为单列。

## 接入方式

`main.tsx` 装配 `DnAuthProvider`，`App.tsx` 对 DN 页面执行认证保护并装配 `DnMessageProvider`。侧栏“业务系统 → DN 周常管理”负责入口和五个子页面导航；标题栏在登录后显示全局消息盒子。

Go 方法或 DTO 变化后执行：

```bash
wails generate module
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

未启动 `wails dev`；登录表单、侧栏展开、Dialog 焦点、5 分钟轮询、头像选择、官网真实网络和原生外链仍需人工桌面验证。
