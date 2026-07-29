#!/bin/sh

set -eu

: "${RELEASE_TAG:?RELEASE_TAG is required}"
: "${CI_COMMIT_SHA:?CI_COMMIT_SHA is required}"
: "${CI_COMMIT_SHORT_SHA:?CI_COMMIT_SHORT_SHA is required}"
: "${CI_PIPELINE_URL:?CI_PIPELINE_URL is required}"
: "${CI_PROJECT_PATH:?CI_PROJECT_PATH is required}"
: "${CI_PROJECT_URL:?CI_PROJECT_URL is required}"

windows_asset="dist/dn-wails-windows-amd64-installer.exe"
macos_asset="dist/dn-wails-macos-universal.dmg"

test -s "${windows_asset}"
test -s "${macos_asset}"

sha256sum "${windows_asset}" "${macos_asset}" > dist/SHA256SUMS

cat > release-notes.md <<EOF
Automated build from the main branch.

- Version: ${RELEASE_TAG}
- Commit: [${CI_COMMIT_SHORT_SHA}](${CI_PROJECT_URL}/-/commit/${CI_COMMIT_SHA})
- Pipeline: [${CI_PIPELINE_ID}](${CI_PIPELINE_URL})
- Windows: x86-64 NSIS installer
- macOS: Universal application DMG (Apple Silicon and Intel)

The binaries are not code-signed with a commercial Windows certificate or notarized with an Apple Developer ID.
EOF

glab release create "${RELEASE_TAG}" \
  "${windows_asset}#Windows x64 installer#package" \
  "${macos_asset}#macOS universal DMG#package" \
  "dist/SHA256SUMS#SHA256 checksums#other" \
  --repo "${CI_PROJECT_PATH}" \
  --ref "${CI_COMMIT_SHA}" \
  --name "dn-wails ${RELEASE_TAG}" \
  --notes-file release-notes.md \
  --package-name dn-wails \
  --use-package-registry \
  --no-update
