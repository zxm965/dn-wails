# 应用更新模块

## 模块目标

以腾讯云 COS 静态资源作为正式更新源，为 macOS 与 Windows 提供版本展示、启动自动检查、手动检查、确认更新、下载校验和更新后重启能力；GitHub Releases 继续保留发布记录和旧客户端迁移入口。

## 目录与职责

- `internal/buildinfo/`：保存无构建元数据时的兜底开发版本和发布仓库标识。
- `scripts/resolve-development-version.mjs`：开发构建读取最近的稳定 Git 标签并追加 `-dev`，无标签时回退到 `build/config.yml`。
- `internal/appupdate/`：版本比较、发布资源选择、更新状态和安装用例，不依赖 Wails 或具体操作系统。
- `internal/platform/appupdate/static.go`：从配置的 COS HTTPS 地址读取静态更新清单，下载并校验资源。
- `internal/platform/appupdate/installer_darwin.go`：解压新版 `.app`，退出当前进程后替换应用包并重新打开。
- `internal/platform/appupdate/installer_windows.go`：退出当前进程后静默运行用户级 NSIS 安装器并重新打开应用。
- `internal/application/update.go`：向前端暴露版本信息、检查和安装三个 Wails 用例。
- `frontend/src/features/app-update/`：根级更新状态、启动自动检查、确认弹窗和错误反馈。
- `frontend/src/features/test-tools/components/DesktopOverview.tsx`：展示当前版本、平台、更新状态和手动检查按钮。
- `.github/workflows/release.yml`：标签触发的双平台质量检查、构建、GitHub Release 兼容发布、腾讯云 COS 版本归档和最新清单提升。
- `Taskfile.yml` 与 `build/*/Taskfile.yml`：Wails v3 前端、bindings、平台构建和打包任务。
- `scripts/configure-release.mjs`：校验 `vMAJOR.MINOR.PATCH` 标签并更新 `build/config.yml` 的平台包版本。
- `scripts/generate-update-manifest.mjs`：计算发布资源大小和 SHA-256，分别生成 GitHub 兼容清单和 COS 更新清单。
- `scripts/cos-release-config.mjs`：从标准 COS 根域名解析桶名、地域、对象前缀和客户端更新基础地址。
- `scripts/prepare-release-environment.mjs`：校验并生成构建期嵌入的 `.env.local`。
- `scripts/should-promote-update-manifest.mjs`：避免重新运行旧版本时覆盖 COS 中更高版本的根清单。

## 依赖关系

```text
Git tag vX.Y.Z
  → GitLab 镜像同步标签到 GitHub
  → GitHub Actions
      ├── macOS universal .zip / .dmg
      ├── Windows amd64 NSIS installer
      ├── GitHub Release（旧客户端兼容清单）
      └── 腾讯云 COS
          ├── dn-wails/vX.Y.Z/（版本资源与版本清单）
          └── dn-wails/latest.json（稳定更新入口）

React AppUpdateProvider
  → application.App
  → appupdate.Service
  → StaticSource / platform Installer
  → Tencent COS / operating system
```

## 核心链路

### 发布

1. 推送 `v1.2.3` 形式的标签。
2. 工作流校验标签、执行 Go 测试和前端格式、lint、build。
3. 双端 build job 从 GitHub Environment `DATABASE` 读取 `secrets.DATABASE_URL` 和 `secrets.APP_UPDATE_BASE_URL`，结合可选的 `vars.TENCENT_COS_PREFIX` 生成不进入 Git 记录的临时 `.env.local`。
4. 工作流用 `wails3 task common:update:build-assets` 同步平台元数据，并通过 linker flags 注入运行时版本和仓库。
5. macOS 使用 `wails3 task darwin:package:universal` 构建 universal `.app`，再生成自动更新 ZIP 和手动安装 DMG。
6. Windows runner 安装 NSIS 后使用 `wails3 task windows:package ARCH=amd64 INSTALL_SCOPE=user` 构建用户级安装器。
7. 两端资源成功后先生成并暂存使用 GitHub 下载地址的兼容 `latest.json` 和 `SHA256SUMS.txt`。
8. 重新生成使用 COS 下载地址的清单与校验文件，下载并校验固定版本的 COSCLI，将资源上传到 `${TENCENT_COS_PREFIX}/vX.Y.Z/`；未配置前缀时使用 `dn-wails/vX.Y.Z/`。
9. 恢复 GitHub 兼容清单，创建或更新 GitHub Release，保证旧客户端仍可升级；COS 版本目录上传失败时不会发布 GitHub Release。
10. GitHub Release 成功后比较桶内现有根清单版本；仅当当前标签版本不低于现有版本时，将 COS 清单提升为 `${TENCENT_COS_PREFIX}/latest.json`，并通过公开 HTTPS 地址回读校验。

### 检查与安装

1. 前端根 Provider 读取当前构建信息；正式语义化版本向 `${APP_UPDATE_BASE_URL}/dn-wails/latest.json` 发起 GET 请求，其中对象前缀可通过 `TENCENT_COS_PREFIX` 调整。
2. 更新源读取根清单中的最新稳定版本，并推导对应的 `vX.Y.Z` 版本目录。
3. 更新源校验清单版本、仓库标识、版本号、版本目录 URL、资源 URL、大小和 SHA-256；所有 URL 必须位于配置的 COS 基础地址下。
4. 业务服务比较 `MAJOR.MINOR.PATCH`，只在远端版本更高时返回可更新状态。
5. 自动检查和手动检查发现新版后都通过统一确认窗口询问用户，不静默安装。
6. 用户确认后重新读取最新清单，确保确认期间版本未发生变化。
7. 客户端按平台精确选择资源，下载后校验清单声明的字节数和 SHA-256。
8. 校验成功后启动平台更新助手，当前应用退出，替换或安装完成后重新启动。

## 数据契约

```ts
interface ApplicationUpdateInfo {
  currentVersion: string
  updateBaseUrl: string
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

- macOS 自动更新：`dn-wails-darwin-universal.zip`
- macOS 手动安装：`dn-wails-darwin-universal.dmg`
- Windows 自动更新与手动安装：`dn-wails-windows-amd64-installer.exe`
- 自动更新发现与资源元数据：`latest.json`
- 人工校验：`SHA256SUMS.txt`

版本资源位于 `${APP_UPDATE_BASE_URL}/${TENCENT_COS_PREFIX}/vX.Y.Z/`，稳定发现入口位于 `${APP_UPDATE_BASE_URL}/${TENCENT_COS_PREFIX}/latest.json`。资源名是客户端与发布流水线的数据契约，修改时必须同步更新两端和本模块文档。

## 错误与边界

- 开发版本为“当前稳定 Git 标签版本 + `-dev`”，例如标签 `v1.2.3` 对应 `1.2.3-dev`；开发版本只展示，不发起自动更新请求。
- 客户端只访问构建时嵌入的 COS HTTPS 基础地址，不请求 GitHub API，也不携带腾讯云或 GitHub 凭据。
- 版本必须是三段无前导零的稳定语义化版本；预发布标签不会进入发布流水线。
- COS 根目录必须包含 `latest.json`，清单 schema 当前固定为 `1`，仓库标识必须匹配构建元数据，版本必须能映射到唯一的 `vX.Y.Z` 目录。
- Release URL 和每个资源 URL 必须精确指向配置 COS 基础地址下的当前版本目录，资源名不得包含路径或控制字符，且不得重复。
- 清单请求和资源下载发生重定向时，最终 URL 仍必须位于同一 HTTPS 主机和配置路径下，否则拒绝更新。
- 下载只接受 HTTPS、声明大小不超过 1 GiB 且带 SHA-256 digest 的资源；大小或摘要不一致时删除临时文件并拒绝安装。
- macOS 应用包所在目录必须允许当前用户写入；Windows 发布统一使用 Taskfile 的 `INSTALL_SCOPE=user`，避免自动更新请求管理员权限。
- 同一进程只允许一个安装操作；安装前再次检查版本，避免确认期间 COS 根清单发生变化。
- Build 与 Release job 均关联 GitHub Environment `DATABASE`；`DATABASE_URL` 或 `APP_UPDATE_BASE_URL` 缺失、格式非法时立即失败。
- `APP_UPDATE_BASE_URL` 必须是标准 COS 根域名，例如 `https://i96-1310103823.cos.ap-guangzhou.myqcloud.com`，不得携带对象路径、凭据、查询参数或片段。
- 临时 `.env.local` 使用受限权限创建并由 Go embed 写入二进制，其中保存数据库地址和拼接前缀后的完整更新基础地址；文件不进入 Git 记录，也不会主动输出到工作流日志。
- GitHub Secret 只能保护构建前和构建过程中的值；发布后的桌面二进制可被分析，因此数据库账号必须最小权限、限制来源并支持轮换。
- GitHub Variables 只用于公开且随环境变化的构建值；代码签名、公证和部署凭据继续使用独立 Secrets，并限制在实际需要的步骤。
- COS 上传仅在双平台构建成功后执行；缺少密钥或更新根域名、COSCLI 下载校验失败、公开读取失败，或任一文件上传失败时，Release job 会失败。
- COS 中的对象按标签保存在独立目录，不清理历史版本；重新运行同一标签的工作流会覆盖该标签目录下的同名对象。
- 重新运行低于桶内当前最新版的旧标签只更新对应版本目录，不会把根 `latest.json` 降级到旧版本。
- GitHub Release 中保留 GitHub 下载地址的兼容清单，COS 中保存 COS 下载地址的正式清单；新客户端只使用 COS。
- 当前工作流只做 macOS ad-hoc 签名，Windows 也未配置 Authenticode。正式外部分发前需要配置 Apple Developer ID/公证和 Windows 代码签名，否则系统可能显示来源或信誉警告。

## 接入与发布

发布仓库标识固定为 `zxm965/dn-wails`。项目继续以 GitLab 为主仓库时，镜像规则必须同步 Git 标签，并确保 GitHub 仓库启用 Actions、工作流拥有 `contents: write` 权限。构建和发布 job 必须能够访问 Environment `DATABASE` 中的运行配置。静态清单由 Release job 使用构建产物生成，不需要额外 GitHub API Key。构建使用锁定的 Wails v3 CLI，并重新生成 bindings。

腾讯云 COS 接入在 GitHub 仓库的 `Settings → Secrets and variables → Actions` 中配置：

- Repository Secret `TENCENT_SECRET_ID`：腾讯云子账号 SecretId。
- Repository Secret `TENCENT_SECRET_KEY`：腾讯云子账号 SecretKey。
- Environment Secret `APP_UPDATE_BASE_URL`：标准 COS 根域名；工作流会自动解析完整桶名和地域。当前值为 `https://i96-1310103823.cos.ap-guangzhou.myqcloud.com`。
- 可选 Repository 或 Environment Variable `TENCENT_COS_PREFIX`：桶内发布目录，不带首尾 `/`；未配置时为 `dn-wails`。

部署账号只应拥有目标桶与发布前缀所需的查询、普通上传和分块上传权限。不要把 SecretId 或 SecretKey 写入仓库、工作流明文、Issue 或聊天记录；密钥轮换后只需更新 GitHub Secrets。

```bash
git tag v1.0.0
git push origin v1.0.0
```

普通分支提交不会发布客户端更新；只有同步到 GitHub 的版本标签会触发 Release 工作流。默认对象结构如下：

```text
https://i96-1310103823.cos.ap-guangzhou.myqcloud.com/dn-wails/latest.json
https://i96-1310103823.cos.ap-guangzhou.myqcloud.com/dn-wails/v1.2.3/latest.json
https://i96-1310103823.cos.ap-guangzhou.myqcloud.com/dn-wails/v1.2.3/dn-wails-darwin-universal.zip
https://i96-1310103823.cos.ap-guangzhou.myqcloud.com/dn-wails/v1.2.3/dn-wails-darwin-universal.dmg
https://i96-1310103823.cos.ap-guangzhou.myqcloud.com/dn-wails/v1.2.3/dn-wails-windows-amd64-installer.exe
```

首个包含 COS 静态清单读取能力的版本应使用高于当前线上版本的新版本号发布。旧客户端仍会通过 GitHub Release 中的兼容 `latest.json` 下载该版本；升级完成后，后续检查和安装包下载全部改走 COS。

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
