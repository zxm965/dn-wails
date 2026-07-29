#!/usr/bin/env bash

set -euo pipefail

: "${PNPM_VERSION:?PNPM_VERSION is required}"
: "${WAILS_VERSION:?WAILS_VERSION is required}"
: "${RELEASE_TAG:?RELEASE_TAG is required}"

export npm_config_prefix="${HOME}/.npm-global"
export PATH="${npm_config_prefix}/bin:$(go env GOPATH)/bin:${PATH}"
export HOMEBREW_NO_AUTO_UPDATE=1

npm install --global "pnpm@${PNPM_VERSION}"
go install "github.com/wailsapp/wails/v2/cmd/wails@${WAILS_VERSION}"
node scripts/ci/set-build-version.mjs

go version
node --version
pnpm --version
wails version

go test ./...
pnpm --dir frontend fmt:check
pnpm --dir frontend lint
wails build -clean -m -platform darwin/universal

app_path="build/bin/dn-wails.app"
executable_path="${app_path}/Contents/MacOS/dn-wails"

if [[ ! -x "${executable_path}" ]]; then
  echo "Expected executable was not generated: ${executable_path}" >&2
  exit 1
fi

lipo -info "${executable_path}"

mkdir -p dist
dmg_root="$(mktemp -d)"
trap 'rm -rf "${dmg_root}"' EXIT

ditto "${app_path}" "${dmg_root}/dn-wails.app"
ln -s /Applications "${dmg_root}/Applications"
hdiutil create \
  -volname "dn-wails" \
  -srcfolder "${dmg_root}" \
  -ov \
  -format UDZO \
  "dist/dn-wails-macos-universal.dmg"

test -s dist/dn-wails-macos-universal.dmg
