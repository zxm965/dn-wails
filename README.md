# dn-wails

基于 Wails v3、React 和 TypeScript 的桌面应用。当前锁定 `github.com/wailsapp/wails/v3 v3.0.0-beta.2`，以 v3 Service、typed events、Taskfile 构建系统和原生系统托盘为基础，不保留 Wails v2 兼容层。

界面采用顶部自定义标题栏、左侧分组菜单和右侧视图区域。关闭行为设为隐藏时，主窗口会保留在后台，并可通过系统托盘的“显示主窗口”恢复；托盘菜单也提供“退出”。

## 目录结构

```text
.
├── Taskfile.yml                    # Wails v3 构建任务入口
├── build/
│   ├── config.yml                 # Wails v3 开发与平台元数据配置
│   ├── darwin/                    # macOS 打包资源与任务
│   ├── linux/                     # Linux 打包资源与任务
│   └── windows/                   # Windows NSIS 资源与任务
├── main.go                        # 组合根：App、Window、Service 与 SystemTray
├── internal/
│   ├── application/               # 暴露给前端的 Wails v3 Service 门面
│   ├── appupdate/                 # GitHub Release 更新规则与版本比较
│   ├── buildinfo/                 # 构建期版本和发布元数据
│   ├── diagnostics/               # 日志与运行诊断
│   ├── dn/                        # DN 认证、角色、周计划与消息
│   ├── lifecycle/                 # 应用生命周期状态
│   ├── nativekit/                 # 原生能力规则与类型
│   ├── notification/              # 系统通知规则与类型
│   ├── settings/                  # 类型化应用设置
│   ├── singleinstance/            # 单实例启动数据处理
│   ├── storage/                   # 用户配置文件存储
│   ├── windowmanager/             # 主窗口状态与关闭策略
│   └── platform/                  # Wails v3 与操作系统适配
├── frontend/
│   ├── bindings/                  # Wails v3 自动生成绑定，禁止手动修改
│   └── src/                       # React 功能模块与共享基础设施
└── docs/                          # 架构与模块文档
```

详细边界见 [docs/architecture.md](docs/architecture.md)。

## 常用命令

```bash
# 重新生成 Go Service -> TypeScript 绑定和 typed events
wails3 generate bindings -clean=true -ts

# Go 测试
go test ./...
go test -tags dev ./internal/platform/singleinstance

# 前端质量检查
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
cd ..

# 当前平台生产构建 / 打包
wails3 task build
wails3 task package

# 本地开发（会启动 Vite 和桌面应用）
wails3 task dev
```

项目通过 `WAILS_VITE_PORT` 保持 Wails 后端与 Vite 端口一致，默认使用 Wails v3 的 `9245`；需要时可通过 `wails3 dev -port <端口>` 覆盖。端口被占用时 Vite 会直接失败。

开发构建的应用版本从最近的稳定 Git 标签读取并追加 `-dev`；例如标签为 `v1.2.3` 时，应用概览显示 `1.2.3-dev`。没有可用标签时回退到 `build/config.yml` 的 `info.version`。

应用展示名称和作者来自根目录 `.env`。本地数据库连接写入被 Git 忽略的 `.env.local`；正式发布从 GitHub Environment `DATABASE` 的 `secrets.DATABASE_URL` 生成临时 `.env.local` 并嵌入二进制。嵌入值可以被最终用户提取，因此只能使用最小权限且可轮换的专用账号。

## 发布与更新

推送 `vMAJOR.MINOR.PATCH` 标签后，GitHub Actions 使用 Wails v3 Taskfile 构建 macOS universal ZIP/DMG 和 Windows amd64 用户级 NSIS 安装器，并生成 `latest.json` 与校验和：

```bash
git tag v1.0.0
git push origin v1.0.0
```

当前 Wails v3 仍是 beta，桌面原生行为和平台打包需要在目标系统上充分验证。默认发布尚未配置正式 Apple/Windows 代码签名。
