# 项目架构

## 设计目标

- 入口稳定：`main.go` 只负责实例化依赖、配置 Wails v3 App/Window/Service/SystemTray 与启动应用。
- 业务内聚：后端和前端均按业务功能组织，新增功能不会继续扩大入口文件。
- 边界清晰：前端不在组件内直接散落 Wails 生成代码引用，统一通过功能模块的 API 层访问。
- 平台隔离：macOS 与其他系统的窗口差异集中在 `internal/platform/window`。
- 可测试：业务规则放在不依赖 Wails runtime 的 Go 包中，可直接运行单元测试。

## 后端依赖方向

```text
main
├── application（Wails 绑定门面）
│   ├── SystemNotificationService 接口
│   ├── ApplicationUpdateService 接口
│   ├── AccountService 接口
│   ├── DnService 接口
│   └── QuickNotesService 接口
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
├── features
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
    ├── lib
    ├── native-kit
    ├── navigation（菜单配置、路由元数据与认证要求）
    ├── overlay
    ├── theme
    └── window
```

约定：

- `app` 负责应用壳、全局样式与顶层模块装配。
- Vite 通过 `@vanilla-extract/vite-plugin` 在构建期提取静态 CSS；源码不保留普通 `.css` 文件。
- 全局字体、重置和主题令牌集中在 `app/styles/*.css.ts`；组件和页面使用就近共置的同名 `.css.ts`。
- 组件局部规则优先使用 `style`，仅全局根节点、第三方状态和必要的复杂关系使用 `globalStyle`；共享 UI 不使用集中式 `ui.css.ts`。
- 桌面应用壳采用“顶部标题栏 + 左侧菜单 + 右侧视图区域”的固定布局，只有系统设置入口显示分组标题。
- 左侧菜单由 `shared/navigation/menuConfig.ts` 统一维护唯一 key、可选分组、页面、图标和默认显隐；`routeConfig.ts` 统一维护页面标题、导航类型和 `requiresAuth`。侧栏渲染、偏好设置、启动页选择和应用壳路由守卫共同读取共享导航配置。快速笔记和站内消息默认显示，DN 周常与 DevTools 默认隐藏，偏好设置始终可见；DevTools 的桌面实验室使用默认关闭且受父开关约束的子偏好。
- `AccountProvider` 在应用根部恢复本地会话；需要登录的页面由 `App.tsx` 根据路由元数据统一保护，业务功能不自行实现登录状态管理。
- 主要视图统一使用共享 `PageHeader`，保持紧凑渐变页头、标题基线、说明文字和操作区响应式行为一致。
- 应用概览、常驻运行状态和所有人工验证入口统一放在“系统设置 → DevTools”；应用概览展示版本、更新通道和界面偏好，运行状态汇总生命周期、服务健康和日志诊断，手动检查更新位于偏好设置最底部，其余测试操作不进入业务页面。
- 所有页面必须支持响应式布局；页面优先基于右侧内容区域使用 Container Queries，避免侧边栏宽度导致视口媒体查询失真。
- 页面主体统一使用 `--page-content-max-width` 控制最大宽度，并复用全局间距变量，确保菜单切换时左右基线稳定；同时至少覆盖常规桌面宽度、`1024 × 768` 最小窗口和极窄内容宽度。
- 应用内按钮统一使用 `Button`，尺寸限定为 `sm=28px`、`md=32px`、`lg=36px`；普通操作跟随偏好设置中的默认尺寸（默认 `md`），结构性或固定语义按钮显式指定尺寸，业务模块不得自行定义其他按钮高度。
- Dialog、Alert Dialog、Toast、Card、表单控件、Tabs、Progress、Avatar、分页和空状态统一从 `shared/components/ui` 使用；共享 UI 只依赖主题令牌和通用基础设施，不依赖业务模块。
- `features/<feature>` 拥有该功能的请求适配、状态和 UI；跨功能引用应通过模块的 `index.ts`。
- `shared` 只放无业务归属、可稳定复用的组件与工具，禁止反向依赖 `features`。
- `frontend/bindings` 是 Wails v3 生成目录；业务代码通过功能模块下的 `api` 文件引用它。
- `@/` 指向 `frontend/src`，`@bindings/` 指向 `frontend/bindings`。

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
- [DN 周常](modules/dn-system.md)
- [站内消息](modules/site-messages.md)
- [应用生命周期](modules/app-lifecycle.md)
- [安装身份](modules/installation-identity.md)
- [应用更新与发布](modules/app-update.md)
- [单实例](modules/single-instance.md)
- [窗口管理](modules/window-manager.md)
- [系统托盘](modules/system-tray.md)
- [Overlay Manager](modules/overlay-manager.md)
- [系统通知](modules/system-notification.md)
- [设置中心](modules/settings.md)
- [本地存储](modules/storage.md)
- [应用内反馈](modules/feedback.md)
- [Native Kit](modules/native-kit.md)
- [日志与诊断](modules/diagnostics.md)
- [主题与外观](modules/theme-appearance.md)
- [DevTools](modules/devtools.md)
