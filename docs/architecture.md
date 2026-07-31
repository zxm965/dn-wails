# 项目架构

## 设计目标

- 入口稳定：`main.go` 只负责实例化依赖、配置窗口与启动 Wails。
- 业务内聚：后端和前端均按业务功能组织，新增功能不会继续扩大入口文件。
- 边界清晰：前端不在组件内直接散落 Wails 生成代码引用，统一通过功能模块的 API 层访问。
- 平台隔离：macOS 与其他系统的窗口差异集中在 `internal/platform/window`。
- 可测试：业务规则放在不依赖 Wails runtime 的 Go 包中，可直接运行单元测试。

## 后端依赖方向

```text
main
├── application（Wails 绑定门面）
│   ├── SystemNotificationService 接口
│   └── DnService 接口
├── appconfig（应用全局配置）
├── dn（角色、周计划、消息与本地资料）
├── lifecycle（应用生命周期状态）
├── nativekit（原生能力规则）
├── notification（消息通知规则）
├── settings（应用设置）
├── singleinstance（第二实例数据规则）
├── storage（本地存储）
├── windowmanager（窗口业务规则）
└── platform
    ├── nativekit（Wails 原生能力适配）
    ├── notification（Wails 原生通知适配）
    ├── singleinstance（单实例配置）
    └── window（平台窗口配置）
```

约定：

- `internal/application` 仅放前端需要调用的用例方法，不承载具体业务规则。
- 新业务优先创建 `internal/<feature>` 包，并由 `main.go` 注入应用门面。
- 操作系统、文件系统、数据库和网络等实现细节放入 `internal/platform` 或对应基础设施包。
- Wails 绑定方法的参数和返回值必须是清晰、稳定、可生成 TypeScript 类型的数据结构。
- 系统通知统一通过 `internal/notification` 发送；业务模块只提供发送者、消息内容和会话标识，不直接依赖 Wails runtime。

## 前端依赖方向

```text
app
├── appConfig（只读全局展示配置）
├── features
│   ├── dn-system
│   │   ├── api
│   │   ├── components
│   │   ├── context
│   │   └── model
│   ├── settings
│   │   ├── api
│   │   ├── components
│   │   └── context
│   ├── system-notification
│   │   ├── api
│   │   ├── components
│   │   └── hooks
│   └── test-tools
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
    ├── overlay
    ├── theme
    └── window
```

约定：

- `app` 负责应用壳、全局样式与顶层模块装配。
- Vite 通过 `@vanilla-extract/vite-plugin` 在构建期提取静态 CSS；源码不保留普通 `.css` 文件。
- 全局字体、重置和主题令牌集中在 `app/styles/*.css.ts`；组件和页面使用就近共置的同名 `.css.ts`。
- 组件局部规则优先使用 `style`，仅全局根节点、第三方状态和必要的复杂关系使用 `globalStyle`；共享 UI 不使用集中式 `ui.css.ts`。
- 桌面应用壳采用“顶部标题栏 + 左侧分组菜单 + 右侧视图区域”的固定布局。
- 应用概览、运行诊断和所有人工验证入口统一放在“系统设置 → 测试工具”；正式业务导航不展示概览入口。
- 所有页面必须支持响应式布局；页面优先基于右侧内容区域使用 Container Queries，避免侧边栏宽度导致视口媒体查询失真。
- 页面统一复用全局间距变量，并至少覆盖常规桌面宽度、`1024 × 768` 最小窗口和极窄内容宽度。
- 应用内按钮统一使用 `Button`，尺寸限定为 `sm=28px`、`md=32px`、`lg=36px`；普通操作跟随偏好设置中的默认尺寸（默认 `md`），结构性或固定语义按钮显式指定尺寸，业务模块不得自行定义其他按钮高度。
- Dialog、Alert Dialog、Toast、Card、表单控件、Tabs、Progress、Avatar、分页和空状态统一从 `shared/components/ui` 使用；共享 UI 只依赖主题令牌和通用基础设施，不依赖业务模块。
- `features/<feature>` 拥有该功能的请求适配、状态和 UI；跨功能引用应通过模块的 `index.ts`。
- `shared` 只放无业务归属、可稳定复用的组件与工具，禁止反向依赖 `features`。
- `frontend/wailsjs` 是生成目录；业务代码通过功能模块下的 `api` 文件引用它。
- `@/` 指向 `frontend/src`，`@wails/` 指向 `frontend/wailsjs`。

## 新增功能流程

1. 在 `internal/<feature>` 实现并测试业务能力。
2. 在 `internal/application` 增加所需接口与 Wails 门面方法。
3. 在 `main.go` 完成具体实现的依赖注入。
4. 执行 `wails generate module` 更新前端绑定。
5. 在 `frontend/src/features/<feature>` 添加 API 适配与 UI，并通过 `index.ts` 暴露公共入口。
6. 在 `docs/modules/<feature>.md` 创建或更新模块文档，并维护本文档中的模块索引。
7. 执行 Go 测试、前端格式检查、lint 与生产构建。

## 模块文档

- [应用全局配置](modules/app-config.md)
- [按钮尺寸系统](modules/button-system.md)
- [通用 UI 组件](modules/ui-components.md)
- [桌面应用壳](modules/desktop-shell.md)
- [DN 周常管理](modules/dn-system.md)
- [应用生命周期](modules/app-lifecycle.md)
- [单实例](modules/single-instance.md)
- [窗口管理](modules/window-manager.md)
- [Overlay Manager](modules/overlay-manager.md)
- [系统通知](modules/system-notification.md)
- [设置中心](modules/settings.md)
- [本地存储](modules/storage.md)
- [应用内反馈](modules/feedback.md)
- [Native Kit](modules/native-kit.md)
- [日志与诊断](modules/diagnostics.md)
- [主题与外观](modules/theme-appearance.md)
- [测试工具](modules/test-tools.md)
