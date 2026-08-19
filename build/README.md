# Wails v3 Build Directory

本目录保存 Wails v3 的开发配置、平台元数据、图标与 Taskfile 子任务。

- `config.yml`：应用元数据和 `wails3 dev` 进程编排。
- `Taskfile.yml`：前端依赖、bindings、图标和通用构建任务。
- `darwin/Taskfile.yml`：macOS 原生、universal、`.app` 和 DMG 任务。
- macOS `.app` 名称读取根目录 `.env` 的 `APP_DISPLAY_NAME`，内部可执行文件仍使用稳定的 `APP_NAME`。
- `windows/Taskfile.yml`：Windows 可执行文件和 NSIS 安装器任务。
- `linux/Taskfile.yml`：Linux 构建与打包任务。
- `appicon.svg`：Cull Pear 的黑白 CP 字标应用壳图标矢量源文件；应用内使用相同字标并由 React 组件根据主题实时着色。
- `appicon.png`：由 `appicon.svg` 渲染的 1024 × 1024 PNG，用于生成 macOS `icons.icns`、Windows `icon.ico` 和托盘图标。

平台元数据由以下命令根据 `config.yml` 更新：

```bash
wails3 task common:update:build-assets
```

图标由以下命令生成：

```bash
wails3 task common:generate:icons
```

构建产物输出到仓库根目录的 `bin/`，不得在产物中手工修改业务代码。
