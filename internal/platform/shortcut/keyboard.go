package shortcut

// keyTracker is owned by the listener thread and retains only modifier state.
type keyTracker struct {
	key       uintptr
	modifiers uint16
}

var modifierKeys = [...]uintptr{0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0x5B, 0x5C}

func newKeyTracker(key uintptr, isDown func(uintptr) bool) *keyTracker {
	t := &keyTracker{key: key}
	for index, modifier := range modifierKeys {
		if isDown(modifier) {
			t.modifiers |= 1 << index
		}
	}
	return t
}

func (t *keyTracker) observe(key uintptr, down, altDown bool) (keyState, bool) {
	var mask uint16
	for index, modifier := range modifierKeys {
		if key == modifier {
			mask = 1 << index
			break
		}
	}
	switch key {
	case 0x10: // VK_SHIFT
		mask = 0b00000011
	case 0x11: // VK_CONTROL
		mask = 0b00001100
	case 0x12: // VK_MENU
		mask = 0b00110000
	}
	if mask != 0 {
		if down {
			t.modifiers |= mask
		} else {
			t.modifiers &^= mask
		}
		return keyState{}, false
	}
	if key != t.key {
		return keyState{}, false
	}
	return keyState{down: down, matches: down && t.modifiers == 0 && !altDown}, true
}
