package fontpatch

import "embed"

//go:embed runtime/darwin-amd64.*
var bundles embed.FS
