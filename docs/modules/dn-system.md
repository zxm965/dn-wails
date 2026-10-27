# 龙之谷模块（dn-system）

## 模块目标

将 `dn-next` 的角色职业、周计划、站内消息和 Windows 游戏进程快捷结束能力迁移到 Wails 桌面应用。DN 模块只处理 DN 业务数据和本地游戏工具，不再负责登录、注册、会话、个人资料、头像或密码管理；这些能力统一由[全局账号模块](account.md)提供。

Go 服务通过 `pgxpool` 直连 PostgreSQL；本地构建从 `.env.local` 读取连接串，正式构建从 GitHub Environment Secret 生成并嵌入相同配置。

## 目录与职责

- `internal/dn/database_config.go`：按“进程环境优先、嵌入 `.env.local` 兜底”解析 PostgreSQL 连接配置。
- `internal/dn/postgres_service.go`：DN 独立数据库连接池、必要表健康检查，并通过窄接口依赖全局账号身份。
- `internal/dn/postgres_roles.go`：`dn_role_profession` 角色职业查询和维护。
- `internal/dn/postgres_weekly.go`：`dn_weekly_plan` 周计划查询、维护、同步和重置；使用 `remaining_commission_count` 保存剩余委托数量。
- `internal/dn/postgres_messages.go`：`sys_site_message`、回执、官网消息同步和集成状态。
- `internal/dn/model.go`：角色、周计划和消息 DTO，以及当前周委托计数规则。
- `internal/dn/unavailable_service.go`：未配置安全连接时维持应用生命周期，并让 DN 用例返回明确的不可用错误。
- `internal/dn/rules.go`：消息输入校验、时间规范化及分页规则；DN 业务仅使用 PostgreSQL 服务，不再提供本地状态或账号实现。
- `internal/application/dn.go`：只暴露 DN 角色、周计划和消息 Wails 门面方法。
- `frontend/src/features/dn-system/api/`：生成绑定适配和 DN 角色/周计划业务类型。
- `frontend/src/features/dn-system/model/`：职业/巢穴常量、优先级和日期校验。
- `frontend/src/features/dn-system/components/`：周常、角色和进程三个业务页面及响应式样式；进程页同时提供可配置 F1–F12（默认 F4）和置顶小窗入口。
- `internal/dnprocess/`：龙之谷候选进程识别、目标校验和终止规则。
- `internal/platform/dnprocess/`：Windows 进程快照、路径读取和进程终止适配；非 Windows 返回不可用状态。
- `internal/platform/window/process.go`：原生置顶小窗管理，详见[全局快捷键模块](shortcut.md)。
- `frontend/src/features/site-messages/`：独立站内消息页面、消息盒子、Provider 和 API 适配，详见[站内消息模块](site-messages.md)。
- `frontend/src/shared/navigation/menuConfig.ts`：龙之谷父入口、周常/角色/进程三个子菜单和独立站内消息菜单的显隐偏好配置。

连接池配置复用 [PostgreSQL 基础设施](postgres.md)，保留 DN 的独立连接上限。

角色与周常页面共用模块内 `DnFilterBar` 和 `DnField`：筛选输入、搜索/重置与响应式样式集中维护；角色页职业选项保留分组名称，周常页保留简短名称。页面各自持有输入/已应用筛选、分页、加载和错误状态；周常额外的角色 ID 字段通过局部更新保留。

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
- `WeeklyPlan`：用户归属、角色关联、6 个委托的剩余数量、侵蚀/方舟/噩梦、备注和排序；其中方舟和噩梦各占 1 个委托名额。
- `SiteMessage`：来源、级别、标题、内容、动作、弹窗语义、发布时间、有效期、官网分类元数据和当前用户的已读状态。
- `sys_site_message_receipt`：按用户与消息保存 `notified_at` 和 `read_at`。
- `sys_integration_state`：主键保存官网最新发布时间与同步时间，按账号派生的登录键保存该账号最近一次登录检查时间。
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
  → 剩余委托数量恢复为 6
  → 清空侵蚀、方舟和噩梦完成状态
```

所有角色和周计划读写都在 Go 层验证账号归属，不能通过传入其他账号的 ID 越权访问。

周常只读写当前字段：`remainingCommissionCount` 对应 `remaining_commission_count`，移除巢穴明细、票券、主线与其他任务字段的写入和清空逻辑，不保留双字段读取或旧数据推导。

数据库使用当前结构，周常委托数量列为 `remaining_commission_count`，默认值为 6。客户端只校验结构，不执行 DDL；健康检查会报告缺少必需字段。仓库不保留旧结构转换脚本，测试直接创建新版临时表。

### 消息与官网同步

- 登录用户可分页、筛选、查看、单条已读和全部已读；已读与弹窗回执按用户隔离。
- 全局站内消息盒子登录后立即刷新，此后每 5 分钟刷新，并领取未显示过的弹窗消息。此轮询只刷新站内消息，不刷新或续期登录会话。
- 登录后的首次收件箱刷新会记录当前账号的本次登录时间；距该账号上一次登录超过 30 分钟或没有历史记录时请求一次官网消息，否则跳过，后续 5 分钟收件箱轮询只读取已同步数据。
- 消息到达 `published_at` 后才可见；用户在发送时间之后首次登录或下一次 5 分钟刷新时领取提醒，不需要后台定时任务。
- 弹窗提醒一次领取整批消息：单条沿用全屏展示，多条改为一个合并列表弹窗，关闭后不立即继续领取。React 实际渲染后为整批写入 `notified_at`；已提醒但未读的消息仍保留在收件箱。
- 标题栏消息盒子有未读消息时仅显示圆点提醒，具体未读数量在消息盒子内展示。
- 弹窗、消息详情、确认和通知均使用共享 Base UI Dialog、Alert Dialog、Sonner 和 `Button`。
- 只有管理员可以创建、编辑或软删除本地消息；所有登录用户都可以在站内消息页主动同步官网，服务端按 2 分钟最短间隔限频。
- 登录自动同步间隔为 30 分钟，主动同步最短间隔为 2 分钟；请求超时为 15 秒。
- `CheckOfficialSiteMessagesOnLogin` 只由全局消息 Provider 在登录建立时调用；`SyncOfficialSiteMessages` 由站内消息页的主动同步按钮调用。
- 首次同步只回看最近 2 天，每次最多发布最新 20 条，通过 `source + sourceKey` 去重。
- 官网分类为 `102,103,104,8021,8022,8023,122,7364,8167`，来源地址为龙之谷官网 `GetNewsList.ashx`。
- 站内动作直接使用统一路由表中的 `/dn/weekly`、`/dn/roles`、`/site-messages`、`/account` 等当前路径；不再翻译 `/weekly-plans`、`/roles`、`/messages` 等旧路径；HTTP(S) 地址通过 Native Kit 在系统浏览器打开。

### 进程工具

- 主窗口进程页与置顶小窗首次打开、重新获得焦点、手动刷新和终结后自动读取候选，紧凑展示名称与 PID。重新启动同一路径的进程后可在小窗刷新并再次终结，实际终结每次重新解析当前 PID。
- Windows 扫描名称为 `DragonNest.exe`、`DragonNest_x64.exe`、WeGame 渠道的 `DragonNestWS_x64.exe` 或 `DNLauncher.exe` 的进程，进程名匹配不区分大小写，不按路径关键字扩大候选范围；唯一启动器安装路径自动记录到独立的 `dragonNest.launcherPath`，小窗优先使用它启动。后端使用同一个进程句柄完成名称和完整路径校验、终止和退出等待，避免检查后重新打开 PID 时误杀复用该 PID 的进程。
- Windows 使用 `OpenProcess(PROCESS_TERMINATE | PROCESS_QUERY_LIMITED_INFORMATION | SYNCHRONIZE)` 和 `TerminateProcess`，然后通过 `WaitForSingleObject` 最多等待 3 秒；只有确认进程退出才返回成功。等待超时返回 `ErrTerminationTimeout`，UI 提示重新扫描，不把已发送请求当作已结束。
- 平台扫描遇到访问被拒绝时保留 PID、名称和空路径；业务服务仅对已识别的龙之谷候选将其转为 `ErrAccessDenied`，不会误报为未找到，也不会阻断与龙之谷无关的受限系统进程；有任一龙之谷候选无法读取路径时，本次扫描整体失败，以免快捷键自动选择不完整候选列表。
- 主页面与小窗存在候选进程（含启动器）时禁用启动，没有候选进程时禁用结束；首次扫描完成前、扫描中和扫描失败时禁用启动，后端启动前也会重新扫描并阻止重复启动。
- 选择候选进程后可直接结束；首次成功结束后自动保存目标路径，供全局快捷键使用。
- 主窗口与小窗通过 `dn-process:changed` typed event 同步：启动/终结后两个已打开的列表都会重新扫描；启动请求成功时有限重试，较旧扫描结果不得覆盖新状态。操作回调不额外扫描；手动结束、快捷键和小窗共用操作 Hook。记住启动器/终结目标后同步广播设置，避免主窗口保存旧偏好时覆盖路径。
- 主窗口支持配置、保存和修改启动路径（Windows 的 `DNLauncher.exe`、macOS 的 Firefox），提供原生文件选择；未扫描到启动器且尚未配置时显示提醒，通过按钮打开配置弹窗。保存需通过后端路径/文件校验，失败保留原配置；自动扫描不覆盖已保存的路径，终结目标和启动路径分别保存。
- 全局快捷键支持 F1–F12 或 Ctrl+Shift+F4（默认 F4，需在进程页启用），后台和最小化不依赖窗口焦点；Windows 提供标准全局与 Raw Input 游戏兼容模式，标准模式拒绝 F12。小窗显示注册状态、收到次数和最近执行结果，关闭后隐藏，后台注册保持；长按与并发重复被抑制。设置继续使用 v11，保留 `localShortcutKey` 字段并增加可选的启用与游戏模式字段，完整链路及验证边界见[全局快捷键](shortcut.md)。
- 没有已记录路径且同时存在多个候选进程时，快捷键不会自动选择，用户需要打开“进程”页面手动选择。

### macOS Firefox 测试模式

macOS 的进程页自动显示“Firefox 进程”，复用扫描、单击结束、可配置 F1–F12（默认 F4）和置顶小窗完整链路，不需要安装龙之谷。仅支持正式版 Firefox（`org.mozilla.firefox`），不纳入其他浏览器、Firefox Nightly 或内容进程。测试使用强制结束，操作前应保存浏览器中的工作。

- `internal/platform/dnprocess/firefox_darwin.go` 与 `firefox_darwin.m` 用 build tags 隔离 AppKit 实现；无 cgo 或 Linux 仍返回不可用。
- `dnprocess.NewFirefoxTestService` 使用独立名称白名单和区分大小写的路径匹配；Windows 继续使用原有规则。绑定方法名沿用 `ListDragonNestProcesses` / `TerminateDragonNestProcess` / `KillDragonNestProcess`，前端 API 按系统提供目标文案，同一 `dragonNest.targetPath` 保存当前平台最近成功结束的目标。
- AppKit 按 bundle ID 枚举主应用；关闭前在同一个 `NSRunningApplication` 上校验 PID 对应应用、bundle ID 和完整可执行路径，然后调用 `forceTerminate`，不使用按名称批量关闭。保留该应用对象，并在 Go 工作线程最多等待 3 秒确认 `terminated`，不阻塞主线程更新状态，避免将已发送请求直接当作成功。
- [Apple NSRunningApplication 文档](https://developer.apple.com/documentation/appkit/nsrunningapplication)说明其属性线程安全，但动态状态由主 run loop 更新；因此真实关闭验证必须在正在运行的 Wails 应用中完成，单元测试不关闭实际浏览器。
- 小窗系统标题仅显示 Firefox（Windows 为“龙之谷”），内容区不再重复标题；“启动”按钮按已保存的启动路径启动应用，启动后有限重试刷新进程；启动/终结共享并发防护，完整平台规则与正常启动模式见[全局快捷键](shortcut.md)。小窗系统关闭按钮只隐藏小窗，“结束”按钮才关闭浏览器。macOS 部分键盘需使用 Fn + F4；启用全局快捷键后切到 Firefox 仍响应。

### 社区方式对照与实机验收

2026-10-12 检索的社区资料中，[2025 年龙之谷 F4 秒退视频](https://www.bilibili.com/video/BV1Pwsoz1E7k/)说明存在这种操作习惯，但未提供可审查的实现；[2012 年用户报告](https://zhidao.baidu.com/question/502459680.html)提到 `taskkill` / `ntsd` 对 `DragonNest.exe` 返回拒绝访问，不能用来证明当前客户端一定有效。没有找到足以保证当前国服版本兼容的公开实现或可复现实测。

可审查的通用方案是 [AutoHotkey ProcessClose](https://github.com/AutoHotkey/AutoHotkeyDocs/blob/v2/docs/lib/ProcessClose.htm) 这种按 PID/进程名强制关闭方式；本工具直接调用 Windows 进程 API，并保留路径校验。[微软文档](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-terminateprocess)明确外部进程的 `TerminateProcess` 为异步操作，因此本实现增加退出等待。改用命令行 `taskkill` 不能被视为权限或游戏保护限制的通用解决方案。

按键触发与进程终止分开验收：

1. 在 Windows 的“进程”页扫描并手动结束一次龙之谷，确认客户端退出且目标路径记录成功；若提示拒绝访问，先比较游戏与本工具的权限。[AutoHotkey 官方 FAQ](https://github.com/AutoHotkey/AutoHotkeyDocs/blob/v2/docs/FAQ.htm#L87)说明提升权限的前台程序可能阻止未提升权限程序的热键。
2. 在进程页启用全局快捷键，分别在主窗口、置顶小窗、游戏前台和最小化时测试 F4；检查收到次数，游戏内无输入时切换 Raw Input 游戏兼容模式或 Ctrl+Shift+F4，再用“结束”按钮区分进程权限问题。
3. 检查小窗内成功或失败提示；确认成功仅在本地进程退出后出现，拒绝访问与超时须展示相应错误。
4. 覆盖重复打开、长按不重复、修饰键过滤、主窗口与小窗同时操作、关闭重开和退出应用；独占全屏游戏是否允许覆盖须实机验证，服务端断线判定时间不属于本地进程退出保证。

测试覆盖拒绝访问、目标变化、系统目标拒绝、等待超时、等待失败和句柄释放；Windows 专用 stub 测试需要在 Windows 执行，其他系统只能交叉编译，不能替代上述游戏实机验证。

## 错误与边界

- 缺少或无法解析 `DATABASE_URL` 时应用仍可启动；进入 DN 页面后显示服务不可用，设置、诊断和更新等公共功能不受影响。
- 未登录时 Account 身份接口返回未认证错误，DN 业务调用随之拒绝。
- 创建、编辑和删除消息要求管理员，否则返回禁止操作错误；自动或主动同步官网只要求用户已登录。
- 角色名在同一用户的活动记录中不能重复；删除角色会删除该用户关联周计划。
- 权重只允许 `0..2`，排序不能小于 0。
- 剩余委托数量总范围为 `0..6`；方舟和噩梦各占 1 个名额，因此加减控件只允许调整另外 4 个普通委托，Go 服务会根据两项状态把数量归一化到合法范围。
- 消息动作只接受应用内 `/path` 或 HTTP(S) URL；过期、未发布或禁用消息不会出现在收件箱。
- 官网同步失败不会阻断本地消息读取，会通过消息盒子展示同步错误。

## 主题与响应式

- 周常、角色、进程三个 DN 页面、独立消息页面、消息盒子和弹窗全部使用共享 UI 与应用语义主题令牌，跟随主题、强调色、密度、按钮尺寸和全局字号组合即时变化。
- 三个 DN 页面统一使用共享 `PageHeader`，保持页头高度、渐变背景、标题基线和操作区布局一致。
- 角色页面固定使用表格展示，不提供表格/卡片切换；表格在窄内容宽度下仅于自身容器内横向滚动。
- 页面基于 `dn-page` Container Query 适配常规桌面、`1024 × 768` 最小窗口和极窄内容宽度。
- 周计划卡片网格将常规列宽限制在 `280–320px` 并保持左对齐，只有一条计划时不拉伸占满整行；卡片内边距为 12px、区块间距为 10px，头像为 32px，压缩委托面板与操作区留白，不删除角色、职业、优先级、备注、委托数字/进度/说明、三项周常状态、排序和编辑/删除操作，按钮沿用共享尺寸与用户偏好。窄内容宽度下自动收缩，周常开关基于卡片自身内容宽度在 280px 以下改为单列，备注可折行、底部操作可换行。
- 周常卡片以剩余委托数量和完成进度为主信息，通过左加右减按钮快速更新另外 4 个普通委托；方舟和噩梦使用紧凑状态面板，切换完成状态时自动同步剩余委托数量。侵蚀不计入这 6 个委托，备注与编辑/删除操作保持次级层级。
- 进程页面保持空状态优先：进入后自动扫描并保留手动扫描按钮，扫描结果只展示疑似龙之谷的非系统进程；全局快捷键和置顶小窗入口与进程操作位于同一工具页，窄宽度下候选进程卡片、危险操作区逐级降为单列。
- 进程页空状态最小高度为 88px，页面上下留白为 16px、卡片间距为 12px，减少空列表造成的纵向滚动；长错误或极窄宽度仍允许内容自然展开，避免裁切操作按钮和状态信息。
- 表格只在卡片内部横向滚动，不造成整页横向滚动；卡片、过滤器、消息行和弹窗逐级降为单列。

## 接入方式

`main.tsx` 装配全局 `AccountProvider`，`App.tsx` 根据路由元数据执行认证保护，并在应用壳内装配 `SiteMessageProvider`。龙之谷侧栏入口默认隐藏，用户在“设置 → 菜单 → 左侧菜单”开启唯一 key `dn-system` 后，侧栏显示 龙之谷父入口和周常、角色、进程三个子页面；站内消息使用不带分组标题、独立且默认显示的唯一 key `site-messages`，也可在同一处单独隐藏。登录后标题栏显示全局消息盒子和个人头像，消息盒子的“查看全部消息”跳转到独立站内消息页面。

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

当前规则的隔离回归测试位于 `internal/dn/rules_test.go` 与 `official_sync_test.go`，覆盖委托计数联动、消息输入校验、分页边界及官网响应解析；不依赖已移除的本地存储服务或真实官网请求。

主窗口支持快速启动，与小窗共用启动及扫描刷新链路。Windows 和 macOS 的启动路径均通过弹窗配置、修改，保存后页面只保留入口；macOS 支持 Firefox.app 与其可执行文件，详见[全局快捷键](shortcut.md)。

周常数据库回归：`DN_TEST_DATABASE_URL=... go test ./internal/dn -run TestWeeklyPlanCurrentSchema -v`。测试只创建连接内临时表，验证当前结构的增删改查、重置/同步和账号隔离；未设置独立测试数据库连接时明确跳过，不读取持久业务数据。

## 列表加载反馈

角色和周常列表首次读取使用共享 `QueryFeedback` 骨架屏；周常通过其 `loadingContent` 插槽提供 `DnWeeklyPlanSkeleton`，复用正式卡片的网格、边距、头像、委托面板、三项开关与页脚布局，标准字号下占位卡片与无备注短名称卡片的宽高一致，窄卡片同步切换单列开关，长名称或备注加载后按真实内容自然增高；骨架不包含可聚焦控件，加载播报和 reduced motion 由共享反馈组件统一处理。再次读取时保留原数据，并标注刷新中。加载失败显示可重试错误，不显示误导性的空记录；周常角色选项失败也不会提示用户创建角色。查询使用 `useRequestGuard`，只接受最新请求结果，卸载后的响应不会更新列表。后端数据契约保持不变。
