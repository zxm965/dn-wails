# 应用全局配置

## 模块目标

为 Go 与 React 提供统一配置，并明确区分仓库明文、GitHub Variables、GitHub Secrets 和本地密钥。当前发布策略按项目决策将 `DATABASE_URL` 嵌入安装包，同时确保真实值不进入 Git 记录。

## 配置文件

项目根目录的 `.env` 是公开配置源：

```dotenv
APP_DISPLAY_NAME=dn-wails
APP_AUTHOR_NAME=Your Name
```

输入约定：

- 变量名固定为 `APP_DISPLAY_NAME` 和 `APP_AUTHOR_NAME`，使用大写字母和下划线，两个字段都必须提供。
- 值可以直接书写，也可以使用成对的单引号或双引号。
- 首尾空白会被移除，每个值都不能为空，最长 40 个 Unicode 字符。
- 禁止换行符和其他控制字符。
- 同一个变量不得重复声明。
- 该文件会进入前端产物与桌面程序，只能存放公开配置，禁止写入密码、Token 或其他密钥。
- `frontend/vite.config.ts` 使用 `envPrefix: 'APP_'`；任何 `APP_*` 值都会进入前端 JavaScript，不能因为它来自 GitHub Secret 就视为保密。

本地开发密钥使用 `.env.local`，真实文件由 `.gitignore` 排除；Go build 会通过 `all:.env*` 自动嵌入本地文件：

```dotenv
DATABASE_URL='postgres://username:password@localhost:5432/database'
```

## 配置分级

| 分类 | 适合字段 | 存放位置 | 是否进入安装包 |
| --- | --- | --- | --- |
| 仓库公开配置 | `APP_DISPLAY_NAME`、`APP_AUTHOR_NAME`，以及未来公开 API 地址、更新通道等 | 已提交的 `.env` | 是 |
| GitHub Actions Variables | 随部署环境变化但本身公开的名称、URL、渠道标识 | Repository/Environment Variables，工作流通过 `vars.*` 读取 | 若注入构建则是 |
| GitHub Actions Secrets | Apple/Windows 签名材料、公证凭据、部署 Token | Repository/Environment Secrets，工作流通过 `secrets.*` 读取 | 签名工具临时使用，不写入应用 |
| 嵌入式运行配置 | `DATABASE_URL` | 本地 `.env.local`；正式发布使用 Environment `RELEASE` 的 `secrets.DATABASE_URL` | 是 |
| 其他本地私密配置 | 个人 Token、测试账号 | `.env.*.local` 或操作系统密钥存储 | 默认不应进入安装包 |

判断原则：凡是安装包运行时能读取到的值，最终用户也有能力提取，不能视为真正保密。`DATABASE_URL` 是当前策略中的明确例外，因此必须使用最小权限、限制网络来源和数据范围、可随时轮换的专用账号，不能使用管理员或迁移账号。

## 目录与职责

- `.env`：应用名称和作者名称的全局公开配置源。
- `.gitignore`：忽略 `.env.local` 和 `.env.*.local`。
- `internal/appconfig/`：按受限 dotenv 语法解析并校验 Go 启动配置。
- `main.go`：嵌入 `.env*`，分别解析公开应用配置和可选 `.env.local` 数据库配置。
- `frontend/src/app/appConfig.ts`：校验 Vite 环境变量并向 React 暴露只读配置。
- `frontend/vite.config.ts`：从项目根目录加载环境变量，仅向前端暴露 `APP_` 前缀。

## 核心链路

```text
.env
  ├── APP_DISPLAY_NAME
  │   ├── go:embed → appconfig.Parse → application.Options.Name / WebviewWindowOptions.Title
  │   └── Vite env → appConfig.displayName → TitleBar / AppSidebar / document.title / Window.SetTitle / 页面展示
  └── APP_AUTHOR_NAME
      ├── go:embed → appconfig.Parse → 启动配置校验
      └── Vite env → appConfig.authorName → AppSidebar 左下角状态区

.env.local / process DATABASE_URL
  → go:embed / process environment
  → dn.ResolveDatabaseURL
  → dn.PostgresService
```

## 内部标识边界

- `APP_DISPLAY_NAME` 只影响用户可见名称。
- `APP_AUTHOR_NAME` 只影响侧栏左下角展示名称。
- Go module、存储目录、日志目录、本地存储 key 和单实例 UUID 不随展示名称变化。
- 内部稳定名称仍为 `dn-wails`，避免改名后丢失已有设置或产生第二套数据目录。

## 接入方式

- React 新增应用名称展示时统一读取 `appConfig.displayName`，禁止再次硬编码 `dn-wails`。
- React 展示作者名称时统一读取 `appConfig.authorName`，禁止在组件中硬编码。
- Go 启动窗口名称读取 `appconfig.Config.DisplayName`。
- 安装包元数据由 `build/config.yml` 管理；发布脚本写入 `info.version` 后执行 `wails3 task common:update:build-assets` 同步各平台文件。
- 新增公开全局字段时，变量名必须使用 `APP_` 前缀，并同步更新 Go 类型与校验、前端环境类型、只读配置和本文档。
- 环境相关但不敏感的构建值优先使用 GitHub Variables；密钥使用 GitHub Secrets，禁止通过 `APP_*` 暴露给前端。
- `DATABASE_URL` 只允许出现在本地忽略文件、进程环境或 GitHub Environment Secret 中。Release 工作流仅在构建阶段生成临时 `.env.local`，不得输出完整值。

## 验证

```bash
go test ./internal/appconfig
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```

修改配置后，Vite 会重新加载环境变量；React 同步更新标题和侧栏作者名称。Go 原生窗口的初始标题及配置校验在下次启动时读取新值。
