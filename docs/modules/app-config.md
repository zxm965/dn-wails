# 应用全局配置

## 模块目标

为 Go 与 React 提供同一份应用展示配置，避免标题栏、侧边栏、页面标题和原生窗口分别维护应用名称。

## 配置文件

项目根目录的 `.env` 是唯一配置源：

```dotenv
APP_DISPLAY_NAME=dn-wails
```

输入约定：

- 变量名固定为 `APP_DISPLAY_NAME`，使用大写字母和下划线。
- 值可以直接书写，也可以使用成对的单引号或双引号。
- 首尾空白会被移除，值不能为空，最长 40 个 Unicode 字符。
- 禁止换行符和其他控制字符。
- 同一个变量不得重复声明。
- 该文件会进入前端产物与桌面程序，只能存放公开配置，禁止写入密码、Token 或其他密钥。

## 目录与职责

- `.env`：应用展示名称的全局公开配置源。
- `internal/appconfig/`：按受限 dotenv 语法解析并校验 Go 启动配置。
- `main.go`：嵌入配置并设置 Wails 原生窗口初始标题。
- `frontend/src/app/appConfig.ts`：校验 Vite 环境变量并向 React 暴露只读配置。
- `frontend/vite.config.ts`：从项目根目录加载环境变量，仅向前端暴露 `APP_` 前缀。

## 核心链路

```text
.env / APP_DISPLAY_NAME
  ├── go:embed → appconfig.Parse → options.App.Title
  └── Vite env → appConfig → TitleBar / AppSidebar / document.title / WindowSetTitle / 页面展示
```

## 内部标识边界

- `APP_DISPLAY_NAME` 只影响用户可见名称。
- Go module、存储目录、日志目录、本地存储 key 和单实例 UUID 不随展示名称变化。
- 内部稳定名称仍为 `dn-wails`，避免改名后丢失已有设置或产生第二套数据目录。

## 接入方式

- React 新增应用名称展示时统一读取 `appConfig.displayName`，禁止再次硬编码 `dn-wails`。
- Go 启动窗口名称读取 `appconfig.Config.DisplayName`。
- 新增公开全局字段时，变量名必须使用 `APP_` 前缀，并同步更新 Go 类型与校验、前端环境类型、只读配置和本文档。

## 验证

```bash
go test ./internal/appconfig
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```

修改配置后，Vite 会重新加载环境变量；React 同步更新自定义标题栏和原生窗口运行时标题。Go 原生窗口的初始标题在下次启动时读取新值。
