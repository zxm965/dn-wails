//go:build !windows

package dnprocess

import core "cull-pear/internal/dnprocess"

func New() core.Service {
	return core.NewUnavailableService()
}
