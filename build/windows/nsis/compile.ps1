[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectRoot,

  [Parameter(Mandatory = $true)]
  [string]$AppName,

  [Parameter(Mandatory = $true)]
  [ValidateSet('amd64', 'arm64')]
  [string]$Arch,

  [ValidateSet('user', 'machine')]
  [string]$InstallScope = 'machine'
)

$ErrorActionPreference = 'Stop'

$projectRootPath = (Resolve-Path -LiteralPath $ProjectRoot).Path
$nsisDirectory = Join-Path $projectRootPath 'build\windows\nsis'
$projectFile = Join-Path $nsisDirectory 'project.nsi'
$binaryPath = Join-Path $projectRootPath (Join-Path 'bin' "$AppName.exe")
$installerPath = Join-Path $projectRootPath (Join-Path 'bin' "$AppName-$Arch-installer.exe")

if (-not (Test-Path -LiteralPath $projectFile -PathType Leaf)) {
  throw "NSIS project file was not found: $projectFile"
}
if (-not (Test-Path -LiteralPath $binaryPath -PathType Leaf)) {
  throw "Windows application binary was not found: $binaryPath"
}

$makensis = Get-Command makensis.exe -ErrorAction Stop
$arguments = @()
if ($InstallScope -eq 'user') {
  $arguments += '-DWAILS_INSTALL_SCOPE=user'
  $arguments += '-DREQUEST_EXECUTION_LEVEL=user'
}
$arguments += "-DARG_WAILS_$($Arch.ToUpperInvariant())_BINARY=$binaryPath"
$arguments += 'project.nsi'

Push-Location $nsisDirectory
try {
  & $makensis.Source @arguments
  $exitCode = [int]$LASTEXITCODE
}
finally {
  Pop-Location
}

if ($exitCode -ne 0) {
  throw "NSIS compilation failed with exit code $exitCode"
}

$installer = Get-Item -LiteralPath $installerPath -ErrorAction Stop
if ($installer.Length -le 0) {
  throw "NSIS compilation produced an empty installer: $installerPath"
}

Write-Host "Created NSIS installer: $installerPath ($($installer.Length) bytes)"
