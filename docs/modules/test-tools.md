# 测试工具模块

## 模块目标

集中承载应用概览、运行诊断和通用桌面模块的人工验证入口，避免开发与验收信息混入正式业务页面。

## 目录与职责

- `frontend/src/features/test-tools/components/TestToolsPanel.tsx`：测试分类、操作执行和结果展示。
- `frontend/src/features/test-tools/components/TestToolsPanel.css.ts`：分类菜单、操作网格和拖放区域的局部样式。
- `frontend/src/features/test-tools/components/DesktopOverview.tsx`、`DesktopOverview.css.ts`：嵌入式应用概览、版本更新、平台与设置摘要。
- `frontend/src/features/test-tools/components/DeveloperTextToolbox.tsx`、`DeveloperTextToolbox.css.ts`：左侧工具菜单与右侧本地文本处理工作区。
- `frontend/src/features/test-tools/lib/textTools.ts`：JSON、Base64、URL、MD5 与 SHA 的纯前端转换逻辑。
- `frontend/src/features/app-update/`：为应用概览提供正式版本、自动检查和手动检查能力。
- `frontend/src/features/system-notification/components/SystemNotificationPanel.tsx`：以 embedded 模式嵌入通知测试。
- `frontend/src/app/App.tsx`：将测试工具放入“系统设置”分组。

## 测试分类

### 应用概览

- 应用版本、运行平台、主题与通知设置摘要
- GitHub Release 自动检查状态、最新版本与手动检查入口
- 生命周期就绪状态

### 桌面能力

#### 交互窗口

- Toast
- 确认对话框
- Overlay 子视图
- 窗口居中
- 窗口状态读取
- 第二实例唤醒提示

#### 原生能力

- 剪贴板读取与写入
- 文件和目录选择
- 保存路径与文件类型过滤
- 屏幕信息
- 原生消息对话框
- 日志目录
- 外部浏览器
- 文件拖放

#### 系统通知

- 通知能力和权限状态
- 应用通知策略
- 消息发送和预览
- 点击通知唤醒与会话回传

### 文本工具

- JSON 格式化、美化与压缩
- UTF-8 文本 Base64 编码与解码
- URL 组件编码与解码
- MD5、SHA-1、SHA-256、SHA-384 与 SHA-512 哈希计算
- 结果复制、结果转输入和按工具保留编辑状态
- 所有计算仅在当前 WebView 内执行，不上传输入内容

## 行为约定

- 测试操作的结果统一显示在测试工具页，不影响正式业务状态。
- 打开测试工具时默认展示应用概览；除正式的“检查最新版”外，概览不提供测试操作入口。
- 需要用户主动触发的系统操作不得在页面加载时自动执行。
- 文件、剪贴板、窗口和通知等真实原生能力需要在 Wails 桌面运行环境中验证。
- 交互窗口、原生集成和系统通知统一放入“桌面能力”分类，不单独占用多个顶部分类入口。
- 新增通用模块的人工验证入口时，优先放入本模块现有分类；确有必要时再增加分类。
- 测试工具不是生产业务 API，业务组件仍应直接使用对应模块的正式封装。
- MD5 与 SHA-1 只作为兼容性校验工具，不用于密码存储或安全签名。

## 响应式处理

- 分类导航使用“应用概览 / 桌面能力 / 文本工具”三段布局，并在页面滚动时吸顶，不随响应式断点切换到左侧。
- 页面顶部复用共享 `PageHeader`，与偏好设置和 DN 业务页保持相同的紧凑渐变页头。
- 极窄宽度下隐藏分类描述但保留序号、分类名称和完整可访问名称。
- “桌面能力”中的交互窗口与原生能力卡片由双列降为单列，操作按钮由双列降为单列。
- 分类按钮固定使用 `md`，测试动作跟随用户配置的默认按钮尺寸；布局变化不会自行覆盖按钮高度。
- 结果文本、文件路径和原生能力输出允许换行或在局部区域滚动，不产生整页横向滚动。
- embedded 通知面板按自身内容宽度切换为单列，不依赖整个窗口宽度。
- embedded 应用概览移除页面级外边距和内边距，在测试工具内容区内继续使用自身 Container Query。
- 文本工具在宽内容区使用左侧菜单和双编辑器布局；窄宽度下菜单移到顶部，输入与结果改为单列。

## 验证

```bash
cd frontend
pnpm fmt:check
pnpm lint
pnpm build
```

实际原生交互验证需要用户明确允许运行桌面应用。
