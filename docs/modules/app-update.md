# 应用更新模块

## 模块目标

以 GitHub Releases 作为正式版本源，为 macOS 与 Windows 提供版本展示、启动自动检查、手动检查、确认更新、下载校验和更新后重启能力。

## 目录与职责

- `internal/buildinfo/`：保存默认开发版本和 GitHub 仓库，正式构建通过 Go linker flags 注入版本和仓库。
- `internal/appupdate/`：版本比较、发布资源选择、更新状态和安装用例，不依赖 Wails 或具体操作系统。
- `internal/platform/appupdate/github.go`：访问 GitHub Releases API、下载资源并校验 GitHub 返回的 SHA-256 digest。
- `internal/platform/appupdate/installer_darwin.go`：解压新版 `.app`，退出当前进程后替换应用包并重新打开。
- `internal/platform/appupdate/installer_windows.go`：退出当前进程后静默运行用户级 NSIS 安装器并重新打开应用。
- `internal/application/update.go`：向前端暴露版本信息、检查和安装三个 Wails 用例。
- `frontend/src/features/app-update/`：根级更新状态、启动自动检查、确认弹窗和错误反馈。
- `frontend/src/features/test-tools/components/DesktopOverview.tsx`：展示当前版本、平台、更新状态和手动检查按钮。
- `.github/workflows/release.yml`：标签触发的双平台质量检查、构建和 GitHub Release 发布。
- `scripts/configure-release.mjs`：校验 `vMAJOR.MINOR.PATCH` 标签并同步 Wails 平台包版本。

## 依赖关系

```text
Git tag vX.Y.Z
  → GitLab 镜像同步标签到 GitHub
  → GitHub Actions
      ├── macOS universal .zip / .dmg
      ├── Windows amd64 NSIS installer
      └── GitHub Release + SHA256SUMS.txt

React AppUpdateProvider
  → application.App
  → appupdate.Service
  → GitHubSource / platform Installer
  → GitHub Releases / operating system
```

## 核心链路

### 发布

1. 推送 `v1.2.3` 形式的标签。
2. 工作流校验标签、执行 Go 测试和前端格式、lint、build。
3. macOS 构建 universal 应用，生成自动更新使用的 ZIP 和手动安装使用的 DMG。
4. Windows runner 安装 NSIS 后构建 amd64、用户级安装器。
5. 两端资源全部成功后创建 GitHub Release，并附带校验和文件。

### 检查与安装

1. 前端根 Provider 读取当前构建信息；正式语义化版本自动请求最新正式 Release。
2. 业务服务比较 `MAJOR.MINOR.PATCH`，只在远端版本更高时返回可更新状态。
3. 自动检查和手动检查发现新版后都通过统一确认窗口询问用户，不静默安装。
4. 用户确认后重新读取最新 Release，确保确认版本未发生变化。
5. 客户端按平台精确选择资源，下载后校验 GitHub API 提供的 `sha256:` digest。
6. 校验成功后启动平台更新助手，当前应用退出，替换或安装完成后重新启动。

## 数据契约

```ts
interface ApplicationUpdateInfo {
  currentVersion: string
  repository: string
  platform: string
  arch: string
  configured: boolean
  canInstall: boolean
}

interface ApplicationUpdateStatus {
  currentVersion: string
  latestVersion: string
  updateAvailable: boolean
  releaseName: string
  releaseNotes: string
  releaseUrl: string
  publishedAt: string
}
```

## 发布资源约定

- macOS 自动更新：`dn-wails-darwin-universal.zip`
- macOS 手动安装：`dn-wails-darwin-universal.dmg`
- Windows 自动更新与手动安装：`dn-wails-windows-amd64-installer.exe`
- 人工校验：`SHA256SUMS.txt`

资源名是客户端与发布流水线的数据契约，修改时必须同步更新两端和本模块文档。

## 错误与边界

- 开发版本为 `0.0.0-dev`，显示版本但不发起自动更新请求。
- 只读取 GitHub 最新的非草稿、非预发布 Release；当前实现面向公共仓库，不注入访问令牌。
- 版本必须是三段无前导零的稳定语义化版本；预发布标签不会进入发布流水线。
- 下载只接受 HTTPS、声明大小不超过 1 GiB 且带 SHA-256 digest 的资源；大小或摘要不一致时删除临时文件并拒绝安装。
- macOS 应用包所在目录必须允许当前用户写入；Windows 发布统一使用 `-installscope user`，避免自动更新请求管理员权限。
- 同一进程只允许一个安装操作；安装前再次检查版本，避免确认期间 Release 发生变化。
- 当前工作流只做 macOS ad-hoc 签名，Windows 也未配置 Authenticode。正式外部分发前需要配置 Apple Developer ID/公证和 Windows 代码签名，否则系统可能显示来源或信誉警告。

## 接入与发布

GitHub 更新源固定为 `zxm965/dn-wails`。项目继续以 GitLab 为主仓库时，镜像规则必须同步 Git 标签，并确保 GitHub 仓库启用 Actions、工作流拥有 `contents: write` 权限。双端构建 job 关联 GitHub Environment `DATABASE`，并将其中的 Environment Secret `DATABASE_URL` 显式映射到构建进程；该值不会作为 Vite 公共变量暴露。Wails 构建继续使用仓库内已生成绑定，不依赖执行应用组合根。

```bash
git tag v1.0.0
git push origin v1.0.0
```

普通分支提交不会发布客户端更新；只有同步到 GitHub 的版本标签会触发 Release 工作流。

## 验证

```bash
go test ./internal/appupdate ./internal/platform/appupdate ./internal/application
go test ./...
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```

实际替换 macOS `.app`、静默运行 Windows 安装器和系统签名提示必须分别在对应桌面系统上人工验证。
