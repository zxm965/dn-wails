package singleinstance

import "github.com/wailsapp/wails/v2/pkg/options"

const applicationUniqueID = "96a8725c-728d-4a38-bf12-d9c4ccdf9526"

func Configure(appOptions *options.App, onSecondInstanceLaunch func(data options.SecondInstanceData)) {
	if !enabled() {
		return
	}

	appOptions.SingleInstanceLock = &options.SingleInstanceLock{
		UniqueId:               applicationUniqueID,
		OnSecondInstanceLaunch: onSecondInstanceLaunch,
	}
}
