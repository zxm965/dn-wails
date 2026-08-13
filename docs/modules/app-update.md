# 应用更新模块

## 模块目标

以数据库中的更新源配置为入口，为 macOS 与 Windows 提供版本展示、启动自动检查、手动检查、确认更新、下载校验和更新后重启能力。默认配置指向 `https://nexus.i96.me/github/releases` 转发接口，客户端分别访问 `/latest` 获取 GitHub Release 元数据、访问 `/download?version=...&filename=...` 下载资源。

## 目录与职责

- `internal/buildinfo/`：保存无构建元数据时的兜底开发版本和发布仓库标识。
- `scripts/resolve-development-version.mjs`：开发构建读取最近的稳定 Git 标签并追加 `-dev`，无标签时回退到 `build/config.yml`。
- `internal/appupdate/`：版本比较、发布资源选择、更新状态和安装用例，不依赖 Wails 或具体操作系统。
- `internal/platform/appupdate/endpoint.go`：按配置的 `update_endpoint` 访问 `/latest` 读取 GitHub Release JSON，并按版本与文件名拼接 `/download` 地址；下载时注入持久安装身份请求头并校验资源。
- `internal/installation/`：生成和持久化下载门禁使用的 UUID v4 安装 ID、首次安装版本与最近运行版本。
- `internal/platform/appupdate/config.go`：从 PostgreSQL 读取当前应用、渠道、平台和架构对应的更新源配置。
- `internal/platform/appupdate/installer_darwin.go`：挂载新版 DMG，退出当前进程后替换应用包、卸载镜像并重新打开。
- `internal/platform/appupdate/installer_windows.go`：退出当前进程后静默运行用户级 NSIS 安装器并重新打开应用。
- `internal/application/update.go`：向前端暴露版本信息、检查和安装三个 Wails 用例。
- `frontend/src/features/app-update/`：根级更新状态、启动自动检查、确认弹窗和错误反馈。
- `frontend/src/features/devtools/components/DesktopOverview.tsx`：展示当前版本，不展示更新源地址等发布配置。
- `frontend/src/features/settings/components/SettingsPanel.tsx`：在偏好设置最底部展示更新状态和手动检查按钮。
- `.github/workflows/release.yml`：标签触发的双平台质量检查、构建以及 GitHub、Gitee Release 发布。
- `.github/workflows/republish-gitee-release.yml`：从已有 GitHub Release 下载安装包并补发指定标签的 Gitee Release，不重建桌面应用或移动标签。
- `Taskfile.yml` 与 `build/*/Taskfile.yml`：Wails v3 前端、bindings、平台构建和打包任务。
- `scripts/configure-release.mjs`：校验 `vMAJOR.MINOR.PATCH` 标签并更新 `build/config.yml` 的平台包版本。
- `scripts/generate-update-manifest.mjs`：计算发布资源大小和 SHA-256，生成发布附加元数据文件；客户端更新不依赖该文件。
- `scripts/publish-gitee-release.mjs`：通过 Gitee OpenAPI 创建或更新 Release，复用大小一致的同名附件，覆盖不一致附件并上传缺失产物。
- `scripts/prepare-release-environment.mjs`：校验 `DATABASE_URL` 并生成构建期临时 `.env.local`。

## 依赖关系

```text
Gitee repository tag vX.Y.Z
  → 现有镜像同步标签到 GitHub
  → GitHub Actions
      ├── macOS universal .zip / .dmg
      ├── Windows amd64 NSIS installer
      ├── GitHub Release + 发布资源
      └── Gitee Release + 同路径同名发布资源

React AppUpdateProvider
  → application.App
  → appupdate.Service
  → installation identity / update_endpoint / platform Installer
  → 转发 Release 元数据 / Release 下载资源 / operating system
```

## 核心链路

### 发布

1. 向 Gitee 仓库推送 `v1.2.3` 形式的标签。
2. 工作流校验标签、执行 Go 测试和前端格式、lint、build。
3. 双端 build job 从 GitHub Environment `RELEASE` 读取 `secrets.DATABASE_URL`，生成不进入 Git 记录的临时 `.env.local`。
4. 工作流用 `wails3 task common:update:build-assets` 同步平台元数据，并通过 linker flags 注入运行时版本和仓库。
5. macOS 使用 `wails3 task darwin:package:universal` 构建 universal `.app`，再生成发布 ZIP 和供当前客户端自动更新、手动安装的 DMG。
6. Windows runner 安装 NSIS 后使用 `wails3 task windows:package ARCH=amd64 INSTALL_SCOPE=user` 构建用户级安装器。
7. 两端资源成功后为 ZIP、DMG 和 EXE 计算大小与 SHA-256，并生成 GitHub Release 对应的附加元数据和 `SHA256SUMS.txt`。
8. 创建或更新 GitHub Release，并上传应用安装资源和校验文件；客户端通过转发接口读取 GitHub Release JSON。
9. 通过 Gitee OpenAPI 创建或更新同标签 Release，删除同名旧附件后上传当前 ZIP、DMG、EXE、附件元数据和校验文件；客户端下载统一通过 Nexus Proxy 的 GitHub Release Download 接口完成，不再依赖 Gitee 同路径附件或 `browser_download_url` 域名改写。
10. Gitee 发布中断时可手动运行 `Republish Gitee release`，输入稳定标签后从对应 GitHub Release 恢复安装包，并只补齐缺失或大小不一致的 Gitee 附件。

### 检查与安装

1. 前端根 Provider 读取当前构建信息；服务端先按应用、渠道、平台和架构从 `sys_app_update_source` 读取更新源配置。
2. 若数据库未配置或表未迁移，服务端回退到 `buildinfo.UpdateEndpoint` 与 `buildinfo.Repository`。
3. HTTP 客户端将配置的 `update_endpoint` 规范化为 `/latest`，读取 GitHub Release JSON。
4. 更新源校验仓库标识、版本号、Release URL、资源名称、大小和 SHA-256；客户端忽略 `browser_download_url`，按 Release 标签和资源名称将下载地址拼接为 `update_endpoint` 对应的 `/download?version=...&filename=...`。
5. 业务服务比较 `MAJOR.MINOR.PATCH`，只在远端版本更高时返回可更新状态。
6. 自动检查和手动检查发现新版后都通过统一确认窗口询问用户，不静默安装。
7. 用户确认后重新读取 Release 元数据，确保确认期间版本未发生变化。
8. 当前客户端按平台精确选择 DMG 或 EXE，由 Go HTTP 客户端携带安装 ID、当前版本和平台 User-Agent 请求下载；下载后校验 Release 元数据声明的字节数和 SHA-256。
9. 校验成功后启动平台更新助手；macOS 挂载 DMG 并在当前应用退出后替换 `.app`，Windows 静默运行用户级安装器，完成后重新启动。

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

更新元数据端点固定返回 GitHub Release JSON，客户端只依赖以下字段：

```ts
interface GitHubReleaseEndpoint {
  tag_name: string
  name: string
  body: string
  html_url: string
  draft: boolean
  prerelease: boolean
  published_at: string
  assets: Array<{
    name: string
    digest: `sha256:${string}`
    size: number
  }>
}
```

## 发布资源约定

- macOS 发布压缩包：`dn-wails-darwin-universal.zip`
- macOS 当前客户端自动更新与手动安装：`dn-wails-darwin-universal.dmg`
- Windows 自动更新与手动安装：`dn-wails-windows-amd64-installer.exe`
- 自动更新发现与资源元数据：`update_endpoint` 对应的 `/latest` 转发接口返回的 GitHub Release JSON
- 自动更新下载：`update_endpoint` 对应的 `/download?version=...&filename=...` 转发接口
- 人工校验：`SHA256SUMS.txt`

这些文件均上传到对应标签的 GitHub 和 Gitee Release。客户端请求 `update_endpoint` 对应的 `/latest` 获取 GitHub Release 元数据，再请求对应的 `/download` 接口并传入 Release 标签和资源文件名下载。下载请求还必须携带 `X-Install-ID`、`X-App-Version` 和版本一致的 `dn-wails-updater/<version> (<platform>; <arch>)` User-Agent。资源名、Release 标签、请求头以及 `latest`/`download` 路径是客户端与代理服务的数据契约，修改时必须同步更新两端和本模块文档。

## 错误与边界

- 开发版本为“当前稳定 Git 标签版本 + `-dev`”，例如标签 `v1.2.3` 对应 `1.2.3-dev`；开发版本只展示，不发起自动更新请求。
- 客户端只请求配置的公开 `update_endpoint` 对应的 `latest` 与 `download` 接口，不注入任何 Release 访问令牌；`latest` 可匿名访问，`download` 必须通过安装身份请求头的无状态格式校验。
- 下载门禁不执行安装注册、设备认证或服务端计数限流，安装 ID 和请求头均可被专用脚本模拟；其目标是阻止普通网页直链和低成本浏览器请求，而不是提供不可绕过的授权。
- 下载请求由 Go HTTP 客户端发起，不受浏览器 CORS 限制；Proxy 不需要为网页开放跨域调用。
- 安装身份未初始化、身份文件非法或当前版本不是稳定版本时，客户端在访问 Proxy 前拒绝下载。
- Proxy 对门禁失败统一返回固定 `403`、固定错误码与泛化文案，不向调用方暴露具体失败字段或校验规则。
- 版本必须是三段无前导零的稳定语义化版本；预发布标签不会进入发布流水线。
- `update_endpoint` 必须配置为 Releases 基础地址，例如 `https://nexus.i96.me/github/releases`；客户端分别访问其 `/latest` 和 `/download` 子路径，不能把具体路由地址作为配置值。
- `/latest` 必须返回 GitHub Release JSON；GitHub Release 的 `draft`、`prerelease` 会被视为无可用更新。Release 的 `html_url` 必须属于配置的 `expected_repository`。
- 资源名不得包含路径或控制字符，且不得重复；`browser_download_url` 不作为客户端下载地址来源。
- 下载只接受 HTTPS、声明大小不超过 1 GiB 且带 SHA-256 digest 的资源；大小或摘要不一致时删除临时文件并拒绝安装。
- Gitee 普通项目单个 Release 附件不能超过 100 MB，仓库附件总量不能超过 1 GB；发布脚本会在上传前拒绝超过单附件限制的构建产物。
- macOS 应用包所在目录必须允许当前用户写入；Windows 发布统一使用 Taskfile 的 `INSTALL_SCOPE=user`，避免自动更新请求管理员权限。
- Windows NSIS 卸载时删除安装身份文件但保留其他应用配置；更新安装不会执行该卸载清理。macOS 删除 `.app` 没有对应卸载钩子。
- 同一进程只允许一个安装操作；安装前再次检查版本，避免确认期间 Release 发生变化。
- Build 与 Release job 均关联 GitHub Environment `RELEASE`；`DATABASE_URL` 缺失、超过 8192 字符或包含控制字符时，build job 立即失败。
- GitHub Actions 使用仓库 Secret `GITEE_TOKEN` 调用 Gitee OpenAPI；令牌只存在于工作流，不进入发布附件元数据或桌面二进制。
- 临时 `.env.local` 使用受限权限创建并由 Go embed 写入二进制，只保存数据库地址，不进入 Git 记录，也不会主动输出到工作流日志。
- GitHub Secret 只能保护构建前和构建过程中的值；发布后的桌面二进制可被分析，因此数据库账号必须最小权限、限制来源并支持轮换。
- 当前工作流只做 macOS ad-hoc 签名，Windows 也未配置 Authenticode。正式外部分发前需要配置 Apple Developer ID/公证和 Windows 代码签名，否则系统可能显示来源或信誉警告。

## 接入与发布

默认更新源为数据库表 `sys_app_update_source.update_endpoint = https://nexus.i96.me/github/releases`，`expected_repository = zxm965/dn-wails`；数据库不可用时使用 `internal/buildinfo` 中的同值兜底。GitHub 仓库需要启用 Actions，并授予 Release 工作流 `contents: write` 权限。GitHub Actions 仓库 Secret `GITEE_TOKEN` 必须具有目标 Gitee 仓库的 Release 写权限，Gitee 仓库则必须公开 Release 读取能力。Build 与 Release job 使用 GitHub Environment `RELEASE`，其中 build job 还需要 `DATABASE_URL` Secret。构建使用锁定的 Wails v3 CLI，并重新生成 bindings。


```bash
git tag v1.0.0
git push origin v1.0.0
```

普通分支提交不发布客户端更新；只有从 Gitee 镜像到 GitHub 的稳定版本标签会触发 Release 工作流。重新运行同一标签时，工作流会覆盖 GitHub 和 Gitee Release 中的同名文件。

客户端检查和下载统一走 Nexus Proxy；Release 中的资源文件名必须与 GitHub Release JSON 的 `assets[].name` 保持一致，代理下载请求使用对应 Release 标签作为 `version` 参数。

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
