package appupdate

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

type updateResult struct {
	Status  string `json:"status"`
	Version string `json:"version"`
	Message string `json:"message"`
	LogPath string `json:"logPath"`
}

func (i *Installer) resultPath() (string, error) {
	directory, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("resolve update result directory: %w", err)
	}
	return filepath.Join(directory, i.appName, "update-result.json"), nil
}

func (i *Installer) LastUpdateError() string {
	path, err := i.resultPath()
	if err != nil {
		return err.Error()
	}
	return readUpdateError(path)
}

func readUpdateError(path string) string {
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return ""
	}
	if err != nil {
		return fmt.Sprintf("读取上次更新结果失败：%v", err)
	}
	var result updateResult
	if len(data) > 64*1024 || json.Unmarshal(data, &result) != nil {
		return "上次更新结果文件无效：" + path
	}
	if result.Status == "succeeded" {
		return ""
	}
	message := result.Message
	if result.Status != "failed" || message == "" {
		message = "更新中断，未确认安装完成。请重试或手动安装。"
	}
	return fmt.Sprintf("上次更新 %s 未完成：%s 日志：%s", result.Version, message, result.LogPath)
}
