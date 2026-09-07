// A disposable application/installer used only by updater integration tests.
// It operates exclusively on the temporary paths supplied by the test.
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

var version = "old"

type configuration struct {
	Target   string
	Payload  string
	Scenario string
	Audit    string
}

func main() {
	data, err := os.ReadFile(os.Getenv("CULL_PEAR_UPDATE_SIMULATION"))
	if err != nil {
		panic(err)
	}
	var config configuration
	if err := json.Unmarshal(data, &config); err != nil {
		panic(err)
	}
	audit := func(message string) {
		file, err := os.OpenFile(config.Audit, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
		if err != nil {
			panic(err)
		}
		fmt.Fprintln(file, message)
		file.Close()
	}
	executable, _ := os.Executable()
	if len(os.Args) > 1 && os.Args[1] == "--child" {
		audit("child:" + strconv.Itoa(os.Getpid()))
		for {
			time.Sleep(time.Second)
		}
	}
	if filepath.Base(executable) == "installer.exe" {
		audit("installer:" + strings.Join(os.Args[1:], " "))
		if strings.Join(os.Args[1:], " ") != "/S /UPDATE /D="+filepath.Dir(config.Target) {
			os.Exit(92)
		}
		switch config.Scenario {
		case "timeout":
			child := exec.Command(executable, "--child")
			if err := child.Start(); err != nil {
				panic(err)
			}
			for {
				time.Sleep(time.Second)
			}
		case "installer-failure":
			os.Exit(17)
		case "unchanged":
			os.Exit(0)
		case "transient-lock":
			if _, err := os.Stat(config.Audit + ".retry"); os.IsNotExist(err) {
				os.WriteFile(config.Audit+".retry", []byte("retry"), 0o600)
				os.Exit(73)
			}
		case "persistent-lock":
			os.Exit(73)
		}
		payload, err := os.ReadFile(config.Payload)
		if err != nil {
			panic(err)
		}
		if config.Scenario == "wrong-hash" {
			payload = append(payload, []byte("corrupted")...)
		}
		if err := os.WriteFile(config.Target, payload, 0o700); err != nil {
			os.Exit(73)
		}
		os.Exit(0)
	}
	audit("app:" + version + ":" + filepath.Base(executable) + ":" + strconv.Itoa(os.Getpid()))
	if version == "new" && config.Scenario == "restart-failure" {
		os.Exit(7)
	}
	for {
		time.Sleep(time.Second)
	}
}
