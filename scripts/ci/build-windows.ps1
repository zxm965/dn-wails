$ErrorActionPreference = "Stop"

if (-not $env:PNPM_VERSION) { throw "PNPM_VERSION is required" }
if (-not $env:WAILS_VERSION) { throw "WAILS_VERSION is required" }
if (-not $env:RELEASE_TAG) { throw "RELEASE_TAG is required" }

$npmPrefix = Join-Path $env:USERPROFILE ".npm-global"
$goBin = Join-Path (go env GOPATH) "bin"
$env:Path = "$npmPrefix;$goBin;$env:Path"

npm config set prefix $npmPrefix
npm install --global "pnpm@$env:PNPM_VERSION"
go install "github.com/wailsapp/wails/v2/cmd/wails@$env:WAILS_VERSION"
choco install nsis --yes --no-progress
node scripts/ci/set-build-version.mjs

go version
node --version
pnpm --version
wails version
makensis /VERSION

go test ./...
pnpm --dir frontend fmt:check
pnpm --dir frontend lint
wails build -clean -m -platform windows/amd64 -nsis

$installer = Get-ChildItem -Path "build/bin" -Filter "*-amd64-installer.exe" | Select-Object -First 1
if ($null -eq $installer) {
    throw "The Windows installer was not generated"
}

New-Item -ItemType Directory -Force -Path "dist" | Out-Null
Copy-Item $installer.FullName "dist/dn-wails-windows-amd64-installer.exe"

if (-not (Test-Path "dist/dn-wails-windows-amd64-installer.exe" -PathType Leaf)) {
    throw "The Windows release asset is missing"
}
