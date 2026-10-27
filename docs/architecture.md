# 项目架构

## 设计目标

- 入口稳定：`main.go` 只负责实例化依赖、配置 Wails v3 App/Window/Service/SystemTray 与启动应用。
- 业务内聚：后端和前端均按业务功能组织，新增功能不会继续扩大入口文件。
- 边界清晰：前端不在组件内直接散落 Wails 生成代码引用，统一通过功能模块的 API 层访问。
- 平台隔离：macOS 与其他系统的窗口差异集中在 `internal/platform/window`。
- 可测试：业务规则放在不依赖 Wails runtime 的 Go 包中，可直接运行单元测试。

发布仅维护 macOS（universal）与 Windows（amd64）桌面端；构建入口固定使用 pnpm。macOS 在 macOS 主机构建，Windows 使用纯 Go 构建并可交叉编译；不维护 Linux、移动端、服务端或 Docker 构建模板。非目标平台的 Go 不可用适配仍用于明确降级与包级检查。

依赖基线（2026-10-27）：Wails Go 模块、前端 runtime 和 CI CLI 统一为正式版 `v3.0.0`；Go 工具链使用 `1.26.10`（保持 macOS 12 兼容，最低语言版本仍为 `1.26.0`），CI Node.js 使用 `26.12.1`。lucide-react、React Router、Vite、oxfmt 和 oxlint 分别更新为 `1.61.0`、`8.5.0`、`8.3.5`、`0.74.0` 和 `1.89.0`；其余前后端已声明依赖经核对保持最新稳定版本（含 TypeScript `7.0.2`）。pnpm 使用 `frontend/package.json` 的 `packageManager` 版本 `12.15.0`，CI 从同一文件读取；依赖解析结果分别由 `pnpm-lock.yaml` 与 `go.sum` 记录。

## 后端依赖方向

```text
main
├── application（Wails 绑定门面）
│   ├── SystemNotificationService 接口
│   ├── ApplicationUpdateService 接口
│   ├── AccountService 接口
│   ├── DnService 接口
│   ├── QuickNotesService 接口
│   └── TasksService 接口
├── account（全局账号、持久会话与 PostgreSQL 身份服务）
├── appupdate（版本比较、更新检查与安装用例）
├── buildinfo（构建期版本与发布元数据）
├── appconfig（应用全局配置）
├── dn（DN 角色、周计划、站内消息与官网同步）
├── lifecycle（应用生命周期状态）
├── installation（持久安装身份与版本记录）
├── nativekit（原生能力规则）
├── notification（消息通知规则）
├── quicknotes（云端快速笔记规则与 PostgreSQL 持久化）
├── tasks（云端任务、重复计划与 PostgreSQL 持久化）
├── settings（应用设置）
├── singleinstance（第二实例数据规则）
├── storage（本地存储）
├── windowmanager（窗口业务规则）
└── platform
    ├── nativekit（Wails 原生能力适配）
    ├── notification（Wails 原生通知适配）
    ├── appupdate（数据库更新源、Release 元数据校验与平台安装器）
    ├── singleinstance（单实例配置）
    └── window（平台窗口配置）
```

约定：

- `internal/application` 仅放前端需要调用的用例方法，不承载具体业务规则。
- 新业务优先创建 `internal/<feature>` 包，并由 `main.go` 注入应用门面。
- 操作系统、文件系统、数据库和网络等实现细节放入 `internal/platform` 或对应基础设施包。
- Wails v3 Service 方法和 typed event payload 必须是清晰、稳定、可生成 TypeScript 类型的数据结构。
- 系统通知统一通过 `internal/notification` 发送；业务模块只提供发送者、消息内容和会话标识，不直接依赖 Wails runtime。

## 前端依赖方向

```text
app
├── appConfig（只读全局展示配置）
├── AppProviders（顶层 Provider 组合与依赖顺序）
├── features
│   ├── calendar
│   │   ├── components
│   │   ├── data
│   │   └── model
│   ├── app-update
│   │   ├── api
│   │   └── context
│   ├── account
│   │   ├── api
│   │   ├── components
│   │   └── context
│   ├── dn-system
│   │   ├── api
│   │   ├── components
│   │   └── model
│   ├── site-messages
│   │   ├── api
│   │   ├── components
│   │   └── context
│   ├── settings
│   │   ├── api
│   │   ├── components
│   │   └── context
│   ├── quick-notes
│   │   ├── api
│   │   └── components
│   ├── tasks
│   │   ├── api
│   │   └── components
│   ├── system-notification
│   │   ├── api
│   │   ├── components
│   │   └── hooks
│   └── devtools
│       └── components（含嵌入式应用概览）
└── shared
    ├── app-lifecycle
    ├── components
    │   ├── app-sidebar
    │   ├── titlebar
    │   └── ui
    ├── diagnostics
    ├── feedback
    ├── interaction（统一的 Toast 与确认框 Provider）
    ├── lib
    ├── native-kit
    ├── navigation（菜单配置、路由元数据与认证要求）
    └── window
```

约定：

- `app` 负责应用壳和顶层 Provider 装配；`features/<feature>` 拥有业务 API、状态和 UI；`shared` 提供无业务归属的基础设施，不反向依赖功能模块。
- 跨功能引用通过模块 `index.ts`；生成绑定只由 API 层访问。`@/` 指向 `frontend/src`，`@bindings/` 指向 `frontend/bindings`。
- 样式由 vanilla-extract 在构建期提取；全局主题放在 `app/styles`，组件样式就近共置。具体编码与响应式约束见 [AGENTS.md](../AGENTS.md)，控件契约见[通用 UI](modules/ui-components.md)和[按钮尺寸](modules/button-system.md)。
- 应用壳、菜单、路由与登录守卫见[桌面应用壳](modules/desktop-shell.md)；设置页与偏好持久化见[设置中心](modules/settings.md)。
- 通知与确认通过统一 Interaction Provider；公共错误消息提取规则见[应用内反馈](modules/feedback.md)。
- 数据库适配共享连接池创建配置，但由各业务服务独立持有和关闭，见 [PostgreSQL 基础设施](modules/postgres.md)。

## 新增功能流程

1. 在 `internal/<feature>` 实现并测试业务能力。
2. 在 `internal/application` 增加所需接口与 Wails 门面方法。
3. 在 `main.go` 完成具体实现的依赖注入。
4. 执行 `wails3 generate bindings -clean=true -ts` 更新前端 bindings 和 typed events。
5. 在 `frontend/src/features/<feature>` 添加 API 适配与 UI，并通过 `index.ts` 暴露公共入口。
6. 在 `docs/modules/<feature>.md` 创建或更新模块文档，并维护本文档中的模块索引。
7. 执行 Go 测试、前端格式检查、lint 与生产构建。

## 模块文档

- [应用全局配置](modules/app-config.md)
- [按钮尺寸系统](modules/button-system.md)
- [通用 UI 组件](modules/ui-components.md)
- [桌面应用壳](modules/desktop-shell.md)
- [全局账号](modules/account.md)
- [云端快速笔记](modules/quick-notes.md)
- [日历](modules/calendar.md)
- [云端任务](modules/tasks.md)
- [龙之谷](modules/dn-system.md)
- [全局快捷键与置顶小窗](modules/shortcut.md)
- [站内消息](modules/site-messages.md)
- [应用生命周期](modules/app-lifecycle.md)
- [安装身份](modules/installation-identity.md)
- [应用更新与发布](modules/app-update.md)
- [单实例](modules/single-instance.md)
- [窗口管理](modules/window-manager.md)
- [系统托盘](modules/system-tray.md)
- [系统通知](modules/system-notification.md)
- [设置中心](modules/settings.md)
- [本地存储](modules/storage.md)
- [PostgreSQL 基础设施](modules/postgres.md)
- [应用内反馈](modules/feedback.md)
- [Native Kit](modules/native-kit.md)
- [日志与诊断](modules/diagnostics.md)
- [主题与外观](modules/theme-appearance.md)
- [实验室](modules/devtools.md)
