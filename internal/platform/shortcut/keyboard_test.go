package shortcut

import "testing"

func TestRawModifierNormalization(t *testing.T) {
	for _, c := range []struct{ vkey, scan, flags, want uint16 }{
		{0x10, 0x2A, 0, 0xA0}, {0x10, 0x36, 1, 0xA1},
		{0x11, 0x1D, 0, 0xA2}, {0x11, 0x1D, 3, 0xA3},
		{0x12, 0x38, 0, 0xA4}, {0x12, 0x38, 2, 0xA5},
		{0x73, 0x3E, 0, 0x73},
	} {
		if got := normalizeKey(c.vkey, c.scan, c.flags); got != c.want {
			t.Fatalf("normalize %+v: got %#x", c, got)
		}
	}
}

func TestRawKeyboardTransitions(t *testing.T) {
	for _, combo := range []bool{false, true} {
		t.Run(map[bool]string{false: "F4", true: "CtrlShiftF4"}[combo], func(t *testing.T) {
			k := &keyTracker{}
			devices := map[uintptr]*keyTracker{1: k}
			if combo {
				k.update(0xA2, false)
				k.update(0xA1, false)
			}
			if !k.update(0x73, false) || !matchesModifiers(devices, combo) {
				t.Fatal("first press missing")
			}
			if k.update(0x73, false) {
				t.Fatal("held key repeated")
			}
			if k.update(0x73, true) || !k.update(0x73, false) {
				t.Fatal("release/repress broken")
			}
			k.update(0xA4, false)
			if matchesModifiers(devices, combo) {
				t.Fatal("Alt combination accepted")
			}
			k.update(0xA4, true)
			k.update(0x5B, false)
			if matchesModifiers(devices, combo) {
				t.Fatal("Windows combination accepted")
			}
			if k.update(0x41, false) || k.down[0x41] {
				t.Fatal("ordinary text retained")
			}
		})
	}
}

func TestModifiersAcrossDevices(t *testing.T) {
	a, b := &keyTracker{}, &keyTracker{}
	devices := map[uintptr]*keyTracker{1: a, 2: b}
	a.update(0xA2, false)
	b.update(0xA2, false)
	a.update(0xA2, true)
	if matchesModifiers(devices, false) {
		t.Fatal("other keyboard modifier lost")
	}
	delete(devices, 2)
	if !matchesModifiers(devices, false) {
		t.Fatal("unplugged keyboard left modifier stuck")
	}
}

func TestParseShortcut(t *testing.T) {
	for _, key := range []string{"F1", "F4", "F12", "Ctrl+Shift+F4"} {
		if _, _, err := parseKey(key); err != nil {
			t.Fatal(err)
		}
	}
	for _, key := range []string{"", "F0", "F13", "f4", "F04", "Alt+F4", "Ctrl+F4"} {
		if _, _, err := parseKey(key); err == nil {
			t.Fatalf("accepted %q", key)
		}
	}
}
