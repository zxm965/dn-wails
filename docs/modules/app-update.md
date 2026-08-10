# 应用更新模块

## 模块目标

以 Gitee Releases 作为客户端正式版本源，为 macOS 与 Windows 提供版本展示、启动自动检查、手动检查、确认更新、下载校验和更新后重启能力。GitHub Actions 继续负责跨平台构建，并将源码、标签和发布产物同步到 Gitee。

## 目录与职责

- `internal/buildinfo/`：保存无构建元数据时的兜底开发版本和发布仓库标识。
- `scripts/resolve-development-version.mjs`：开发构建读取最近的稳定 Git 标签并追加 `-dev`，无标签时回退到 `build/config.yml`。
- `internal/appupdate/`：版本比较、发布资源选择、更新状态和安装用例，不依赖 Wails 或具体操作系统。
- `internal/platform/appupdate/gitee.go`：通过 Gitee OpenAPI 定位最新 Release，读取静态更新清单并下载、校验资源。
- `internal/platform/appupdate/installer_darwin.go`：挂载新版 DMG，退出当前进程后替换应用包、卸载镜像并重新打开。
- `internal/platform/appupdate/installer_windows.go`：退出当前进程后静默运行用户级 NSIS 安装器并重新打开应用。
- `internal/application/update.go`：向前端暴露版本信息、检查和安装三个 Wails 用例。
- `frontend/src/features/app-update/`：根级更新状态、启动自动检查、确认弹窗和错误反馈。
- `frontend/src/features/test-tools/components/DesktopOverview.tsx`：展示当前版本、更新状态和手动检查按钮，不展示更新源地址等发布配置。
- `.github/workflows/sync-gitee.yml`：GitHub push 触发的分支、标签源码同步。
- `.github/workflows/release.yml`：标签触发的双平台质量检查、构建以及 GitHub、Gitee Release 发布。
- `.github/workflows/republish-gitee-release.yml`：从已有 GitHub Release 下载安装包并补发指定标签的 Gitee Release，不重建桌面应用或移动标签。
- `Taskfile.yml` 与 `build/*/Taskfile.yml`：Wails v3 前端、bindings、平台构建和打包任务。
- `scripts/configure-release.mjs`：校验 `vMAJOR.MINOR.PATCH` 标签并更新 `build/config.yml` 的平台包版本。
- `scripts/generate-update-manifest.mjs`：计算发布资源大小和 SHA-256，按目标 Release 基地址生成 GitHub 或 Gitee 对应的 `latest.json`。
- `scripts/publish-gitee-release.mjs`：通过 Gitee OpenAPI 创建或更新 Release，复用大小一致的同名附件，覆盖不一致附件并上传缺失产物。
- `scripts/prepare-release-environment.mjs`：校验 `DATABASE_URL` 并生成构建期临时 `.env.local`。

## 依赖关系

```text
Git tag vX.Y.Z
  → GitLab 镜像同步标签到 GitHub
  → GitHub Actions
      ├── macOS universal .zip / .dmg
      ├── Windows amd64 NSIS installer
      ├── GitHub Release + latest.json + SHA256SUMS.txt
      └── Gitee 源码镜像 + Gitee Release + 同名发布资源

React AppUpdateProvider
  → application.App
  → appupdate.Service
  → GiteeSource / platform Installer
  → Gitee Releases / operating system
```

## 核心链路

### 发布

1. 推送 `v1.2.3` 形式的标签。
2. 工作流校验标签、执行 Go 测试和前端格式、lint、build。
3. 双端 build job 从 GitHub Environment `RELEASE` 读取 `secrets.DATABASE_URL`，生成不进入 Git 记录的临时 `.env.local`。
4. 工作流用 `wails3 task common:update:build-assets` 同步平台元数据，并通过 linker flags 注入运行时版本和仓库。
5. macOS 使用 `wails3 task darwin:package:universal` 构建 universal `.app`，再生成供旧客户端迁移的更新 ZIP 和供当前客户端自动更新、手动安装的 DMG。
6. Windows runner 安装 NSIS 后使用 `wails3 task windows:package ARCH=amd64 INSTALL_SCOPE=user` 构建用户级安装器。
7. 两端资源成功后为 ZIP、DMG 和 EXE 计算大小与 SHA-256，先生成指向 GitHub Release 的 `latest.json` 和对应 `SHA256SUMS.txt`。
8. 创建或更新 GitHub Release，并上传应用安装资源、GitHub 更新清单和校验文件；这组资源继续供尚未切换更新源的旧客户端迁移，GitHub 自动生成的 Source code 归档也继续保留。
9. 将发布标签推送到 Gitee，覆盖生成指向 Gitee Release 的 `latest.json` 和对应 `SHA256SUMS.txt`，再通过 Gitee OpenAPI 创建或更新同标签 Release，删除同名旧附件后上传当前 ZIP、DMG、EXE、清单和校验文件；`latest.json` 最后上传，避免新 Release 在安装包未完整上传时被客户端消费。
10. 普通 GitHub push 由独立同步工作流将全部 GitHub 分支和标签强制同步到 Gitee；Gitee 作为只读镜像使用，不回写 GitHub。
11. Gitee 发布中断时可手动运行 `Republish Gitee release`，输入稳定标签后从对应 GitHub Release 恢复安装包，并只补齐缺失或大小不一致的 Gitee 附件。

### 检查与安装

1. 前端根 Provider 读取当前构建信息；正式语义化版本请求 Gitee OpenAPI `/api/v5/repos/{owner}/{repo}/releases/latest`。
2. HTTP 客户端从 JSON 响应读取最新稳定标签，再下载该标签 Gitee Release 中的 `latest.json`。
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

这些文件均上传到对应标签的 GitHub 和 Gitee Release。两端安装包相同，但 `latest.json` 和 `SHA256SUMS.txt` 分别引用并校验各自平台的 Release 地址：旧客户端消费 GitHub 资源完成迁移，包含本次改动的新客户端只消费 Gitee 资源。资源名是客户端与发布流水线的数据契约，修改时必须同步更新两端和本模块文档。

## 错误与边界

- 开发版本为“当前稳定 Git 标签版本 + `-dev`”，例如标签 `v1.2.3` 对应 `1.2.3-dev`；开发版本只展示，不发起自动更新请求。
- 客户端只请求 Gitee 的公开 Release API 和附件地址，不注入 `GITEE_TOKEN`；Gitee 仓库必须允许未登录用户读取 Release，否则自动检查不可用。
- 版本必须是三段无前导零的稳定语义化版本；预发布标签不会进入发布流水线。
- 最新 Release 必须包含 `latest.json`，清单 schema 当前固定为 `1`，仓库和版本必须与 Gitee API 返回的标签一致。
- Release URL 和每个资源 URL 必须精确指向配置仓库及当前标签，资源名不得包含路径或控制字符，且不得重复。
- 下载只接受 HTTPS、声明大小不超过 1 GiB 且带 SHA-256 digest 的资源；大小或摘要不一致时删除临时文件并拒绝安装。
- Gitee 普通项目单个 Release 附件不能超过 100 MB，仓库附件总量不能超过 1 GB；发布脚本会在上传前拒绝超过单附件限制的构建产物。
- macOS 应用包所在目录必须允许当前用户写入；Windows 发布统一使用 Taskfile 的 `INSTALL_SCOPE=user`，避免自动更新请求管理员权限。
- 同一进程只允许一个安装操作；安装前再次检查版本，避免确认期间 Release 发生变化。
- Build 与 Release job 均关联 GitHub Environment `RELEASE`；`DATABASE_URL` 缺失、超过 8192 字符或包含控制字符时，build job 立即失败。
- GitHub Actions 使用仓库 Secret `GITEE_TOKEN` 同步 Git refs 和调用 Gitee OpenAPI；令牌只存在于工作流，不进入发布清单或桌面二进制。
- 临时 `.env.local` 使用受限权限创建并由 Go embed 写入二进制，只保存数据库地址，不进入 Git 记录，也不会主动输出到工作流日志。
- GitHub Secret 只能保护构建前和构建过程中的值；发布后的桌面二进制可被分析，因此数据库账号必须最小权限、限制来源并支持轮换。
- 当前工作流只做 macOS ad-hoc 签名，Windows 也未配置 Authenticode。正式外部分发前需要配置 Apple Developer ID/公证和 Windows 代码签名，否则系统可能显示来源或信誉警告。

## 接入与发布

Gitee 更新源固定为 `zxm965/dn-wails`。项目继续以 GitLab 为主仓库时，上游镜像规则必须先把分支和稳定 Git 标签同步到 GitHub；GitHub 仓库需要启用 Actions，并授予 Release 工作流 `contents: write` 权限。GitHub Actions 仓库 Secret `GITEE_TOKEN` 必须具有目标 Gitee 仓库的代码和 Release 写权限，Gitee 仓库则必须公开 Release 读取能力。Build 与 Release job 使用 GitHub Environment `RELEASE`，其中 build job 还需要 `DATABASE_URL` Secret。构建使用锁定的 Wails v3 CLI，并重新生成 bindings。

```bash
git tag v1.0.0
git push origin v1.0.0
```

普通分支提交只同步源码，不发布客户端更新；只有同步到 GitHub 的稳定版本标签会触发 Release 工作流。重新运行同一标签时，工作流会覆盖 GitHub 和 Gitee Release 中的同名文件。

切换前已经发布且只识别 GitHub 的旧客户端会从新版本的 GitHub Release 下载升级包；安装包含本次改动的新版本后，后续更新统一走 Gitee。GitHub Release 中的兼容清单和安装包、macOS 兼容 ZIP 都必须至少保留到不再支持旧客户端直接升级为止。

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
