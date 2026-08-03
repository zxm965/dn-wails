# 桌面应用壳

## 模块目标

提供符合常见桌面应用习惯的固定布局：顶部系统标题栏、左侧分组菜单、右侧可滚动视图区域。

## 目录与职责

- `frontend/src/app/App.tsx`：维护当前视图并装配应用壳。
- `frontend/src/app/appConfig.ts`：为标题栏、侧边栏、页面标题和左下角状态区提供全局展示配置。
- `frontend/src/app/App.css.ts`：主工作区和右侧视图背景的局部 vanilla-extract 样式。
- `frontend/src/shared/components/titlebar/`：Wails 自定义标题栏和窗口控制。
- `frontend/src/shared/components/app-sidebar/`：左侧产品信息、分组菜单和运行状态。
- `frontend/src/features/test-tools/`：测试工具及其嵌入式应用概览。

## 页面结构

```text
App
├── TitleBar
└── Workspace
    ├── AppSidebar
    │   ├── 产品信息
    │   ├── 业务系统
    │   │   └── DN 周常管理
    │   │       ├── 仪表盘
    │   │       ├── 周计划
    │   │       ├── 角色
    │   │       ├── 站内消息
    │   │       └── 个人中心
    │   ├── 系统设置
    │       ├── 偏好设置
    │       └── 测试工具
    │           └── 应用概览 / 交互窗口 / 原生能力 / 系统通知
    │   └── 作者状态区
    └── View
        ├── DnDashboard / DnWeeklyPlans / DnRoles / DnMessages / DnAccount
        ├── SettingsPanel
        └── TestToolsPanel
```

## 导航约定

- 应用启动默认进入 DN 仪表盘；未登录时显示 DN 登录入口。
- 设置、诊断和开发能力放在“系统设置”分组中。
- 应用概览作为测试工具的只读分类展示，不再占用独立侧栏入口。
- 测试操作不得出现在正式业务页面。
- 当前导航状态使用 `AppView` 联合类型约束，新增视图时同步更新标题映射和侧边栏配置。
- DN 周常管理使用可展开子菜单；侧栏折叠时父入口直接打开仪表盘，展开时显示五个业务子页面。
- 标题栏覆盖整个应用宽度，侧边栏只存在于标题栏下方的工作区。
- 应用主名称统一读取根目录 `.env` 的 `APP_DISPLAY_NAME`，不得在组件内硬编码。
- 侧栏左下角作者名称统一读取根目录 `.env` 的 `APP_AUTHOR_NAME`，展开时显示完整文字，折叠时保留状态点和悬停标题。
- 标题栏与侧边栏的完整 DOM 子树禁止文字选择和图片拖拽，避免窗口拖动或侧栏缩放时出现网页选区与拖影。
- 右侧内容视图不受该限制，正文和诊断信息仍允许正常选择复制。

## 响应式处理

- 侧边栏右边缘提供可悬停的拖拽分隔栏，可连续调整宽度。
- 允许宽度范围为 `64px–220px`，默认宽度为 180px，并通过 `localStorage` 记住上次宽度。
- 宽度小于 104px 时进入图标模式，隐藏产品文字、分组名称和菜单文字。
- 窗口宽度不超过 820px 时，侧边栏自动收为 64px 图标模式并暂停拖拽；窗口恢复后继续使用用户保存的宽度。
- 拖拽分隔栏支持键盘操作：左右方向键每次调整 8px，Home 收起到最小值，End 展开到最大值。
- 图标模式仍保留按钮的 `title`、可访问名称、选中状态和键盘焦点。
- 右侧视图使用独立滚动，标题栏和左侧菜单保持固定。
- `app-content` 是页面级 inline-size 容器；页面优先根据实际内容宽度使用 Container Queries，不只根据整个窗口宽度判断断点。
- 全局页面间距与卡片内边距统一使用 `--page-padding-*`、`--panel-padding` 和 `--panel-radius`，窄窗口自动缩小。
- 所有按钮统一使用 `Button`：侧栏导航和标题栏窗口控制固定使用 `lg`，分类切换固定使用 `md`，紧凑关闭按钮固定使用 `sm`；普通页面操作跟随偏好设置中的默认尺寸。
- 概览卡片、能力分组和运行信息会依次从多列降为双列和单列，长路径允许换行，禁止产生横向页面滚动。
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

侧边栏、滚动和窗口控制需要人工桌面验证。
