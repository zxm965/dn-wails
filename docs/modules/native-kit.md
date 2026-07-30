# Native Kit 模块

## 模块目标

统一封装桌面应用常用的文件对话框、目录选择、保存路径、剪贴板、系统浏览器、屏幕信息、原生对话框和文件拖放。

## 目录与职责

- `internal/nativekit/service.go`：平台无关类型、URL/path 校验和服务接口。
- `internal/platform/nativekit/wails.go`：Wails runtime 适配。
- `internal/application/native.go`：前端绑定门面。
- `frontend/src/shared/native-kit/`：类型化前端 API 和拖放订阅。
- `frontend/src/features/test-tools/`：集中提供 Native Kit 人工验证入口。

## 能力清单

| API | 能力 |
| --- | --- |
| `openExternalURL` | 使用默认浏览器打开 HTTP/HTTPS 地址。 |
| `readClipboard` / `writeClipboard` | 读取或写入文本剪贴板。 |
| `pickFiles` | 选择单个或多个文件。 |
| `pickDirectory` | 选择目录。 |
| `chooseSavePath` | 选择保存路径。 |
| `showNativeDialog` | 显示操作系统消息对话框。 |
| `getScreens` | 获取逻辑与物理屏幕尺寸。 |
| `subscribeFileDrop` | 监听 Wails 文件拖放。 |

## 数据契约

文件过滤器使用：

```ts
interface FileFilter {
  displayName: string
  pattern: string
}
```

屏幕信息包含当前屏幕、主屏幕、逻辑尺寸和物理尺寸。

## 安全与边界

- 对外 URL 只允许 `http` 和 `https`，拒绝 `javascript:`、任意 `file:` 和无效地址。
- 打开本地路径只供内部诊断能力使用，要求绝对路径且目标存在。
- 文件选择取消时返回空字符串或空数组，不应当作异常。
- 文件拖放数据仍应由业务模块校验扩展名、大小和用途。
- Wails 生成绑定只在本模块 API 内使用，业务组件不得直接引用。

## 验证

```bash
go test ./internal/nativekit ./internal/platform/nativekit
cd frontend && pnpm build
```

文件对话框、剪贴板和拖放需要人工桌面验证。
