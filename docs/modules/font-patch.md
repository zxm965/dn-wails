# 工坊：字体补丁

## 目标与入口

“龙之谷 → 工坊”（`/dn/patches`）提供 **上传 TTF / 静态 CFF OTF → 预览和调整 → 确认生成 → 下载 ZIP** 的本地流程，无需登录。菜单沿用龙之谷分组的显示设置；用户已隐藏该分组时，可在设置中开启。

用户只需 dn-wails 应用和字体文件，不需要安装 Python、fontTools、FreeType、参考 PAK 或其他工具，也不依赖网络转换服务。转换引擎、轮廓处理库和解释器由发布流水线打包后嵌入 Go 可执行文件，首次处理时释放到会话私有临时目录，后续预览、调整和确认复用；重置或退出应用时清理。

## 目录与依赖

- `frontend/src/features/font-patch/`：工坊页面、名称回退、文件选择/拖入、状态恢复、下载和重置。
- `frontend/src/shared/navigation/`：龙之谷菜单与路由；页头使用公共两行 `PageHeader`，描述区展示单补丁安装及游戏内字号、排版需实测的提示，页面底部不重复展示；上传区按图标、说明、操作和状态提示固定分栏，窄窗口自动换行；取消按钮保留占位，卡片底部左侧显示处理提示、右侧显示取消或错误反馈；反馈区域始终预留两行高度，避免空闲、预览和生成状态切换时重新分配宽度。外层宽度、页面边距和间距使用现有布局令牌。
- `internal/application/fontpatch.go`：Wails 门面与稳定 DTO 接口。
- `internal/fontpatch/`：输入规则、任务互斥、五分钟超时、取消、最近结果、重置和关闭。
- `internal/platform/fontpatch/`：内置引擎解压、独立进程、输入快照、临时文件和 ZIP 导出；Windows 子进程隐藏控制台。
- `tools/font-patch/`：经过清单校验的字体构建源码快照、构建依赖和测试。只包含字体封包所需代码，不含游戏素材、原始 PAK、密钥或用户字体。
- `scripts/build-font-patch.py`：将 Python、fontTools 和源码冻结为独立运行时并生成嵌入 ZIP。
- `scripts/sync-font-patch.py`：维护者从 `dn-ui-patch` 更新共享封包/转换模块的工具；桌面专属的 `desktop.py` 和 `font_adjustment.py` 在 dn-wails 内维护，改动后更新 `source-manifest.json`，同步共享模块不会覆盖这两份文件；日常构建和运行均不需要外部项目。

调用方向：React 页面 → 功能 API → Wails 生成绑定 → 应用门面 → fontpatch 服务 → 平台适配 → 内置转换引擎。原生文件选择/保存沿用 Native Kit。

## 核心链路与数据契约

1. 选择/拖入字体后复制原文件为会话快照，验证并生成临时 TrueType 预览文件。此阶段不会写入 PAK/ZIP。
2. 支持字形大小 80%–125%、笔画减细 2 档到加粗 6 档（每档 0.005 em）。每次调整读取同一份会话原始快照，不重复复制或解压引擎、不累积变形；调整失败保留上一次有效预览。字体比例与轮廓实际修改，不依赖 CSS 合成粗体。
3. FreeType 从应用内置库执行轮廓扩张/收缩；fontTools 同步缩放字形、字宽、定位表。保留字符映射、字体名称、标称 UPM 和行度量，更新边距，移除调整后不再适用的 hinting/device 表；默认 100% / 原始粗细保持 TTF 字节不变。
4. 前端以当前预览 ID 读取经过 SHA256 校验的字体，交给 `FontFace` 显示；卸载/换字体时释放。预览文字可编辑，基准字号 12–48px 只改变查看尺寸，不写入补丁；字体效果区随文字行数、换行与字号自然撑高，不固定高度或显示内部滚动条。调整请求去抖并串行执行，参数未同步或字体未显示时禁用确认。
5. 用户点击“确认生成补丁”后才按当前预览 ID 打包，拒绝过期 ID；重新计算的字体必须与已确认预览 SHA256 完全一致。OTF 先转换为 TrueType，调整数据和原始输入摘要写入报告。
6. 仅封包 `resource/fonts/mysh.ttf`，使用已验证的 v11/zlib 布局，按既有样本填充至 500 MiB，再回读校验并生成 ZIP；500 MiB 是兼容策略，不是已证明的游戏强制要求。
7. 下载入口只对当前预览已确认的补丁显示，后续调整不会自动生成新补丁；重置清除预览和补丁临时数据，不删除已下载文件。

Wails 方法：

- `GetFontPatchStatus()` → `{ available, busy, phase, draft, result, error }`，用于路由恢复；`phase` 为 `preview` / `build` / 空。
- `PrepareFontPatch(source, options)` → `Draft`，创建原始快照和预览，默认 `{ scalePercent: 100, weight: 0 }`。
- `AdjustFontPatch(id, options)` → 新 `Draft`，旧预览 ID 失效。
- `GetFontPatchPreview(id)` → `{ data, supportedCodepoints }`，返回当前会话预览/结果的 Base64 字体数据和实际支持的 Unicode 码点，不接受任意文件路径。
- `BuildFontPatch(draftID)` → `Result`，确认并生成该预览的补丁；返回 `draftId`、`options`、`adjusted` 及原有结果字段。
- `SaveFontPatch(id, destination)`：仅导出本会话最近一次成功补丁，使用排他创建。
- `CancelFontPatch()`：请求取消当前预览或打包操作；前端保持“正在取消”直到原任务返回，防止提前解除互斥。取消调整时丢弃排队参数，恢复上一次有效预览；取消生成时保留预览供重新确认。
- `ResetFontPatch()`：空闲时清空预览、补丁、错误和临时目录；处理中拒绝重置，先取消处理。

人工调整不是字体设计师提供的字重母版，也不是修改游戏 UI 的 px 字号；原始标称行度量保持不变，过大的轮廓可能在固定控件内裁切，游戏内显示需实测。未覆盖字符可能由 WebView 的系统字体回退显示，页面保留缺字提示。

前端对无法可靠显示的元数据名称回退为原文件名；文件名也不可读时使用 `font-<摘要前八位>`。只改变显示，不重写字体名称表。

## 边界与清理

- 支持静态 TTF、静态 CFF OTF；拒绝 TTC/WOFF、可变字体、CFF2、VORG 和不支持的彩色字体。
- 多个字体补丁覆盖同一路径，只能选择一个安装；与营销资源分开生成。
- 上传区提示使用覆盖 GBK 字符集的字体。预览与结果的 `gbkCoverage` 包含 total、covered、missing、missingSample；根据转换后字体的 Unicode cmap 计算可打印 ASCII 和 Python GBK 编解码表已分配双字节字符的覆盖数，排除 gid 0（缺字占位符）、无效字形编号和代理码点。该检测检查字符映射，不把 TTF/OTF 文件当成 GBK 文本，也不保证游戏加载或轮廓可见性。
- 预览自定义文字按 `supportedCodepoints` 提示实际缺字，去重并忽略空白，避免系统字体回退掩盖缺字。完整码点列表通过受限的 coverage.json 文件读取，避免超过子进程 64 KiB 输出限制；摘要保留最多 24 字的缺字样本供内部使用，页面不展示 GBK 缺字示例，仅显示覆盖率和缺字数量；覆盖率向下保留两位小数，避免未完整覆盖显示为 100%。
- 缺字检查只覆盖固定中英文样本文字，不代表全量游戏文本。字体替换不等于修改 UI 字号，游戏内加载和排版仍需实测。
- 调整使用独立的 preview-* 输出子目录，成功后替换旧预览并清理旧输出；失败/取消仅删除新输出，保留原始快照和上次有效预览。更换字体成功后清理旧输入会话；确认生成的结果独立保存。引擎只缓存成功解压的目录，失败/取消解压不缓存；重置与关闭清理输入、结果和引擎缓存。
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

发布流水线分别在原生 Windows amd64、macOS arm64 和 macOS amd64 机器上冻结引擎并执行端到端测试；macOS universal 应用内含两种架构，Windows 单文件 EXE 和安装版均直接内嵌引擎。运行时包括 Python、fontTools、PyInstaller、freetype-py，以及轮廓库 FreeType / HarfBuzz 的许可文本。freetype-py 固定版本并要求自带原生库的 wheel；打包和运行均检查库路径，禁止依赖系统 FreeType。

为控制安装包体积，Go 使用按系统和架构选择的嵌入文件，每个 macOS universal 切片只携带自己的运行时。目录中的 `<系统>-<架构>.txt` 是开发占位文件，不代表引擎可用，生产检查仍要求对应 ZIP。PyInstaller 仅补充动态加载的 `fontTools.ttLib.tables` 表处理器，其余模块按实际导入收集；不再全量收集 fontTools 源码、C 源文件和工具数据；FreeType 仅收集原生二进制及实际导入模块。排除本地转换不使用的 TLS 模块和 OpenSSL 哈希后端，SHA256 继续由 CPython 内置实现提供，不改变摘要算法或校验。

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
node --test tests/fontName.test.mjs tests/fontCoverage.test.mjs
```

原生引擎集成测试清空 PATH/PYTHONPATH/PYTHONHOME，使用仓库合成 TTF/OTF，通过 Go 调用内置程序，校验封包资源、字体摘要、TTF 原字节、OTF 转换、ZIP CRC 和导出，并确认源文件不变。它不启动桌面应用，不连接游戏，也不能替代各系统原生对话框、拖放和游戏验证。

取消回归测试在原生引擎已开始写入 PAK 后取消，要求任务在 5 秒内返回、清理本次临时产物、保留预览并能重新生成；离线前端交互验证取消会撤销排队调整、恢复预览与确认按钮，失败状态不再显示无限加载。

预览集成测试还验证：确认前无 PAK、原始上传文件移除后仍可调整、过期预览不能确认、预览/补丁摘要一致、恢复原始不累积变形，复用同一引擎和输入文件、取消调整保留旧预览、GBK 统计和码点跨预览/结果一致，以及重置后预览、结果与引擎目录均清理；这些测试仍不启动桌面应用。

前端离线交互验证使用真实组件和字体数据、模拟后端延迟：上传和调整不触发生成，确认后才出现下载入口；1200 / 800 / 320px 内容宽度下上传区处理状态位移为 0，无横向溢出，极窄布局上传与重置同样保持占位。实际 Wails 原生窗口与游戏内效果仍需实测。

桌面专用 `font_coverage.py` 与 `desktop.py`、`font_adjustment.py` 一起由本仓库维护并记录在源码摘要清单；同步共享字体源码时保留这些模块。
