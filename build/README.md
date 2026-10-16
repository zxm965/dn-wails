# Wails v3 Build Directory

本目录仅维护 macOS、Windows 桌面端的开发配置、平台元数据、图标与 Taskfile 子任务。前端统一使用 pnpm 和冻结锁文件安装。

- `config.yml`：应用元数据和 `wails3 dev` 进程编排。
- `Taskfile.yml`：前端依赖、bindings、图标和通用构建任务。
- `darwin/Taskfile.yml`：macOS 原生、universal、`.app` 和 DMG 任务。
- macOS `.app` 名称读取根目录 `.env` 的 `APP_DISPLAY_NAME`，内部可执行文件仍使用稳定的 `APP_NAME`。
- `windows/Taskfile.yml`：Windows 可执行文件和 NSIS 安装器任务；Windows CI 通过 `windows/nsis/compile.ps1` 编译并校验 NSIS 安装器。
- `appicon.svg`：Cull Pear 的黑白 CP 字标应用壳图标矢量源文件；应用内使用相同字标并由 React 组件根据主题实时着色。
- `appicon.png`：由 `appicon.svg` 渲染的 1024 × 1024 PNG，用于生成 macOS `icons.icns`、Windows `icon.ico` 和托盘图标。

macOS 构建需要 macOS 主机；Windows 使用 `CGO_ENABLED=0`，保留 Go 交叉编译。发布质量检查在 macOS 运行，打包在对应原生 runner 运行；发布产物为 macOS universal 与 Windows amd64，移除 Linux、iOS、服务端及 Docker 模板任务。

平台元数据由以下命令根据 `config.yml` 更新：

```bash
wails3 task common:update:build-assets
```

`scripts/update-desktop-build-assets.mjs` 在临时目录调用 Wails 生成器，仅回写双端 plist、Windows 版本信息、manifest 和 NSIS 元数据；保留现有 plist 自定义项，不在仓库生成其他平台资源或覆盖 Taskfile。生成失败会中止任务并清理临时目录。

图标由以下命令生成：

```bash
wails3 task common:generate:icons
```

构建产物输出到仓库根目录的 `bin/`，不得在产物中手工修改业务代码。
