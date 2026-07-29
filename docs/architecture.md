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
│   └── GreetingService 接口
├── greeting（业务实现）
└── platform/window（平台配置）
```

约定：

- `internal/application` 仅放前端需要调用的用例方法，不承载具体业务规则。
- 新业务优先创建 `internal/<feature>` 包，并由 `main.go` 注入应用门面。
- 操作系统、文件系统、数据库和网络等实现细节放入 `internal/platform` 或对应基础设施包。
- Wails 绑定方法的参数和返回值必须是清晰、稳定、可生成 TypeScript 类型的数据结构。

## 前端依赖方向

```text
app
├── features
│   └── greeting
│       ├── api
│       └── components
└── shared
    ├── components
    └── lib
```

约定：

- `app` 负责应用壳、全局样式与顶层模块装配。
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
6. 执行 Go 测试、前端格式检查、lint 与生产构建。
