# Wails v3 Build Directory

本目录保存 Wails v3 的开发配置、平台元数据、图标与 Taskfile 子任务。

- `config.yml`：应用元数据和 `wails3 dev` 进程编排。
- `Taskfile.yml`：前端依赖、bindings、图标和通用构建任务。
- `darwin/Taskfile.yml`：macOS 原生、universal、`.app` 和 DMG 任务。
- `windows/Taskfile.yml`：Windows 可执行文件和 NSIS 安装器任务。
- `linux/Taskfile.yml`：Linux 构建与打包任务。
- `appicon.png`：生成 macOS `icons.icns`、Windows `icon.ico` 和托盘图标的源文件。

平台元数据由以下命令根据 `config.yml` 更新：

```bash
wails3 task common:update:build-assets
```

图标由以下命令生成：

```bash
wails3 task common:generate:icons
```

构建产物输出到仓库根目录的 `bin/`，不得在产物中手工修改业务代码。
