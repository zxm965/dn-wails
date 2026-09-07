package appupdate

import _ "embed"

// The same script is exercised by the PowerShell integration tests. Keep it
// compatible with Windows PowerShell 5.1, which ships with supported Windows.
//
//go:embed windows_update.ps1
var windowsUpdateScript string
