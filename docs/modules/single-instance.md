# 单实例模块

## 模块目标

阻止应用重复运行；第二次启动时唤醒已有窗口，并把启动参数安全地传给前端。

## 目录与职责

- `internal/platform/singleinstance/configure.go`：按构建模式配置 Wails v3 `SingleInstanceOptions` 和固定 UUID。
- `internal/platform/singleinstance/enabled_dev.go`：开发构建禁用单实例锁，允许 Wails 重建后端进程。
- `internal/platform/singleinstance/enabled_default.go`：非开发构建启用单实例锁。
- `internal/singleinstance/service.go`：清洗第二实例传入的参数和工作目录。
- `internal/application/app.go`：缓存或发送第二实例事件，并激活主窗口。
- `frontend/src/shared/app-lifecycle/`：监听 `app:second-instance`。

## 核心链路

```text
用户再次启动应用
  → 非开发构建配置 application.Options.SingleInstance
  → Wails v3 OnSecondInstanceLaunch
  → singleinstance.Service.Normalize
  → windowService.Activate
  → App.Event.Emit("app:second-instance")
  → useAppLifecycle
```

## 数据契约

```ts
interface SecondInstanceLaunch {
  arguments: string[]
  workingDirectory: string
}
```

## 安全与边界

- 第二实例数据视为不可信输入。
- 最多保留 32 个非空参数，每个参数最长 4096 字节。
- 工作目录经过 `filepath.Clean` 规范化。
- Window runtime 未就绪时不会直接发送前端事件，而是进入待处理队列。
- 本模块只转发参数，不直接把参数当作文件路径、URL 或命令执行。
- `wails3 task dev` 通过 `build/config.yml` 传入 `dev` 构建标签；该模式不启用单实例锁，避免后端重建进程被旧进程识别为第二实例。
- 生产及普通非 `dev` 构建继续启用单实例锁，不影响正式应用的单实例行为。
- 前端 HMR 由 Vite 与 Wails 开发服务器负责，和单实例锁相互独立；开发端口与 WebSocket 策略见 `desktop-shell.md`。

## 接入方式

业务模块通过 `useAppLifecycle` 的回调解析允许的参数。新增参数协议时必须增加白名单校验。

## 验证

```bash
go test ./internal/singleinstance ./internal/platform/singleinstance
go test -tags dev ./internal/platform/singleinstance
```

实际重复启动行为需要用户允许运行桌面应用后人工验证。
Go 后端热重载由 Wails v3 dev 进程编排负责。
