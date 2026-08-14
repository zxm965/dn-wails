# 安装身份模块

## 模块目标

在应用首次成功启动时生成一个随机、稳定的安装实例标识，并将首次安装版本与最近运行版本持久化。该标识只用于更新下载接口的轻量无状态请求门禁，不作为用户身份、设备指纹或可靠授权凭证。

## 目录与职责

- `internal/installation/model.go`：定义安装身份数据结构和结构版本。
- `internal/installation/service.go`：初始化、校验、生成 UUID v4、更新最近运行版本并提供只读请求身份。
- `internal/installation/service_test.go`：覆盖首次生成、跨版本保留、非法文件和持久化失败。
- `internal/storage/`：将身份保存到用户配置目录中的 `installation.json`。
- `internal/application/app.go`：在 Wails `ServiceStartup` 阶段初始化安装身份。
- `internal/platform/appupdate/endpoint.go`：下载更新资源时读取身份并注入请求头。

## 依赖关系

```text
App ServiceStartup
  → installation.Service.Initialize
  → storage.Store.Load / Save

appupdate.EndpointSource.Download
  → installation.Service.InstallationID / CurrentVersion
  → Nexus Proxy /github/releases/download
```

安装身份模块不依赖 Wails runtime、React、数据库或具体操作系统 API。

## 核心链路

1. 应用启动时从用户配置目录读取 `installation.json`。
2. 文件不存在时使用密码学安全随机源生成规范 UUID v4，并先持久化后在内存中启用。
3. 文件存在时严格校验结构版本、UUID、创建时间和版本字段。
4. 应用升级后保留原安装 ID、创建时间和首次安装版本，只更新最近运行版本。
5. 下载更新资源时由 Go HTTP 客户端携带安装 ID、当前版本和固定格式 User-Agent。
6. 若身份未初始化、文件非法或首次持久化失败，不发送缺少身份或使用临时 ID 的下载请求。

## 数据契约

```json
{
  "schemaVersion": 1,
  "installationId": "123e4567-e89b-42d3-a456-426614174000",
  "createdAt": "2026-08-13T08:30:00Z",
  "firstInstallVersion": "1.0.0",
  "lastSeenVersion": "1.1.0"
}
```

下载请求头：

```http
X-Install-ID: <canonical UUID v4>
X-App-Version: <MAJOR.MINOR.PATCH>
User-Agent: cull-pear-updater/<version> (<goos>; <goarch>)
```

`X-App-Version` 表示当前运行版本；下载查询参数 `version` 继续表示目标 Release 标签，两者语义不得混用。

## 错误与边界

- 安装 ID 是随机安装实例标识，不采集 MAC 地址、主机名、硬盘序列号或其他机器指纹。
- 请求头可以被专用脚本复制或伪造，只能提高普通网页和低成本脚本的调用门槛。
- 身份文件损坏时不会静默生成新 ID；应用仍可启动，但更新下载会失败，直到相关文件被清理或修复。
- 用户配置文件存在期间 ID 持续不变。清除 `installation.json` 或整个应用配置目录后，下次启动会生成新 ID。
- 普通应用升级不会删除身份文件。Windows NSIS 正式卸载会只删除 `installation.json`，保留设置等其他用户数据；macOS 拖动应用到废纸篓没有可靠卸载钩子，因此仅删除应用包不保证同步删除用户配置文件。
- 开发版本允许保存 `MAJOR.MINOR.PATCH-dev`，但现有更新模块不会用开发版本发起安装下载；Proxy 下载门禁只接受稳定版本。

## 接入方式

安装身份由 `main.go` 创建并同时注入应用生命周期和更新端点。其他功能不得自行读取身份文件、重复生成 ID 或从 React 传入安装 ID。

修改身份数据结构时必须提升 `schemaVersion` 并明确迁移策略；不能把访问令牌、用户账号或设备敏感信息写入该文件。

## 验证

```bash
go test ./internal/installation ./internal/platform/appupdate ./internal/application
go test ./...
```
