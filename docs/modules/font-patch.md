# 工坊：字体补丁

## 目标与入口

“龙之谷 → 工坊”（`/dn/patches`）提供 **上传 TTF / 静态 CFF OTF → 自动生成 → 下载 ZIP** 的本地流程，无需登录。菜单沿用龙之谷分组的显示设置；用户已隐藏该分组时，可在设置中开启。

用户只需 dn-wails 应用和字体文件，不需要安装 Python、fontTools、参考 PAK 或其他工具，也不依赖网络转换服务。转换引擎和解释器由发布流水线打包后嵌入 Go 可执行文件，首次生成时释放到本次任务的临时目录中执行。

## 目录与依赖

- `frontend/src/features/font-patch/`：工坊页面、名称回退、文件选择/拖入、状态恢复、下载和重置。
- `frontend/src/shared/navigation/`：龙之谷菜单与路由；页头使用公共两行 `PageHeader`；上传区保持居中上下结构、缩小图标与留白，外层宽度、页面边距和间距使用现有布局令牌。
- `internal/application/fontpatch.go`：Wails 门面与稳定 DTO 接口。
- `internal/fontpatch/`：输入规则、任务互斥、五分钟超时、取消、最近结果、重置和关闭。
- `internal/platform/fontpatch/`：内置引擎解压、独立进程、输入快照、临时文件和 ZIP 导出；Windows 子进程隐藏控制台。
- `tools/font-patch/`：经过清单校验的字体构建源码快照、构建依赖和测试。只包含字体封包所需代码，不含游戏素材、原始 PAK、密钥或用户字体。
- `scripts/build-font-patch.py`：将 Python、fontTools 和源码冻结为独立运行时并生成嵌入 ZIP。
- `scripts/sync-font-patch.py`：维护者从 `dn-ui-patch` 更新源码快照的工具；日常开发、构建和运行均不需要该外部项目。

调用方向：React 页面 → 功能 API → Wails 生成绑定 → 应用门面 → fontpatch 服务 → 平台适配 → 内置转换引擎。原生文件选择/保存沿用 Native Kit。

## 核心链路与数据契约

1. 文件选择或上传区域拖入单个字体；Go 和引擎分别检查扩展名、普通文件、64 MiB 上限和真实字体结构。
2. 复制上传文件为任务快照，保留原文件；TTF 按原字节封包，静态 CFF OTF 由 fontTools 转成含 `glyf/loca` 的 TrueType。
3. 使用已验证的 v11/zlib 布局，仅写入 `resource/fonts/mysh.ttf`，不需要参考 PAK 或解密密钥。
4. 输出 `0dnResource-Font-<文件名>.pak`，按既有样本填充到 500 MiB，回读并校验字体字节，再生成 ZIP 和报告。500 MiB 是样本兼容策略，不是已证明的游戏强制要求。
5. 前端显示名称、字形数、转换状态、缺字样本和压缩体积；点击“下载补丁”选择 ZIP 保存路径。重置清除临时产物和页面结果，不删除已保存文件。

Wails 方法：

- `GetFontPatchStatus()` → `{ available, busy, result, error }`，恢复页面离开后的任务和结果；只有生成中的恢复任务每秒轮询，卸载时清理。
- `BuildFontPatch(source)` → `Result`：不透明 ID、名称、文件名、PAK/ZIP 大小、转换状态、样本缺字、字形数、SHA256、容器/游戏验证标志。
- `SaveFontPatch(id, destination)`：仅导出本会话最近一次有效结果的 ZIP。
- `CancelFontPatch()`：取消当前引擎进程。
- `ResetFontPatch()`：空闲时清空结果、错误和临时目录；生成中拒绝重置，先使用“取消生成”。

前端对无法可靠显示的元数据名称回退为原文件名；文件名也不可读时使用 `font-<摘要前八位>`。只改变显示，不重写字体名称表。

## 边界与清理

- 支持静态 TTF、静态 CFF OTF；拒绝 TTC/WOFF、可变字体、CFF2、VORG 和不支持的彩色字体。
- 多个字体补丁覆盖同一路径，只能选择一个安装；与营销资源分开生成。
- 缺字检查只覆盖固定中英文样本文字，不代表全量游戏文本。字体替换不等于修改 UI 字号，游戏内加载和排版仍需实测。
- 取消、超时或构建失败会删除本次临时目录并保留上一成功结果；重置、新构建成功和应用关闭清理已持有的临时产物。
- 下载使用排他创建；已有同名文件返回错误，不覆盖源文件或历史下载。导出失败或取消会清理部分写出的文件。
- 运行时 ZIP 只接受相对普通文件路径，拒绝目录穿越和符号链接，限制总展开体积；进程输出限制为 64 KiB。重复文件清单只能引用 ZIP 内已有普通文件，不允许别名链或覆盖已有文件；恢复别名时优先使用硬链接，不支持硬链接的文件系统回退到排他复制。
- 未含当前 CPU/系统运行时的开发构建显示组件不可用；正式发布必须先生成所有目标运行时。生产构建入口会拒绝缺少目标运行时的安装包，用户无需自行补装组件。

## 开发与发布

仅维护者的构建环境需要 Python 3.11+，推荐与 CI 一致的 3.13：

```sh
python3 -m venv .font-patch-venv
.font-patch-venv/bin/python -m pip install -r tools/font-patch/requirements.txt
.font-patch-venv/bin/python scripts/build-font-patch.py
```

Windows 使用 `.font-patch-venv\Scripts\python.exe`。生成后的 `internal/platform/fontpatch/runtime/<系统>-<架构>.zip` 不入 Git；随后按已有 Wails 构建流程重新编译。不能跨平台冻结 Python 运行时。

发布流水线分别在原生 Windows amd64、macOS arm64 和 macOS amd64 机器上冻结引擎并执行端到端测试；macOS universal 应用内含两种架构，Windows 单文件 EXE 和安装版均直接内嵌引擎。运行时包括 Python、fontTools 和 PyInstaller 的许可文本。

为控制安装包体积，Go 使用按系统和架构选择的嵌入文件，每个 macOS universal 切片只携带自己的运行时。目录中的 `<系统>-<架构>.txt` 是开发占位文件，不代表引擎可用，生产检查仍要求对应 ZIP。PyInstaller 仅补充动态加载的 `fontTools.ttLib.tables` 表处理器，其余模块按实际导入收集；不再全量收集 fontTools 源码、C 源文件和工具数据。排除本地转换不使用的 TLS 模块和 OpenSSL 哈希后端，SHA256 继续由 CPython 内置实现提供，不改变摘要算法或校验。

`scripts/font_runtime_archive.py` 按内容和可执行权限去重，ZIP 每份相同内容只保存一次，并通过版本为 1 的 `runtime-files.json` 记录其他路径。这可消除 PyInstaller 在 macOS Python.framework 内产生的多份动态库副本，同时保留运行时所需的完整路径结构。解包仍兼容没有清单的旧运行时。精简后的引擎继续随应用离线分发，不要求用户安装或下载组件。

所有发布 job 在检出标签前统一设置 Git `core.autocrlf=false`、`core.eol=lf`，防止 Windows 自动换行转换改变源码快照的 SHA256；仍按原始字节严格校验，不重新生成或跳过清单。该步骤属于工作流本身，因此从 main 手动发布已有标签也能修复旧标签的检出行为，无需移动标签。

## 验证

```sh
.font-patch-venv/bin/python -m unittest discover -s tools/font-patch/tests -q
.font-patch-venv/bin/python -m unittest discover -s scripts/tests -p 'test_font_runtime_archive.py' -v
DN_REQUIRE_FONT_RUNTIME=1 go test ./internal/fontpatch ./internal/platform/fontpatch -count=1 -timeout 3m
go test ./...
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
node --test tests/fontName.test.mjs
```

原生引擎集成测试清空 PATH/PYTHONPATH/PYTHONHOME，使用仓库合成 TTF/OTF，通过 Go 调用内置程序，校验封包资源、字体摘要、TTF 原字节、OTF 转换、ZIP CRC 和导出，并确认源文件不变。它不启动桌面应用，不连接游戏，也不能替代各系统原生对话框、拖放和游戏验证。
