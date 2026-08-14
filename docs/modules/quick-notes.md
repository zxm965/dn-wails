# 云端快速笔记模块

## 模块目标

提供独立于 DN 业务页面的快速笔记能力，支持新建、编辑、搜索、置顶、自动保存和软删除。笔记保存在 PostgreSQL 的 `app_quick_note` 表中，并复用当前应用账号会话确定数据归属，不在本地配置目录保存笔记正文。

## 目录与职责

- `internal/quicknotes/model.go`：笔记 DTO、输入校验、自动标题和可比较错误。
- `internal/quicknotes/postgres_service.go`：PostgreSQL 查询、保存、软删除、表结构检查和只读健康检查。
- `internal/quicknotes/unavailable_service.go`：数据库未配置时的明确降级实现，并向运行状态报告不可用。
- `internal/application/quicknotes.go`：提供给前端的 Wails 门面方法。
- `frontend/src/features/quick-notes/api/`：生成绑定适配和前端类型。
- `frontend/src/features/quick-notes/components/`：笔记列表、搜索、编辑器和自动保存状态。
- `frontend/src/shared/navigation/menuConfig.ts`：注册不带分组标题的“快速笔记”入口。

## 依赖关系

```text
QuickNotesPanel
  → quick-notes/api
  → frontend/bindings
  → application.App
  → quicknotes.PostgresService
      → account.PostgresService.CurrentUserID（只读取当前账号标识）
      → PostgreSQL app_quick_note
```

快速笔记只复用现有账号会话，不访问角色、周计划、站内消息等 DN 业务数据。`quicknotes.PostgresService` 使用独立的小型连接池，应用关闭时由 Wails Service 生命周期统一释放。

## 数据表

`app_quick_note` 的核心字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `bigserial` | 笔记主键。 |
| `owner_id` | `integer` | 当前账号 ID，外键关联 `sys_user.id`。 |
| `title` | `varchar(120)` | 笔记标题。 |
| `content` | `text` | 笔记正文。 |
| `is_pinned` | `boolean` | 是否置顶。 |
| `created_at` | `timestamptz` | 创建时间。 |
| `updated_at` | `timestamptz` | 最近保存时间。 |
| `deleted_at` | `timestamptz` | 软删除时间，活动笔记为空。 |

活动笔记索引按 `owner_id`、置顶状态、更新时间和主键排序。所有查询、更新和删除同时限制 `owner_id`，不能通过传入其他账号的笔记 ID 访问数据。

## 数据契约

```ts
interface QuickNote {
  id: number;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface QuickNoteInput {
  id: number;
  title: string;
  content: string;
  pinned: boolean;
}
```

Wails 门面提供：

- `ListQuickNotes`：返回当前用户的活动笔记，置顶优先并按更新时间倒序。
- `SaveQuickNote`：`id=0` 时新建，否则更新当前用户已有笔记。
- `DeleteQuickNote`：按当前用户执行软删除。

## 核心链路

### 加载与登录

```text
进入快速笔记路由
  → App 根据 requiresAuth 检查全局账号状态
  ├── 未登录：显示登录/注册界面
  └── 已登录：ListQuickNotes
      → CurrentUserID
      → 查询当前 owner_id 的活动笔记
```

### 自动保存

- 标题、正文或置顶状态变化后等待 700ms，再提交完整 `QuickNoteInput`。
- 切换笔记、新建笔记或离开页面前会尝试保存仍未提交的草稿。
- 用户可使用保存按钮或 `⌘/Ctrl + S` 立即保存，使用 `⌘/Ctrl + N` 新建笔记。
- 保存失败不会清空本地编辑状态，并通过 Toast 与编辑器状态提示错误。

## 错误与边界

- 数据库未配置时使用 `UnavailableService`，页面显示云端服务不可用，不回退为本地笔记。
- 应用启动时只检查 `app_quick_note` 是否存在，不从客户端自动执行 DDL。
- 未登录时返回现有账号模块的未认证错误。
- 标题为空时使用正文第一条非空行，正文也为空时使用“未命名笔记”。
- 标题最多 120 个 Unicode 字符，正文最多 100,000 个 Unicode 字符。
- 删除采用软删除；重复删除或访问其他用户的 ID 返回 `ErrNoteNotFound`。
- 当前为“云端优先”模式，不提供离线缓存；网络中断时保留当前编辑草稿并提示保存失败。

## 接入方式

部署前由数据库管理员按当前版本所需结构准备 `app_quick_note` 表、用户外键和活动笔记排序索引。桌面应用运行账号只需要 `app_quick_note` 的查询、新增和更新权限，以及现有会话查询权限。数据库结构准备完成后重新启动应用即可使用。

## 响应式处理

- 页面基于右侧内容区域使用 Container Queries。
- 常规宽度使用“笔记列表 + 编辑器”双栏布局。
- 内容宽度小于 700px 时切换为上下布局，列表限制高度并独立滚动。
- 标题、列表时间和底部状态均具有文本溢出保护，不产生整页横向滚动。
- 所有操作使用共享 `Button`，搜索、标题和正文复用共享表单控件。

## 验证

```bash
gofmt -w internal/quicknotes/*.go internal/application/quicknotes.go
go test ./...
wails3 generate bindings -clean=true -ts
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```

自动保存、真实数据库结构、跨设备同步和登录后的数据隔离仍需在已配置 PostgreSQL 的桌面环境中人工验证。
