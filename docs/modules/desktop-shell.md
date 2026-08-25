# 桌面应用壳

## 模块目标

提供符合常见桌面应用习惯的固定布局：顶部系统标题栏、左侧菜单、右侧可滚动视图区域；仅系统设置入口保留分组标题。

## 目录与职责

- `frontend/src/app/App.tsx`：维护当前视图并装配应用壳。
- `frontend/src/app/appConfig.ts`：为标题栏、侧边栏、页面标题和左下角状态区提供全局展示配置。
- `frontend/src/app/App.css.ts`：主工作区和右侧视图背景的局部 vanilla-extract 样式。
- `frontend/src/shared/components/titlebar/`：Wails 自定义标题栏和窗口控制。
- `frontend/src/shared/components/app-sidebar/`：左侧产品信息、分组菜单和运行状态。
- `frontend/src/shared/navigation/menuConfig.ts`：菜单唯一 key、分组、页面、图标和默认显隐配置。
- `frontend/src/shared/navigation/routeConfig.ts`：页面标题、是否需要登录和是否出现在侧栏。
- `frontend/src/features/account/`：全局登录入口、个人信息页和标题栏头像按钮。
- `frontend/src/features/devtools/`：DevTools 及其嵌入式应用概览。

## 页面结构

```text
App
├── TitleBar
│   ├── 账号入口（未登录为小人占位，登录后为头像）
│   └── 登录后：站内消息盒子
└── Workspace
    ├── AppSidebar
    │   ├── 产品信息
    │   ├── 快速笔记
    │   ├── DNTools（默认隐藏）
    │   │   ├── 周常
    │   │   ├── 角色
    │   │   └── 进程
    │   ├── 站内消息
    │   ├── 系统设置
    │       ├── 偏好设置
    │       └── DevTools（默认隐藏）
    │           └── 应用概览 / 运行状态 / 桌面实验室（可选且默认关闭）/ 文本工具
    │   └── 作者状态区
    └── View
        ├── QuickNotesPanel
        ├── DnWeeklyPlans / DnRoles
        ├── SiteMessages
        ├── AccountPanel（标题栏头像进入，不显示在侧栏）
        ├── SettingsPanel
        └── DevToolsPanel
```

## 导航约定

- 应用启动读取菜单显隐设置并进入第一个可见入口；默认配置显示快速笔记和偏好设置。需要登录的入口未认证时统一显示全局登录/注册页。
- 设置、诊断和开发能力放在“系统设置”分组中；快速笔记、DNTools和站内消息不显示分组标题。
- 应用概览作为 DevTools 的只读分类展示，不再占用独立侧栏入口。
- 测试操作不得出现在正式业务页面。
- 菜单渲染、默认入口、偏好开关和显隐判断共同读取 `menuConfig.ts`；页面标题、导航类型和认证要求读取 `routeConfig.ts`。所有菜单和子页面使用全局唯一 key 建立对应关系。
- 当前导航状态的 `AppView` 联合类型从菜单配置推导。隐藏当前功能入口时，应用自动回退到第一个可见页面；偏好设置始终可见，避免失去配置入口。
- `App.tsx` 在渲染页面前读取 `requiresAuth`：账号状态恢复期间显示加载态，未登录时显示 `AccountLogin`，业务页面不重复实现登录判断。
- `account` 是 standalone 页面，不出现在侧栏。标题栏账号入口始终可见：未登录时显示小人占位和悬浮登录提示，点击进入登录页；登录后显示个人头像，点击进入个人信息管理。退出后若仍停留在受保护页面，则立即回到全局登录入口。
- DNTools使用可展开子菜单；侧栏展开时点击父入口控制折叠，侧栏收起时悬浮或聚焦父入口会在右侧显示可点击的浮层子菜单，点击父入口直接打开周常。
- 标题栏覆盖整个应用宽度，侧边栏只存在于标题栏下方的工作区。
- macOS 使用原生左侧红绿灯时，应用标题保持窗口几何居中，账号与消息操作贴近最右侧并保留 8px 安全边距；Windows/Linux 的账号与消息操作位于最小化、最大化、关闭按钮左侧，并通过轻分隔线区分应用操作和系统窗口操作。
- 应用主名称统一读取根目录 `.env` 的 `APP_DISPLAY_NAME`，不得在组件内硬编码。
- 侧栏左下角作者名称统一读取根目录 `.env` 的 `APP_AUTHOR_NAME`，展开时显示完整文字，折叠时保留状态点和悬停标题。
- 标题栏与侧边栏的完整 DOM 子树禁止文字选择和图片拖拽，避免窗口拖动或侧栏缩放时出现网页选区与拖影。
- 右侧内容视图不受该限制，正文和诊断信息仍允许正常选择复制。

## 响应式处理

- 侧边栏右边缘提供可悬停的拖拽分隔栏，可连续调整宽度。
- 允许宽度范围为 `64px–220px`，默认宽度为 180px，并通过 `localStorage` 记住上次宽度。
- 宽度小于 104px 时进入图标模式，隐藏产品文字、分组名称和菜单文字；图标模式下菜单项之间保留 8px 间距。
- 窗口宽度不超过 820px 时，侧边栏自动收为 64px 图标模式并暂停拖拽；窗口恢复后继续使用用户保存的宽度。
- 拖拽分隔栏支持键盘操作：左右方向键每次调整 8px，Home 收起到最小值，End 展开到最大值。
- 图标模式仍保留按钮的 `title`、可访问名称、选中状态和键盘焦点。
- 右侧视图使用独立滚动，标题栏和左侧菜单保持固定。
- `app-content` 是页面级 inline-size 容器；页面优先根据实际内容宽度使用 Container Queries，不只根据整个窗口宽度判断断点。
- 页面主体最大宽度统一使用 `--page-content-max-width`，四周间距统一跟随 `--page-padding-inline`，保证菜单切换时内容基线不跳动；卡片继续使用 `--panel-padding` 和 `--panel-radius`，窄窗口自动缩小。
- 所有按钮统一使用 `Button`：侧栏导航和标题栏窗口控制固定使用 `lg`，分类切换固定使用 `md`，紧凑关闭按钮固定使用 `sm`；普通页面操作跟随偏好设置中的默认尺寸。
- 概览摘要卡片会从四列降为双列和单列，版本更新区域在窄宽度下改为纵向排列，禁止产生横向页面滚动。
- 项目默认窗口尺寸为 `1280 × 800`，最小窗口尺寸固定为 `1024 × 768`。

## 开发热更新

- `frontend/vite.config.ts` 读取 Wails v3 注入的 `WAILS_VITE_PORT`；未注入时使用 Wails v3 默认端口 `9245`。
- Vite 明确监听 `127.0.0.1`，与 Wails v3 dev proxy 强制使用的 IPv4 `localhost` 路径保持一致；HMR 客户端使用同一个动态端口。
- `strictPort` 保证端口被占用时直接失败并给出错误，不再静默切换端口后让 WebView 连接到错误的服务。
- `build/config.yml` 通过 Wails v3 dev mode 编排后端构建、Vite 和桌面进程；根 Taskfile 默认传入 `9245`，并在直接调用 `wails3 dev` 时跟随其 `WAILS_VITE_PORT`。
- 修改 Vite 或 vanilla-extract 配置后，当前窗口需要重新加载一次；之后 React 和 `.css.ts` 修改由 Vite HMR 实时更新。

## 验证

```bash
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```

侧边栏、登录守卫、标题栏头像、滚动和窗口控制需要人工桌面验证。
