package fontpatch

import "embed"

// Each universal binary slice carries only its own native runtime.
//
//go:embed runtime/darwin-arm64.*
var bundles embed.FS
