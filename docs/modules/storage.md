# 本地存储模块

## 模块目标

为业务模块提供简单、可靠的本地文件存储，不让业务模型直接依赖文件系统路径和读写细节。

## 目录与职责

- `internal/storage/store.go`：定义字节级 `Store` 接口和公共错误。
- `internal/storage/file_store.go`：用户配置目录下的文件实现。
- `internal/storage/file_store_test.go`：文件权限、保存、读取、删除和非法 key 测试。

## 接口

```go
type Store interface {
    Load(key string) ([]byte, error)
    Save(key string, data []byte) error
    Delete(key string) error
    Location(key string) (string, error)
}
```

业务模块负责序列化自己的类型，存储层只处理不透明字节。

## 文件规则

- 默认目录：系统用户配置目录下的 `cull-pear/`。
- 每个 key 对应一个 `<key>.json` 文件。
- key 仅允许字母、数字、下划线和短横线，防止路径穿越。
- 目录权限为 `0700`，文件权限为 `0600`。
- 保存时先写入临时文件并同步到磁盘，再替换正式文件。
- 不存在的 key 返回 `storage.ErrNotFound`。

当前业务 key 包括设置使用的 `settings.json` 和安装身份使用的 `installation.json`。安装身份与用户偏好独立保存，清理其中一个不会隐式重置另一个。

## 接入方式

新业务模块通过构造函数接收 `storage.Store`，使用独立 key，禁止直接拼接存储目录。

## 边界

- 当前实现适合设置和小型状态数据，不适合数据库、大文件或高频日志。
- 数据版本迁移由拥有该数据结构的业务模块负责。

## 验证

```bash
go test ./internal/storage
```
