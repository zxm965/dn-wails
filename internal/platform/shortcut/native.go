package shortcut

import (
	"fmt"
	"runtime"
	"strings"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type Native struct{ app *application.App }

func New(app *application.App) *Native { return &Native{app: app} }

func (n *Native) Start(key string, gameMode bool, fire func(), failed func(error)) (func() error, error) {
	if err := n.app.Context().Err(); err != nil {
		return nil, err
	}
	if runtime.GOOS != "windows" && runtime.GOOS != "darwin" {
		return nil, fmt.Errorf("当前系统暂不支持进程全局快捷键")
	}
	if gameMode && runtime.GOOS == "windows" {
		return startRawKeyboard(n.app.Context(), key, fire, failed)
	}
	if runtime.GOOS == "windows" && strings.HasSuffix(key, "F12") {
		return nil, fmt.Errorf("Windows 将 F12 保留给调试器，请换用 F4 或 Ctrl+Shift+F4")
	}
	if err := n.app.GlobalShortcut.Register(key, fire); err != nil {
		return nil, fmt.Errorf("全局快捷键注册失败，请更换键位或释放占用：%w", err)
	}
	return func() error {
		if !n.app.GlobalShortcut.IsRegistered(key) {
			return nil
		}
		return n.app.GlobalShortcut.Unregister(key)
	}, nil
}
