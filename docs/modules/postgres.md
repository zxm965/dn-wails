# PostgreSQL 基础设施

## 模块目标

统一数据库连接池的创建配置，避免账号、DN、快速笔记和任务分别维护相同策略；各服务仍拥有独立连接池及业务规则。

## 目录与职责

- `internal/platform/postgres/pool.go`：解析连接串、配置连接上限与空闲/生存时间，创建延迟连接的 pgxpool。
- `internal/platform/postgres/pool_test.go`：无真实数据库的连接串解析、配置与错误链回归测试。
- 各业务模块的 `postgres_service.go`：提供连接上限与错误上下文，负责 Ping、表结构检查、SQL、身份隔离与 Close。

## 依赖关系与核心链路

```text
React 功能模块 → 功能 API → Wails 生成绑定 → application.App
  → account / dn / quicknotes / tasks.PostgresService
  → platform/postgres.NewPool → pgxpool
```

组合根创建各服务时调用 `NewPool`；创建时不主动连接数据库，连接可用性继续在 Service 初始化时检查。连接池不会在服务之间共享，关闭其中一个不会关闭其他服务的池。

## 数据契约

`NewPool(databaseURL, service string, maxConns int32) (*pgxpool.Pool, error)`：连接串先去除首尾空白，`service` 用于错误上下文，`maxConns` 由调用方传入正数。

| 策略 | 值 |
| --- | --- |
| 最大连接数 | 账号、快速笔记、任务为 2；DN 为 4 |
| 最小连接数 | 0 |
| 最大空闲时间 | 5 分钟 |
| 最大生存时间 | 30 分钟 |

上述策略覆盖连接串中的同名池参数；其他 pgx 配置继续保留。

## 错误与边界

- 解析和创建失败分别补充 `parse <service> database connection` 与 `create <service> database pool` 上下文，以 `%w` 保留错误链。
- 业务错误、SQL 约束映射、请求超时、事务、表结构检查与资源关闭留在调用方。
- 更新源的一次性查询配置不接入此长期连接池策略。

## 接入与验证

需要相同长期池策略的数据库适配可调用 `NewPool`，并继续由自己的生命周期关闭池；本模块不暴露 Wails 方法，也不改变前端 DTO 或绑定。

```bash
go test ./internal/platform/postgres
go test ./...
```

测试不连接数据库；实际账号、任务与笔记读写仍需在配置 PostgreSQL 的环境中验证。
