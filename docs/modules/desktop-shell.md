# 桌面应用壳

## 模块目标

提供符合常见桌面应用习惯的固定布局：顶部系统标题栏、左侧分组菜单、右侧可滚动视图区域。

## 目录与职责

- `frontend/src/app/App.tsx`：维护当前视图并装配应用壳。
- `frontend/src/app/appConfig.ts`：为标题栏、侧边栏、页面标题和左下角状态区提供全局展示配置。
- `frontend/src/app/App.css`：主工作区和右侧视图背景。
- `frontend/src/shared/components/titlebar/`：Wails 自定义标题栏和窗口控制。
- `frontend/src/shared/components/app-sidebar/`：左侧产品信息、分组菜单和运行状态。
- `frontend/src/features/foundation/`：应用概览视图。

## 页面结构

```text
App
├── TitleBar
└── Workspace
    ├── AppSidebar
    │   ├── 产品信息
    │   ├── 主菜单
    │   │   └── 应用概览
    │   ├── 系统设置
    │       ├── 偏好设置
    │       └── 测试工具
    │   └── 作者状态区
    └── View
        ├── DesktopOverview
        ├── SettingsPanel
        └── TestToolsPanel
```

## 导航约定

- 顶层正式业务视图放在“主菜单”或新增业务分组中。
- 设置、诊断和开发能力放在“系统设置”分组中。
- 测试操作不得出现在应用概览或正式业务页面。
- 当前导航状态使用 `AppView` 联合类型约束，新增视图时同步更新标题映射和侧边栏配置。
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
- 所有按钮统一使用 `AppButton`：侧栏导航和标题栏窗口控制固定使用 `lg`，分类切换固定使用 `md`，紧凑关闭按钮固定使用 `sm`；普通页面操作跟随偏好设置中的默认尺寸。
- 概览卡片、能力分组和运行信息会依次从多列降为双列和单列，长路径允许换行，禁止产生横向页面滚动。
- 项目最小窗口尺寸仍为 `720 × 520`。

## 开发热更新

- `frontend/vite.config.ts` 固定使用 `2233` 作为本项目开发端口，避免与 Vite 默认的 `5173` 及其他项目混用。
- Vite WebSocket 客户端固定连接 `localhost:2233`。macOS Wails WebView 使用 `wails://` 自定义协议，不能依赖页面地址推断 HMR WebSocket 地址。
- `strictPort` 保证端口被占用时直接失败并给出错误，不再静默切换端口后让 WebView 连接到错误的服务。
- `wails.json` 继续使用 `frontend:dev:serverUrl: "auto"`，由 Wails 自动发现固定端口上的前端开发服务。
- 修改 Vite 配置后，当前窗口需要重新加载一次；之后 React 和 CSS 修改由 Vite HMR 实时更新。

## 验证

```bash
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```

侧边栏、滚动和窗口控制需要人工桌面验证。
