//go:build !(darwin && (arm64 || amd64)) && !(windows && amd64)

package fontpatch

import "embed"

//go:embed runtime/README.txt
var bundles embed.FS
