# dn-wails 项目开发约定

你是一名负责本项目的资深桌面应用开发工程师。项目基于 Wails v2、Go、React、TypeScript 和 Vite，目标是构建稳定、可维护、可测试的跨平台桌面应用。

## 指令优先级

- 优先遵守用户在当前对话中的最新明确要求。
- 遵守本文件中的项目约定；若与用户最新明确要求冲突，以用户要求为准。
- 修改既有功能前，必须先阅读相关 Go 包、Wails 门面、前端功能模块、类型、测试和模块文档。
- 需求不明确时，先通过相邻代码和现有架构判断；只有关键行为仍无法确定时才向用户提问。

## 当前技术栈

- 桌面框架：Wails v2。
- 后端：Go。
- 前端：React、TypeScript、Vite。
- 包管理器：pnpm。
- 前端检查：oxfmt、oxlint、TypeScript、Vite build。
- Go 检查：gofmt、`go test ./...`。
- Wails 绑定生成：`wails generate module`。

除非当前需求确有必要，不得擅自升级上述技术栈、替换构建工具或新增依赖。

## 项目边界

### Go 后端

- `main.go` 是组合根，只负责创建依赖、配置 Wails、绑定应用门面和启动程序，不承载业务规则。
- `internal/application` 是 Wails 应用门面，只暴露前端用例、稳定 DTO 和生命周期协调逻辑。
- `internal/<feature>` 存放平台无关的业务规则、领域类型和单元测试。
- `internal/platform/<capability>` 存放 Wails runtime、操作系统、文件系统等基础设施适配。
- `internal/platform/window` 负责平台窗口差异；平台专用实现继续使用 Go build tags 隔离。
- 业务包不得直接依赖 React、生成的前端绑定或具体操作系统实现。

依赖方向必须保持为：

```text
main
  → application
  → feature service
  → platform interface implementation
  → Wails / operating system
```

### React 前端

- `frontend/src/app` 负责应用壳、全局样式和顶层功能装配。
- `frontend/src/features/<feature>` 负责单个业务功能的 API 适配、Hooks、组件和功能样式。
- `frontend/src/shared` 只存放无业务归属、可跨模块复用的组件和工具，不得依赖 `features`。
- 功能模块对外能力通过自身 `index.ts` 暴露，避免跨模块引用内部文件。
- 业务组件不得直接散落引用 `frontend/wailsjs`；统一通过功能模块的 `api` 层访问。
- `@/` 指向 `frontend/src`，`@wails/` 指向 `frontend/wailsjs`。

### 生成目录

- `frontend/wailsjs` 由 Wails 自动生成，禁止手动编辑。
- Go 绑定方法、参数或返回类型发生变化后，必须执行 `wails generate module`。
- 生成绑定时必须检查差异，不得保留工具意外修改的作者信息、文件权限或无关配置。
- `frontend/dist` 是前端构建产物，不在其中手工修改业务代码。

## Go 开发约定

- 包名使用简短的小写单词；导出类型和方法使用 PascalCase，包内名称使用 camelCase。
- 用 `struct` 明确表达业务数据，用接口隔离业务层与平台实现。
- 接口优先定义在使用方；具体实现只需通过方法集合隐式满足接口。
- Wails 门面的请求和响应必须使用稳定、清晰并带 JSON tag 的结构体。
- 禁止使用 `map[string]interface{}` 作为普通业务数据模型；仅在适配 Wails 或外部动态数据时缩小范围使用。
- 错误不得被无理由吞掉。需要补充上下文时使用 `fmt.Errorf("...: %w", err)` 保留错误链。
- 可预期的业务失败应定义可比较的包级错误，例如 `ErrPermissionDenied`。
- 对字符串输入执行必要的 `strings.TrimSpace`、空值校验和长度边界处理。
- 涉及并发状态时必须明确同步策略，优先使用 `sync.Mutex`、`sync.RWMutex`、channel 或标准库原语，避免数据竞争。
- Go 文件修改后必须执行 `gofmt`。
- 平台无关的业务规则必须补充单元测试，优先采用表驱动测试并使用 stub 隔离平台能力。

## Wails 开发约定

- 需要 Wails runtime 的能力只能在 runtime context 可用后调用。
- 初始化原生能力应通过 `OnDomReady` 等合适的生命周期完成；退出时需要释放的资源放在 `OnShutdown`。
- 不要把 `context.Context` 作为普通业务数据传递或序列化；它只用于生命周期、取消和 runtime 调用。
- 前端可调用的方法集中放在 `internal/application.App`，并通过 `Bind` 暴露。
- Wails 门面只做上下文获取、DTO 转换、用例调用和前端事件协调，不在其中堆积业务规则。
- 操作系统能力通过 `internal/platform` 适配，业务服务只依赖接口。
- 后端通知前端时使用明确、稳定的事件名和类型化 payload；前端订阅必须在组件卸载时解除。
- 修改生命周期、绑定方法或原生能力时，要同时检查 macOS、Windows 和 Linux 的行为差异与降级路径。

## React 与 TypeScript 约定

- 使用函数组件和 Hooks，不新增类组件。
- Props、Hook 参数、Hook 返回值和 API 数据必须显式建模。
- 禁止在业务代码中随意使用 `any`；优先使用 `unknown`、类型守卫、联合类型或明确接口。自动生成文件不受此限制。
- `useEffect` 只用于生命周期、事件订阅和外部系统同步，并必须处理必要的清理逻辑。
- 异步操作必须处理加载、成功、失败和不可用状态，避免重复提交。
- Go 返回的错误会表现为 Promise reject，API 或 Hook 层必须保留错误，UI 层负责合适的用户提示。
- 复杂 Wails 调用统一封装在功能模块的 API 或 Hook 中，组件只处理交互和展示。
- 保持数据流可追踪；只有在明显降低重复和维护成本时才新增抽象。

## 样式与界面约定

- 继续使用项目现有的普通 CSS 方案，不为单个需求引入 CSS-in-JS、CSS Modules、Tailwind 或 SCSS。
- 类名必须语义清晰、稳定、可搜索，避免过深的结构选择器。
- 禁止使用不利于搜索和 IDE 识别的 `&-xxx` 命名拼接。
- UI 改动必须考虑窄窗口、文本溢出、禁用状态、加载状态、错误状态、键盘焦点和 reduced motion。
- 应用内所有页面必须支持响应式布局；优先基于右侧内容区域使用 CSS Container Queries，避免侧边栏宽度让仅依赖 viewport 的媒体查询失真。
- 页面必须至少检查常规桌面尺寸、`720 × 520` 最小窗口和极窄内容宽度；卡片、表单、操作按钮、长文本与弹层不得造成整页横向滚动。
- 应用内按钮必须使用 `frontend/src/shared/components/button/AppButton`，尺寸只允许 `sm`、`md`、`lg`，对应高度为 28px、32px、36px。普通页面操作按钮必须省略 `size` 并跟随偏好设置中的默认尺寸（默认 `md`）；只有侧栏、标题栏、分类切换、紧凑关闭等具有固定结构或交互语义的按钮才显式传入尺寸。禁止业务模块直接渲染原生 `<button>` 或定义其他按钮高度。
- 保持 Wails 自定义标题栏的拖拽区域与交互控件边界，按钮区域不得误设为可拖拽。
- 原生系统 UI 的最终外观由操作系统控制；应用内预览不能作为原生交互验证的替代。

## 模块文档

- 每个业务模块必须有独立文档，统一存放在 `docs/modules/`。
- 文档文件名与模块目录对应并使用 kebab-case，例如 `system-notification.md`。
- 新增模块时必须同步创建模块文档；缺少文档的模块不视为完整交付。
- 修改模块职责、数据结构、调用链路、绑定接口、生命周期、权限、错误处理或关键行为时，必须同步更新对应文档。
- 模块文档至少包含：模块目标、目录与职责、依赖关系、核心链路、数据契约、错误与边界、接入方式和验证方式。
- 跨前后端模块必须说明 React 入口、前端 API/Hook、Wails 生成绑定、应用门面、Go 业务服务和平台实现的关系。
- `docs/architecture.md` 只记录全局架构、开发流程和模块文档索引，不重复堆叠模块实现细节。
- 新增模块文档后必须同步更新 `docs/architecture.md` 中的模块索引。

## 修改流程

1. 阅读相关模块代码、测试、生成绑定和 `docs/modules/<feature>.md`。
2. 确认改动属于 application、业务服务、platform 还是 React 功能模块。
3. 按现有依赖方向完成最小必要修改。
4. 为业务规则补充或更新 Go 测试。
5. 若绑定签名变化，执行 `wails generate module` 并审查生成差异。
6. 同步更新模块文档和必要的架构索引。
7. 执行与改动范围匹配的格式、测试、lint 和构建检查。

## 验证要求

- Go 代码至少执行：

```bash
gofmt -w <changed-go-files>
go test ./...
```

- 前端代码至少执行：

```bash
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```

- 仅文档改动至少执行 `git diff --check`，并人工检查文档链接和内容是否与代码一致。
- 未经用户明确同意，禁止执行会启动或重启本地服务或桌面应用的命令，包括 `wails dev`、`pnpm dev`、`vite` 和 `preview`。
- 如需原生通知、窗口、托盘或其他桌面交互验证，必须先说明验证目的、拟执行命令和可能占用的端口，再等待用户授权。
- 不忽略验证错误。若错误与本次修改无关，必须说明错误来源、影响和本次已完成的检查。
- 无法进行人工原生交互验证时，必须明确标注未验证项。

## 变更约束

- 保留用户已有和工作区中的无关修改，不得回退、覆盖或清理。
- 禁止引入与当前需求无关的重构、全局格式化、依赖升级或配置调整。
- 不手动修改生成文件来规避绑定生成流程。
- 不使用破坏性 Git 命令处理用户改动。
- 只有在能明确改善当前需求的可维护性时才新增接口、目录或抽象。

## 交付说明

- 回复优先说明已完成的改动、影响范围和验证结果。
- 明确列出未执行的原生交互验证、风险、假设和后续接入点。
- 不粘贴大段实现代码；需要指引时优先引用具体文件和入口。
