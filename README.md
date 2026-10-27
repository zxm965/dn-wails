# Cull Pear

基于 Wails v3、React 和 TypeScript 的桌面应用。以 v3 Service、typed events、Taskfile 构建系统和原生系统托盘为基础，不保留 Wails v2 兼容层。

界面采用顶部自定义标题栏、左侧菜单和右侧视图区域；仅系统设置入口保留分组标题。关闭行为设为隐藏时，主窗口会保留在后台，并可通过系统托盘的“显示主窗口”恢复；托盘菜单也提供“退出”。

## 目录结构

```text
├── main.go              # 应用组合根
├── internal/            # Wails 门面、业务服务与平台适配
├── frontend/            # React 应用及生成绑定
├── database/schema/     # PostgreSQL 结构初始化
├── Taskfile.yml         # 构建任务入口
├── build/               # 桌面平台构建任务与资源
├── scripts/             # 版本、元数据与发布脚本
└── docs/                # 架构与模块文档
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

应用展示名称和作者来自根目录 `.env`。本地数据库连接写入被 Git 忽略的 `.env.local`；正式发布从 GitHub Environment `RELEASE` 的 `secrets.DATABASE_URL` 生成临时 `.env.local` 并嵌入二进制。嵌入值可以被最终用户提取，因此只能使用最小权限且可轮换的专用账号。

首次成功启动会在用户配置目录生成独立的 `installation.json`，保存随机 UUID v4 安装 ID、首次安装版本和最近运行版本。应用升级保留该 ID；更新资源下载由 Go HTTP 客户端携带安装身份请求头，不依赖浏览器 CORS。

## 发布与更新

项目 Git 仓库为 `https://gitee.com/zxm965/dn-wails.git`；稳定版本标签触发 GitHub Actions，构建 macOS universal 与 Windows amd64 并发布 GitHub Release。

```bash
git tag v1.0.0
git push origin v1.0.0
```

每次发布前在 [CHANGELOG.md](CHANGELOG.md) 汇总有效改动并归档到目标版本；发布工作流将日志写入 Release 正文，客户端在更新提示及手动检查时展示。

发布配置、已有标签重新发布及客户端下载协议见[应用更新与发布](docs/modules/app-update.md)；平台构建命令与资源说明见 [build/README.md](build/README.md)。默认发布尚未配置正式 Apple/Windows 代码签名，原生行为仍需在目标系统验证。
