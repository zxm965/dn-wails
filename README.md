# dn-wails

基于 Wails v2、React 和 TypeScript 的桌面应用。项目采用轻量分层结构：Go 侧以应用门面连接业务能力，React 侧以功能模块组织页面逻辑。

界面采用标准桌面应用布局：顶部为系统标题栏，左侧为分组菜单，右侧为视图区域。通用能力的人工验证入口统一位于“系统设置 → 测试工具”。

## 目录结构

```text
.
├── .env                            # 应用展示名称等公开全局配置
├── main.go                         # 组合根：装配依赖并启动 Wails
├── internal/
│   ├── application/                # 暴露给前端的 Wails 应用门面
│   ├── diagnostics/                # 日志与运行诊断
│   ├── greeting/                   # 按业务能力组织的功能包
│   ├── lifecycle/                  # 应用生命周期状态
│   ├── nativekit/                  # 原生能力规则与类型
│   ├── notification/               # 系统消息通知规则与类型
│   ├── settings/                   # 类型化应用设置
│   ├── singleinstance/             # 单实例启动数据处理
│   ├── storage/                    # 用户配置文件存储
│   ├── windowmanager/              # 主窗口状态与关闭策略
│   ├── platform/nativekit/         # Wails 原生能力适配
│   ├── platform/notification/      # Wails 原生通知适配
│   ├── platform/singleinstance/    # Wails 单实例配置
│   └── platform/window/            # 跨平台窗口配置
├── frontend/
│   ├── src/
│   │   ├── app/                    # 应用壳、全局样式和顶层装配
│   │   ├── features/               # 前端业务功能模块
│   │   ├── shared/                 # 通用组件与基础工具
│   │   └── assets/                 # 静态资源
│   └── wailsjs/                    # Wails 自动生成绑定，禁止手动修改
├── build/                          # 平台打包资源
├── docs/                           # 架构与开发文档
└── wails.json                      # Wails 项目配置
```

详细边界与扩展规则见 [docs/architecture.md](docs/architecture.md)，各业务模块的设计与调用链路见 `docs/modules/`。

## 常用命令

```bash
# 重新生成 Go -> TypeScript 绑定
wails generate module

# 前端质量检查
cd frontend
pnpm fmt:check
pnpm lint
pnpm build

# Go 测试
cd ..
go test ./...

# 本地开发（会启动开发服务）
wails dev

# 生产构建
wails build
```

本项目前端开发服务固定使用 `2233`，用于保证 macOS Wails WebView 的 HMR WebSocket 地址稳定。如果端口已被占用，Vite 会直接报错，请先释放该端口后再运行 `wails dev`。

应用主名称通过根目录 `.env` 的 `APP_DISPLAY_NAME` 统一配置。修改该字段会同步影响自定义标题栏、侧边栏、页面标题、概览信息和原生窗口标题；内部存储与日志目录名称不会随之变化。该 `.env` 会进入前端与桌面程序，只能存放公开配置，禁止写入密钥。
