# dn-wails

基于 Wails v2、React 和 TypeScript 的桌面应用。项目采用轻量分层结构：Go 侧以应用门面连接业务能力，React 侧以功能模块组织页面逻辑。

## 目录结构

```text
.
├── main.go                         # 组合根：装配依赖并启动 Wails
├── internal/
│   ├── application/                # 暴露给前端的 Wails 应用门面
│   ├── greeting/                   # 按业务能力组织的功能包
│   └── platform/window/            # 跨平台窗口配置
├── frontend/
│   ├── src/
│   │   ├── app/                    # 应用壳、全局样式和顶层装配
│   │   ├── features/               # 前端业务功能模块
│   │   ├── shared/                 # 通用组件与基础工具
│   │   └── assets/                 # 静态资源
│   └── wailsjs/                    # Wails 自动生成绑定，禁止手动修改
├── build/                          # 平台打包资源
├── docs/                           # 架构与开发文档
└── wails.json                      # Wails 项目配置
```

详细边界与扩展规则见 [docs/architecture.md](docs/architecture.md)。

## 常用命令

```bash
# 重新生成 Go -> TypeScript 绑定
wails generate module

# 前端质量检查
cd frontend
pnpm fmt:check
pnpm lint
pnpm build

# Go 测试
cd ..
go test ./...

# 本地开发（会启动开发服务）
wails dev

# 生产构建
wails build
```
