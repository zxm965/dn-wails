# 云端任务模块

## 模块目标

提供与 Google Tasks 核心任务工作流一致的云端任务管理：多清单、任务与子任务、星标、日期时间、截止时间、重复计划、完成/恢复、排序、跨清单移动、搜索、打印、到期系统通知和批量清理。数据按当前 Cull Pear 账号隔离并保存在 PostgreSQL，不依赖 Google 账号或 Google Workspace。

Google 邮件、Calendar、Chat、Docs、Drive 的来源链接、协作分配和附件属于外部产品集成，不属于本模块的数据契约；本模块覆盖桌面应用内可独立完成的任务管理功能。

## 目录与职责

- `database/migrations/20260908_create_tasks.sql`：创建 `app_task_list`、`app_task`、约束和查询索引。
- `internal/tasks/model.go`：稳定 DTO、输入校验、重复规则和下次发生时间计算。
- `internal/tasks/postgres_service.go`：账号隔离的 PostgreSQL 清单/任务操作、重复实例生成和到期提醒领取。
- `internal/tasks/unavailable_service.go`：数据库不可用时的明确降级。
- `internal/application/tasks.go`：Wails 应用门面。
- `frontend/src/features/tasks/api/tasksApi.ts`：生成绑定适配和前端类型。
- `frontend/src/features/tasks/components/TasksPanel.tsx`：清单导航、搜索、排序、任务列表、完成区和打印入口。
- `frontend/src/features/tasks/components/TaskEditorDialog.tsx`：任务详情、日期、截止时间、星标、清单和重复规则编辑。
- `frontend/src/features/tasks/components/TaskReminderMonitor.tsx`：登录期间轮询已到期任务并复用系统通知模块发送提醒。
- `frontend/src/shared/navigation/`：注册需要登录且默认显示的“任务清单”页面。

## 依赖关系

```text
TasksPanel / TaskReminderMonitor
  → tasks/api
  → frontend/bindings
  → application.App
  → tasks.PostgresService
      → account.PostgresService.CurrentUserID
      → PostgreSQL app_task_list / app_task

TaskReminderMonitor
  → system-notification/useSystemNotification
  → notification.Service
  → Wails 原生通知
```

## 数据表

### `app_task_list`

| 字段 | 说明 |
| --- | --- |
| `id` | 清单主键。 |
| `owner_id` | `sys_user.id`，所有操作同时限制当前账号。 |
| `title` | 最长 120 个 Unicode 字符的清单名称。 |
| `sort_order` | 用户自定义清单顺序。 |
| `is_default` | 当前账号的默认清单；活动清单中最多一个。 |
| `created_at` / `updated_at` / `deleted_at` | 创建、更新和软删除时间。 |

### `app_task`

| 字段 | 说明 |
| --- | --- |
| `id` / `owner_id` / `list_id` | 任务主键、数据所有者和所属清单。 |
| `parent_id` | 一级子任务的父任务；服务禁止继续嵌套。 |
| `title` / `details` | 标题和详细信息。 |
| `scheduled_at` / `deadline_at` / `time_zone` | 计划日期时间、截止日期时间和创建者时区，用于保持重复任务的本地墙上时间。 |
| `is_starred` / `starred_at` | 星标状态和最近加星标时间；“最近加星标”直接按该时间排序。 |
| `completed_at` | 完成时间；空值表示待完成。 |
| `sort_order` | 同一清单和父任务下的自定义顺序。 |
| `repeat_*` | 天/周/月/年频率、间隔，以及永不/日期/次数结束条件。 |
| `repeat_series_id` | 重复任务系列标识，用于删除整个系列。 |
| `notification_sent_for` | 最近一次已领取提醒对应的时间，避免重复发送。 |
| `created_at` / `updated_at` / `deleted_at` | 创建、更新和软删除时间。 |

迁移脚本使用事务、外键、检查约束、默认清单唯一索引，以及清单顺序、任务顺序、完成状态、星标、提醒和重复系列索引。桌面客户端启动时只检查表是否存在，不自动执行 DDL。

## 数据契约与 Wails 接口

- `TaskWorkspace`：一次返回当前账号的全部活动清单和任务，便于前端保持可追踪的本地视图状态。
- `SaveTaskList` / `DeleteTaskList` / `ReorderTaskLists`：清单新建、重命名、删除和排序。
- `SaveTask`：`id=0` 新建，否则更新；保存时校验账号、清单、父任务和重复规则。
- `SetTaskCompleted`：完成或恢复任务；完成重复任务时按规则创建下一次实例。
- `DeleteTask`：删除普通任务及子任务，或删除重复任务整个系列。
- `DeleteCompletedTasks`：清理指定清单的已完成任务。
- `ReorderTasks`：保存“我的顺序”。
- `ClaimDueTaskReminders`：原子领取到期且尚未通知的任务，避免同一计划时间重复提醒。

时间字段通过 Wails 使用 RFC 3339 UTC 字符串，页面使用本地 `datetime-local` 输入并在 API 边界转换，同时保存 IANA 时区。空时间使用空字符串，避免动态 map 和不稳定的可空类型。

## 核心链路

### 首次进入与默认清单

```text
进入任务页
  → App 路由守卫确认已登录
  → TaskWorkspace
  → CurrentUserID
  → 当前账号没有活动清单时创建“我的任务”
  → 返回清单和活动任务
```

至少保留一个任务清单。删除清单会软删除其中的任务；删除默认清单时自动选择顺序最前的剩余清单作为默认清单。

### 重复任务

- 重复频率支持每天、每周、每月和每年，可设置 1–999 的间隔。
- 结束条件支持永不结束、指定日期、指定总次数。
- 下一实例按任务保存的 IANA 时区计算，月末和闰年使用目标月份最后一天钳制，避免跨月和夏令时造成时间漂移。
- 子任务不能重复；已有子任务的任务不能改为重复任务；重复任务不能移动到其他清单。
- 完成当前实例时保留完成记录并创建下一实例。次数结束条件递减到最后一次时，新实例自动变为不重复。
- 删除重复任务时页面明确提示并删除整个系列。

### 提醒

登录且系统通知已获授权时，根级 `TaskReminderMonitor` 每分钟领取一次已到达计划时间的任务并发送系统通知。点击通知会切换到任务页面。通知仍遵守全局“启用通知 / 显示预览 / 勿扰”设置；未授权、被禁用或平台不支持时不主动弹权限请求。

## 页面功能

- 创建、重命名、删除和调整清单顺序；清单行悬浮或键盘聚焦时仅显示“更多”入口，用户主动点击后才通过 Base UI Popover 展示 Toolbar 操作栏。弹层由 Portal 渲染到滚动容器外以避免末项裁剪，并支持方向键循环焦点。
- 右侧工作区采用卡片化标题、快速添加、任务行和已完成分组，统一使用圆角、柔和边框、层次阴影及悬浮反馈，并兼容窄内容宽度。
- 快速添加任务；详情弹层可编辑标题、说明、所属清单、星标、日期时间、截止时间和重复规则。
- 添加一级子任务；完成父任务时同时完成直接子任务。
- 星标聚合视图；清单内搜索标题和详情。
- 按“我的顺序、日期、截止时间、最近加星标、标题”排序；“我的顺序”下支持拖动待完成根任务。
- 完成/恢复任务；折叠或展开已完成区；批量删除清单中的已完成任务。
- 截止超时状态、高密度长文本截断、空/加载/错误/禁用状态。
- `⌘/Ctrl + N` 添加任务、`⌘/Ctrl + F` 聚焦搜索，快速添加支持 Enter。
- 打印入口和打印样式；深色外观复用全局主题。

## 错误与边界

- 所有清单和任务查询都同时限制 `owner_id`；不能通过其他账号的 ID 访问或修改数据。
- 任务标题必填且最多 255 个字符，详情最多 100,000 个字符。
- 子任务最多一级并必须和父任务位于同一清单。
- 数据库未配置、迁移未应用、未登录、记录不存在和状态冲突均保留可识别错误，不回退到本地明文文件。
- 删除使用软删除。数据库外键用于完整性，业务删除不会物理清除历史行。
- 当前提醒以 `scheduled_at` 优先、否则使用 `deadline_at`；应用未运行期间错过的提醒会在下次登录运行时补发。
- 编辑任务时，更新 SQL 将重复频率参数显式转换为 `varchar`，与 `repeat_frequency` 列一致，避免同一参数用于列赋值和“不重复”判断时产生 `42P08` 类型推断冲突。

## 接入方式

部署前由数据库管理员执行：

```bash
psql "$DATABASE_URL" -f database/migrations/20260908_create_tasks.sql
```

应用数据库账号需要两张任务表的查询、新增和更新权限，以及现有会话所需的 `sys_user` 查询权限。迁移完成后重新启动应用即可使用任务模块。

## 响应式与可访问性

- 页面基于右侧内容区使用 Container Queries；宽内容区为“清单侧栏 + 任务区”，窄于 720px 时改为上下布局。
- 窄内容宽度下工具栏纵向排列；任务标题、详情、清单名称和计数均提供溢出保护。
- 所有交互按钮使用共享 `Button`，编辑表单复用共享 Input、Textarea、Select、Switch 和 Dialog。
- 完成、星标、编辑、添加子任务和清单排序均提供可读的 `aria-label` 与键盘焦点。
- reduced motion 下取消任务行过渡；打印时隐藏清单侧栏、搜索、快速添加等交互控件。

## 验证

```bash
gofmt -w internal/tasks/*.go internal/application/tasks.go
go test ./...
wails3 generate bindings -clean=true -ts
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```

任务保存的 PostgreSQL 回归测试可连接已运行的测试数据库：

```bash
TASKS_TEST_DATABASE_URL='<测试数据库连接串>' go test ./internal/tasks -run TestPostgresSaveTaskEdit -v
```

未设置 `TASKS_TEST_DATABASE_URL` 时该测试明确跳过；测试使用单连接、仅含 `pg_temp` 的搜索路径和按迁移脚本创建的临时表，不读取或修改持久业务表。覆盖普通任务编辑、各重复频率启用与保留、停止重复、星标变化、可空日期及提醒领取状态保留/重置。

真实 PostgreSQL 部署迁移、系统通知点击、打印对话框和各平台原生表现仍需在已配置数据库的桌面应用中人工验证。
