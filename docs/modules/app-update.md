# 应用更新模块

## 模块目标

以 GitHub Releases 作为正式版本源，为 macOS 与 Windows 提供版本展示、启动自动检查、手动检查、确认更新、下载校验和更新后重启能力。

## 目录与职责

- `internal/buildinfo/`：保存无构建元数据时的兜底开发版本和 GitHub 仓库标识。
- `scripts/resolve-development-version.mjs`：开发构建读取最近的稳定 Git 标签并追加 `-dev`，无标签时回退到 `build/config.yml`。
- `internal/appupdate/`：版本比较、发布资源选择、更新状态和安装用例，不依赖 Wails 或具体操作系统。
- `internal/platform/appupdate/github.go`：定位 GitHub 最新 Release、读取静态更新清单、下载并校验资源。
- `internal/platform/appupdate/installer_darwin.go`：挂载新版 DMG，退出当前进程后替换应用包、卸载镜像并重新打开。
- `internal/platform/appupdate/installer_windows.go`：退出当前进程后静默运行用户级 NSIS 安装器并重新打开应用。
- `internal/application/update.go`：向前端暴露版本信息、检查和安装三个 Wails 用例。
- `frontend/src/features/app-update/`：根级更新状态、启动自动检查、确认弹窗和错误反馈。
- `frontend/src/features/test-tools/components/DesktopOverview.tsx`：展示当前版本、更新状态和手动检查按钮，不展示更新源地址等发布配置。
- `.github/workflows/release.yml`：标签触发的双平台质量检查、构建和 GitHub Release 发布。
- `Taskfile.yml` 与 `build/*/Taskfile.yml`：Wails v3 前端、bindings、平台构建和打包任务。
- `scripts/configure-release.mjs`：校验 `vMAJOR.MINOR.PATCH` 标签并更新 `build/config.yml` 的平台包版本。
- `scripts/generate-update-manifest.mjs`：计算发布资源大小和 SHA-256，生成 GitHub 下载地址对应的 `latest.json`。
- `scripts/prepare-release-environment.mjs`：校验 `DATABASE_URL` 并生成构建期临时 `.env.local`。

## 依赖关系

```text
Git tag vX.Y.Z
  → GitLab 镜像同步标签到 GitHub
  → GitHub Actions
      ├── macOS universal .zip / .dmg
      ├── Windows amd64 NSIS installer
      └── GitHub Release + latest.json + SHA256SUMS.txt

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
3. 双端 build job 从 GitHub Environment `RELEASE` 读取 `secrets.DATABASE_URL`，生成不进入 Git 记录的临时 `.env.local`。
4. 工作流用 `wails3 task common:update:build-assets` 同步平台元数据，并通过 linker flags 注入运行时版本和仓库。
5. macOS 使用 `wails3 task darwin:package:universal` 构建 universal `.app`，再生成供旧客户端迁移的更新 ZIP 和供当前客户端自动更新、手动安装的 DMG。
6. Windows runner 安装 NSIS 后使用 `wails3 task windows:package ARCH=amd64 INSTALL_SCOPE=user` 构建用户级安装器。
7. 两端资源成功后为 ZIP、DMG 和 EXE 计算大小与 SHA-256，生成 `latest.json` 和 `SHA256SUMS.txt`。
8. 创建或更新 GitHub Release，并上传应用安装资源、更新清单和校验文件。GitHub 自动生成的 Source code 归档继续由 GitHub 提供。

### 检查与安装

1. 前端根 Provider 读取当前构建信息；正式语义化版本对 GitHub `/releases/latest` 发起 HEAD 请求。
2. HTTP 客户端跟随重定向得到最新稳定标签，再下载该标签 Release 中的 `latest.json`。
3. 更新源校验清单版本、仓库标识、版本号、Release URL、资源 URL、大小和 SHA-256。
4. 业务服务比较 `MAJOR.MINOR.PATCH`，只在远端版本更高时返回可更新状态。
5. 自动检查和手动检查发现新版后都通过统一确认窗口询问用户，不静默安装。
6. 用户确认后重新读取最新标签和清单，确保确认期间版本未发生变化。
7. 当前客户端按平台精确选择 DMG 或 EXE，下载后校验清单声明的字节数和 SHA-256。
8. 校验成功后启动平台更新助手；macOS 挂载 DMG 并在当前应用退出后替换 `.app`，Windows 静默运行用户级安装器，完成后重新启动。

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

发布清单：

```ts
interface ApplicationUpdateManifest {
  schemaVersion: 1
  repository: string
  version: string
  name: string
  notes: string
  releaseUrl: string
  publishedAt: string
  assets: Array<{
    name: string
    url: string
    digest: `sha256:${string}`
    size: number
  }>
}
```

## 发布资源约定

- macOS 旧客户端兼容更新：`dn-wails-darwin-universal.zip`
- macOS 当前客户端自动更新与手动安装：`dn-wails-darwin-universal.dmg`
- Windows 自动更新与手动安装：`dn-wails-windows-amd64-installer.exe`
- 自动更新发现与资源元数据：`latest.json`
- 人工校验：`SHA256SUMS.txt`

这些文件均上传到对应标签的 GitHub Release。资源名是客户端与发布流水线的数据契约，修改时必须同步更新两端和本模块文档。

## 错误与边界

- 开发版本为“当前稳定 Git 标签版本 + `-dev`”，例如标签 `v1.2.3` 对应 `1.2.3-dev`；开发版本只展示，不发起自动更新请求。
- 只跟随 GitHub 最新正式 Release 重定向；客户端不请求 `api.github.com`，不注入访问令牌，也不消耗 REST API core 额度。
- 版本必须是三段无前导零的稳定语义化版本；预发布标签不会进入发布流水线。
- 最新 Release 必须包含 `latest.json`，清单 schema 当前固定为 `1`，仓库和版本必须与重定向标签一致。
- Release URL 和每个资源 URL 必须精确指向配置仓库及当前标签，资源名不得包含路径或控制字符，且不得重复。
- 下载只接受 HTTPS、声明大小不超过 1 GiB 且带 SHA-256 digest 的资源；大小或摘要不一致时删除临时文件并拒绝安装。
- macOS 应用包所在目录必须允许当前用户写入；Windows 发布统一使用 Taskfile 的 `INSTALL_SCOPE=user`，避免自动更新请求管理员权限。
- 同一进程只允许一个安装操作；安装前再次检查版本，避免确认期间 Release 发生变化。
- Build 与 Release job 均关联 GitHub Environment `RELEASE`；`DATABASE_URL` 缺失、超过 8192 字符或包含控制字符时，build job 立即失败。
- 临时 `.env.local` 使用受限权限创建并由 Go embed 写入二进制，只保存数据库地址，不进入 Git 记录，也不会主动输出到工作流日志。
- GitHub Secret 只能保护构建前和构建过程中的值；发布后的桌面二进制可被分析，因此数据库账号必须最小权限、限制来源并支持轮换。
- 当前工作流只做 macOS ad-hoc 签名，Windows 也未配置 Authenticode。正式外部分发前需要配置 Apple Developer ID/公证和 Windows 代码签名，否则系统可能显示来源或信誉警告。

## 接入与发布

GitHub 更新源固定为 `zxm965/dn-wails`。项目继续以 GitLab 为主仓库时，镜像规则必须同步 Git 标签，并确保 GitHub 仓库启用 Actions、工作流拥有 `contents: write` 权限。Build 与 Release job 使用 GitHub Environment `RELEASE`，其中 build job 需要 `DATABASE_URL` Secret。更新检查和下载使用公开 GitHub Release 地址，不需要额外 GitHub API Key 或对象存储凭据。构建使用锁定的 Wails v3 CLI，并重新生成 bindings。

```bash
git tag v1.0.0
git push origin v1.0.0
```

普通分支提交不会发布客户端更新；只有同步到 GitHub 的稳定版本标签会触发 Release 工作流。重新运行同一标签时，工作流会覆盖该 GitHub Release 中的同名文件。

旧客户端仍可通过 GitHub Release 中的 ZIP 或 EXE 自动升级；升级到使用 DMG 更新的版本后，macOS 后续自动更新选择 DMG。兼容 ZIP 必须至少保留到不再支持旧客户端直接升级为止。

## 验证

```bash
go test ./internal/appupdate ./internal/platform/appupdate ./internal/application
go test ./...
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```

实际挂载 DMG 并替换 macOS `.app`、静默运行 Windows 安装器和系统签名提示必须分别在对应桌面系统上人工验证。
