package singleinstance

import "github.com/wailsapp/wails/v3/pkg/application"

const applicationUniqueID = "96a8725c-728d-4a38-bf12-d9c4ccdf9526"

func Configure(appOptions *application.Options, onSecondInstanceLaunch func(data application.SecondInstanceData)) {
	if !enabled() {
		return
	}

	appOptions.SingleInstance = &application.SingleInstanceOptions{
		UniqueID:               applicationUniqueID,
		OnSecondInstanceLaunch: onSecondInstanceLaunch,
	}
}
