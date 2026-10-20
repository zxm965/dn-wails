package shortcut

import (
	"fmt"
	"strconv"
	"strings"
)

// keyTracker retains only function/modifier state, never typed text.
// One tracker per device prevents releasing a modifier on another keyboard
// from producing an unintended unmodified shortcut.
type keyTracker struct {
	down [256]bool
}

// RAWKEYBOARD reports generic modifier virtual keys; E0 identifies the right
// Control/Alt keys, while Shift uses its scan code.
func normalizeKey(vkey, makeCode, flags uint16) uint16 {
	switch vkey {
	case 0x10:
		if makeCode == 0x36 {
			return 0xA1
		}
		return 0xA0
	case 0x11:
		if flags&2 != 0 {
			return 0xA3
		}
		return 0xA2
	case 0x12:
		if flags&2 != 0 {
			return 0xA5
		}
		return 0xA4
	default:
		return vkey
	}
}

func parseKey(key string) (uint16, bool, error) {
	combo := strings.HasPrefix(key, "Ctrl+Shift+")
	part := strings.TrimPrefix(key, "Ctrl+Shift+")
	number, err := strconv.Atoi(strings.TrimPrefix(part, "F"))
	if err != nil || number < 1 || number > 12 || part != fmt.Sprintf("F%d", number) {
		return 0, false, fmt.Errorf("不支持的快捷键 %q", key)
	}
	return uint16(0x6F + number), combo, nil
}

func (k *keyTracker) update(vkey uint16, released bool) bool {
	if vkey >= 256 || !((vkey >= 0x70 && vkey <= 0x7B) ||
		(vkey >= 0xA0 && vkey <= 0xA5) || (vkey >= 0x10 && vkey <= 0x12) ||
		vkey == 0x5B || vkey == 0x5C) {
		return false
	}
	first := !k.down[vkey] && !released
	k.down[vkey] = !released
	return first
}

func matchesModifiers(devices map[uintptr]*keyTracker, combo bool) bool {
	var ctrl, shift, alt, win bool
	for _, k := range devices {
		ctrl = ctrl || k.down[0x11] || k.down[0xA2] || k.down[0xA3]
		shift = shift || k.down[0x10] || k.down[0xA0] || k.down[0xA1]
		alt = alt || k.down[0x12] || k.down[0xA4] || k.down[0xA5]
		win = win || k.down[0x5B] || k.down[0x5C]
	}
	return !alt && !win && ctrl == combo && shift == combo
}
