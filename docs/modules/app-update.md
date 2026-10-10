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
- `internal/platform/appupdate/installer_windows.go`、`windows_update_handoff.go` 与嵌入的 `windows_update.ps1`：通过 JSON 配置和就绪/提交文件完成双向交接；PowerShell 观察进程预检、备份后才允许退出，随后打开用户级 NSIS 安装向导，按发布摘要校验目标 EXE，失败时恢复旧文件并重启。没有原生 Go 更新 helper。`helper_process_windows.go` 隔离 Windows 进程创建标志。
- `build/windows/nsis/project.nsi`：定义安装向导，将旧 EXE 改名后写入新版，并从既有卸载注册信息恢复自定义安装目录、持久化 `InstallLocation`，兼容尚未携带显式安装目录的旧版更新进程；完成页的启动选项由观察进程执行，以免重复启动或校验前启动。
- `build/windows/nsis/compile.ps1`：在 Windows runner 上显式调用 `makensis` 编译 `project.nsi`，校验输入和非空安装器输出。
- `internal/platform/appupdate/update_result.go`：读取持久更新结果，将失败或中断原因通过版本信息返回，供下次启动展示。
- `internal/platform/appupdate/windows_update_integration_test.go`：通过隔离的临时程序验证更新交接；启动测试程序遇到 Linux 并发执行时的 `ETXTBSY` 会在两秒内重试，其他启动错误立即返回，不改变生产更新行为。
- `internal/application/update.go`：向前端暴露版本信息、检查和安装三个 Wails 用例，并转发下载进度事件。
- `frontend/src/features/app-update/`：根级更新状态、启动自动检查、确认弹窗、下载进度和错误反馈。
- `frontend/src/features/settings/components/DesktopOverview.tsx`：展示当前版本，不展示更新源地址等发布配置。
- `frontend/src/features/settings/components/SettingsPanel.tsx`：在设置“概览”页签展示更新状态和手动检查按钮。
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
      ├── Windows amd64 application .exe
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
5. macOS 使用 `wails3 task darwin:package:universal` 构建名为 `Cull Pear.app` 的 universal 应用包，再生成 `cull-pear-*` 发布 ZIP 和供当前客户端自动更新、手动安装的 DMG。
6. Windows runner 安装 NSIS 后使用 `wails3 task windows:package ARCH=amd64 INSTALL_SCOPE=user` 构建用户级安装器；任务通过 `build/windows/nsis/compile.ps1` 显式调用 `makensis` 并验证安装器已生成。发布同时保留纯应用 `cull-pear-windows-amd64.exe`，供人工诊断或直接运行；自动更新仍只选择 NSIS 安装器。
7. 两端资源成功后为所有发布文件计算大小与 SHA-256，并生成 GitHub Release 对应的附加元数据和 `SHA256SUMS.txt`。
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
8. 当前客户端按平台精确选择 DMG 或 NSIS 安装器，由 Go HTTP 客户端携带安装 ID、当前版本和平台 User-Agent 请求下载；下载后校验 Release 元数据声明的字节数和 SHA-256。Windows 还必须在下载前取得同一 Release 中纯应用 EXE 的 SHA-256，作为安装后校验依据，缺少该资源或摘要时保留应用并拒绝更新。
9. 校验成功后启动平台更新助手；macOS 挂载 DMG 并在当前应用退出后替换 `.app`。Windows 将版本、原 EXE 路径、固定目标 `cull-pear.exe`、安装器及目标 EXE 摘要写入临时 JSON 配置，避免路径通过脚本文本插值。Go 同时捕获 PowerShell 的标准输出与标准错误，涵盖脚本加载前的失败。
10. Windows 助手验证安装器摘要、原程序存在性、目标目录写入能力和备份创建，持久化 `prepared` 后发出 `ready`。Go 最多等待 20 秒；失败、提前退出或取消时终止助手并保留应用。收到就绪后才写入 `commit`，门面随后退出应用。助手必须同时看到提交和父进程退出才安装，最长等待 60 秒。
11. 观察进程以 `/UPDATE /D=<原 EXE 目录>` 启动可见 NSIS 向导，不携带 `/S`；用户点击“下一步”、安装及完成。`/UPDATE` 防止陈旧注册信息覆盖显式目录、跳过目录选择页和已就绪的 WebView2 bootstrapper；`/D` 保持末尾且不加引号。交互安装没有等待用户操作的超时，也不会自动反复打开向导；取消返回退出码 `1`，恢复并打开旧应用。`interactive=false` 仅保留给无界面回归与旧客户端兼容，具有 120 秒安装期限和退出码 `73` 的有限重试。
12. NSIS 先把目标旧 EXE 改名到同卷唯一备份路径，再写入新版，避开应用退出后 Windows 仍持有映像写锁导致原地覆盖失败的问题；写入失败恢复旧名字并报告退出码 `73`。观察进程随后必须验证目标 EXE 与同一 Release 的纯应用 EXE 摘要一致，不能仅凭退出码或哈希变化判定成功。直接运行或改名 EXE 会迁移到同目录的规范 `cull-pear.exe`；旧文件保留供人工恢复，后续从新快捷方式运行安装版。
13. 更新向导完成页勾选启动时，只写入暂存目录中的 `launch-requested`，观察进程校验完成后启动一次新应用；取消勾选则安装成功并保持关闭。新进程至少存活 1.5 秒才完成此次启动流程。安装失败、校验失败或立即启动失败时，在确认安装进程停止后恢复备份 EXE 并重新打开旧程序；回滚也使用同卷暂存、改名替换、有限重试和备份摘要校验。失败会保留临时安装器和备份以供人工恢复，不把 EXE 回滚宣称为整个 NSIS 注册信息的事务回滚。
14. 日志保存在 `%APPDATA%\cull-pear\update-logs\`，最近结果保存在 `%APPDATA%\cull-pear\update-result.json`，包含 `status`、`version`、`message`、`logPath`。启动时 `Info.lastUpdateError` 返回失败或中断说明；前端保留设置页错误并提示，暂停本次启动的自动更新，用户仍可手动重试。成功结果不产生错误。

安装开始后，下载器按实际读取字节数回调进度。`internal/appupdate.Service` 将进度归一化为版本、阶段、已下载字节、总字节和百分比，`internal/application.App` 通过 `app-update:progress` 事件转发给前端。`AppUpdateProvider` 负责订阅并清理事件，设置页展示下载进度；Windows 的确认弹窗和完成提示明确说明将打开安装向导，macOS 保留原有自动重启流程。

### 开源实现参考

采用 [nsmao-com/codex-app-desktop 的 Windows 安装更新实现](https://github.com/nsmao-com/codex-app-desktop/blob/9671359f1e95ba14d6abe238727164aab079d977/update_install.go) 中“等待原进程退出 → 启动不带 `/S` 的 EXE 安装器 → 等待安装结束”的流程；该项目使用 Wails v3。此参考证明实现路径，不代表已取得本项目 Windows 设备的现场成功日志。本项目保留就绪交接、发布摘要校验和失败恢复，并让完成页控制是否重启。

Wails 自身 [Windows updater 的映像锁处理](https://github.com/wailsapp/wails/blob/v3.0.0-beta.25/v3/pkg/updater/helper_windows.go) 记录了退出后删除旧 EXE 仍可能失败的情况，并采用改名绕开旧映像锁；本项目将同卷改名方案落实在 NSIS 和 PowerShell 回滚中，不使用其 Go helper。

## 数据契约

```ts
interface ApplicationUpdateInfo {
  currentVersion: string
  repository: string
  platform: string
  arch: string
  configured: boolean
  canInstall: boolean
  lastUpdateError: string
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

interface ApplicationUpdateProgress {
  version: string
  phase: 'downloading' | 'installing'
  downloadedBytes: number
  totalBytes: number
  percent: number
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

- macOS 发布压缩包：`cull-pear-darwin-universal.zip`，内部应用包为 `Cull Pear.app`
- macOS 当前客户端自动更新与手动安装：`cull-pear-darwin-universal.dmg`，DMG 卷与应用展示名为 `Cull Pear`
- Windows 应用本体：`cull-pear-windows-amd64.exe`
- Windows 自动更新与手动安装：`cull-pear-windows-amd64-installer.exe`
- 自动更新发现与资源元数据：`update_endpoint` 对应的 `/latest` 转发接口返回的 GitHub Release JSON
- 自动更新下载：`update_endpoint` 对应的 `/download?version=...&filename=...` 转发接口
- 人工校验：`SHA256SUMS.txt`

这些文件均上传到对应标签的 GitHub 和 Gitee Release。客户端请求 `update_endpoint` 对应的 `/latest` 获取 GitHub Release 元数据，再请求对应的 `/download` 接口并传入 Release 标签和资源文件名下载。下载请求还必须携带 `X-Install-ID`、`X-App-Version` 和版本一致的 `cull-pear-updater/<version> (<platform>; <arch>)` User-Agent。资源名、Release 标签、请求头以及 `latest`/`download` 路径是客户端与代理服务的数据契约，修改时必须同步更新两端和本模块文档。

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
- Windows 更新必须把 `/D=<当前 exe 所在目录>` 放在 NSIS 参数末尾；该值不加引号，因为 NSIS 会把 `/D=` 后的全部剩余命令行（包括空格）解释为安装目录。安装包没有 Authenticode 签名是独立风险：SmartScreen 可能提示，启用强制策略或 Smart App Control 的设备还可能直接阻止未知未签名程序；可见向导不能保证绕过系统执行策略。
- 旧版本如果已经把一次失败更新安装到默认 C 盘，卸载注册信息可能已被改写为 C 盘路径；这类客户端需要先手动把修复版本安装回原目录一次，之后自动更新会持续沿用当前 exe 所在目录。
- Windows NSIS 卸载时删除安装身份文件但保留其他应用配置；更新安装不会执行该卸载清理。macOS 删除 `.app` 没有对应卸载钩子。
- 更新助手由当前运行的旧版本写出，下载到新版本安装包不会更新本次运行的助手。已经无法交接的旧客户端需要手动覆盖安装修复版本一次，不能依赖新助手自我修复首次升级。
- Windows 启动存活检查不是 WebView/UI 功能健康检查；系统执行策略、实际桌面启动和用户设备上的杀毒拦截仍需对应环境验证。
- 同一进程只允许一个安装操作；安装前再次检查版本，避免确认期间 Release 发生变化。
- 下载器无法提供字节流进度时仍兼容旧的 `ReleaseSource.Download` 实现，前端至少显示下载开始和安装准备阶段。
- Build 与 Release job 均关联 GitHub Environment `RELEASE`；`DATABASE_URL` 缺失、超过 8192 字符或包含控制字符时，build job 立即失败。
- GitHub Actions 使用仓库 Secret `GITEE_TOKEN` 调用 Gitee OpenAPI；令牌只存在于工作流，不进入发布附件元数据或桌面二进制。
- 临时 `.env.local` 使用受限权限创建并由 Go embed 写入二进制，只保存数据库地址，不进入 Git 记录，也不会主动输出到工作流日志。
- GitHub Secret 只能保护构建前和构建过程中的值；发布后的桌面二进制可被分析，因此数据库账号必须最小权限、限制来源并支持轮换。
- 当前工作流只做 macOS ad-hoc 签名，Windows 也未配置 Authenticode。正式外部分发前需要配置 Apple Developer ID/公证和 Windows 代码签名，否则系统可能显示来源或信誉警告。

## 接入与发布

默认更新源使用数据库记录 `app_code = cull-pear`、`update_endpoint = https://nexus.i96.me/github/releases`、`expected_repository = zxm965/dn-wails`；数据库不可用时使用 `internal/buildinfo` 中的仓库与端点兜底。GitHub 仓库需要启用 Actions，并授予 Release 工作流 `contents: write` 权限。GitHub Actions 仓库 Secret `GITEE_TOKEN` 必须具有目标 Gitee 仓库的 Release 写权限，Gitee 仓库则必须公开 Release 读取能力。Build 与 Release job 使用 GitHub Environment `RELEASE`，其中 build job 还需要 `DATABASE_URL` Secret。构建使用锁定的 Wails v3 CLI，并重新生成 bindings。


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

更新回归还包括：

```bash
# Windows 默认调用系统自带的 Windows PowerShell 5.1。
# macOS/Linux 指定临时 PowerShell 7 路径，以实际执行同一助手脚本。
CULL_PEAR_TEST_POWERSHELL=/path/to/pwsh go test ./internal/platform/appupdate -count=1 -parallel=4
# 提供 makensis 时编译实际 project.nsi；Windows 上还执行真实安装器。
CULL_PEAR_TEST_MAKENSIS=/path/to/makensis go test ./internal/platform/appupdate -run TestWindowsNSISUpdateEndToEnd -count=1 -v
```

`testdata/updatefixture` 构建临时旧应用、新应用与故障注入安装器。集成测试执行实际 PowerShell 脚本及 Go 交接函数，验证中文/空格/方括号路径、规范及改名 EXE、就绪失败、取消、父进程未退出、瞬时/持续文件锁退出码、安装器卡死、摘要错误和新程序启动失败；交互回归额外验证不传 `/S`、取消安装恢复、用户等待超过静默期限仍成功、取消启动勾选后不启动。macOS/Linux 将 Windows `taskkill` 替换为 .NET 进程树终止，并将可见 shell 边界替换为直接启动临时测试进程；不替代人工向导验证。

Windows 助手使用 `CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP`，为 Windows PowerShell 5.1 提供无可见窗口的控制台。不能使用 `DETACHED_PROCESS`：在该模式下 PowerShell 可能以退出码 0 提前结束，脚本和日志均未执行。专用 Windows 回归测试验证隐藏脚本确实执行、标准输出/错误被捕获且退出码正确。

文件摘要通过 .NET `SHA256` 流式计算，不依赖 `Get-FileHash` 的模块自动加载，避免从 PowerShell 7 等宿主继承的 `PSModulePath` 使 Windows PowerShell 5.1 校验失败；输出日志统一采用 UTF-8，保留中文路径。

`.github/workflows/windows-updater-tests.yml` 在 main 分支相关文件变动时先执行 Windows PowerShell 5.1 和真实 NSIS 集成测试，也支持手动触发，允许创建发布标签前取得原生平台验证结果。Windows 发布构建仍在打包前强制执行同组测试。真实 NSIS 测试额外持有拒绝原地写入但允许改名的 Windows 内核文件句柄，先断言旧 EXE 无法覆盖，再验证安装器仍能改名并成功安装。测试使用唯一的产品注册信息、临时目标和测试应用，完成后精确清理测试快捷方式及卸载注册项，不执行会触及真实安装身份的生产卸载程序。任何测试失败均阻止后续构建和 Release 发布。

实际挂载 DMG 并替换 macOS `.app`、真实 Wails 窗口启动、Windows 安装向导点击及完成页启动选项、系统执行策略和签名提示仍必须分别在对应桌面系统上人工验证。
