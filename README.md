# dn-wails

基于 Wails v2、React 和 TypeScript 的桌面应用。项目采用轻量分层结构：Go 侧以应用门面连接业务能力，React 侧以功能模块组织页面逻辑。

## 目录结构

```text
.
├── main.go                         # 组合根：装配依赖并启动 Wails
├── internal/
│   ├── application/                # 暴露给前端的 Wails 应用门面
│   ├── greeting/                   # 按业务能力组织的功能包
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
├── scripts/ci/                     # GitLab 跨平台构建与发布脚本
├── .gitlab-ci.yml                  # main 分支自动构建与 Release
└── wails.json                      # Wails 项目配置
```

详细边界与扩展规则见 [docs/architecture.md](docs/architecture.md)。

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

## GitLab 自动构建与发布

每次向默认分支 `main` 推送提交都会触发以下流水线：

1. Windows Runner 构建 x86-64 NSIS 安装包。
2. macOS Runner 构建同时支持 Apple Silicon 和 Intel 的 Universal App，并封装为 DMG。
3. 两个平台构建成功后，自动创建版本号为 `0.0.<pipeline IID>` 的 GitLab Release。
4. Windows 安装包、macOS DMG 和 SHA256 校验文件上传到 Generic Package Registry，并显示在 Release 下载列表中。

默认 Runner 配置：

- Windows：`saas-windows-medium-amd64`
- macOS：`saas-macos-medium-m1`，镜像 `macos-15-xcode-16`

GitLab.com 托管 macOS Runner 需要 Premium、Ultimate 或符合条件的开源计划。如果项目无法使用该 Runner，请注册一台 macOS 自托管 Runner，并在项目 **Settings → CI/CD → Variables** 中将 `MACOS_RUNNER_TAG` 设置为它的标签；如需更换托管镜像，可同时覆盖 `MACOS_RUNNER_IMAGE`。

当前流水线产物未配置商业 Windows 代码签名或 Apple Developer ID 签名、公证，用户安装时可能看到操作系统安全提示。
