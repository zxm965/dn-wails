package fontpatch

import (
	"archive/zip"
	"bytes"
	"compress/zlib"
	"context"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"cull-pear/internal/fontpatch"
)

func TestUnpackRejectsEscapesAndSymlinks(t *testing.T) {
	for _, name := range []string{"../escape", "/absolute", "C:/drive", "folder\\escape", "link"} {
		t.Run(name, func(t *testing.T) {
			var buffer bytes.Buffer
			archive := zip.NewWriter(&buffer)
			header := &zip.FileHeader{Name: name}
			if name == "link" {
				header.SetMode(os.ModeSymlink | 0777)
			}
			writer, err := archive.CreateHeader(header)
			if err != nil {
				t.Fatal(err)
			}
			writer.Write([]byte("content"))
			archive.Close()
			if err := unpack(context.Background(), buffer.Bytes(), t.TempDir()); err == nil {
				t.Fatal("accepted unsafe entry")
			}
		})
	}
}

func TestCopyNeverOverwritesOrLeavesFailedOutput(t *testing.T) {
	root := t.TempDir()
	source, dest := filepath.Join(root, "source.ttf"), filepath.Join(root, "out.zip")
	if err := os.WriteFile(source, []byte("font-data"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := copyFile(context.Background(), source, dest, 2); err == nil {
		t.Fatal("expected size limit")
	}
	if _, err := os.Stat(dest); !errors.Is(err, os.ErrNotExist) {
		t.Fatal("left partial output")
	}
	if err := os.WriteFile(dest, []byte("keep"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := copyFile(context.Background(), source, dest, 100); !errors.Is(err, os.ErrExist) {
		t.Fatal(err)
	}
	data, _ := os.ReadFile(dest)
	if string(data) != "keep" {
		t.Fatal("overwrote existing output")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	canceled := filepath.Join(root, "canceled.zip")
	if err := copyFile(ctx, source, canceled, 100); !errors.Is(err, context.Canceled) {
		t.Fatal(err)
	}
	if _, err := os.Stat(canceled); !errors.Is(err, os.ErrNotExist) {
		t.Fatal("left canceled output")
	}
}

func TestResetRemovesTemporaryResultButKeepsExport(t *testing.T) {
	root := t.TempDir()
	work := filepath.Join(root, "work")
	if err := os.Mkdir(work, 0700); err != nil {
		t.Fatal(err)
	}
	source := filepath.Join(work, "font.zip")
	if err := os.WriteFile(source, []byte("zip"), 0600); err != nil {
		t.Fatal(err)
	}
	runner := &Runner{root: work, id: "result", zipPath: source}
	exported := filepath.Join(root, "download.zip")
	if err := runner.Export(context.Background(), "result", exported); err != nil {
		t.Fatal(err)
	}
	if err := runner.Reset(); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(work); !errors.Is(err, os.ErrNotExist) {
		t.Fatal("temporary files remain")
	}
	if data, err := os.ReadFile(exported); err != nil || string(data) != "zip" {
		t.Fatal("reset changed downloaded file")
	}
	if err := runner.Export(context.Background(), "result", filepath.Join(root, "again.zip")); !errors.Is(err, fontpatch.ErrNoResult) {
		t.Fatal("old result is still exportable")
	}
}

func TestBundledRuntimeBuildAndExport(t *testing.T) {
	// The frozen process must not find a user-installed interpreter or packages.
	t.Setenv("PATH", "")
	t.Setenv("PYTHONPATH", "")
	t.Setenv("PYTHONHOME", "")
	runner := New()
	if !runner.Available() {
		if os.Getenv("DN_REQUIRE_FONT_RUNTIME") == "1" {
			t.Fatal("required native font runtime missing")
		}
		t.Skip("build the native runtime using scripts/build-font-patch.py")
	}
	service := fontpatch.NewService(runner)
	t.Cleanup(func() {
		if err := service.Close(); err != nil {
			t.Error(err)
		}
	})
	ctx := context.Background()
	for _, extension := range []string{"ttf", "otf"} {
		t.Run(extension, func(t *testing.T) {
			source, err := filepath.Abs(filepath.Join("testdata", "synthetic."+extension))
			if err != nil {
				t.Fatal(err)
			}
			original, err := os.ReadFile(source)
			if err != nil {
				t.Fatal(err)
			}
			result, err := service.Build(ctx, source)
			if err != nil {
				t.Fatal(err)
			}
			if !result.ContainerVerified || result.GameVerified || result.Converted != (extension == "otf") || !strings.Contains(result.MissingCharacters, "龙") {
				t.Fatalf("bad result: %+v", result)
			}
			output := filepath.Join(t.TempDir(), "字体补丁.zip")
			if err := service.Export(ctx, result.ID, output); err != nil {
				t.Fatal(err)
			}
			archive, err := zip.OpenReader(output)
			if err != nil {
				t.Fatal(err)
			}
			defer archive.Close()
			if len(archive.File) != 2 {
				t.Fatalf("expected PAK and report, got %d", len(archive.File))
			}
			var pak *zip.File
			for _, f := range archive.File {
				if f.Name == result.Filename {
					pak = f
				}
			}
			if pak == nil {
				t.Fatal("missing PAK")
			}
			stream, err := pak.Open()
			if err != nil {
				t.Fatal(err)
			}
			defer stream.Close()
			// Read just the resource and index, not the 500 MiB padding.
			header := make([]byte, 1024)
			if _, err := io.ReadFull(stream, header); err != nil {
				t.Fatal(err)
			}
			if string(bytes.TrimRight(header[:256], "\x00")) != "EyedentityGames Packing File 0.1" || binary.LittleEndian.Uint32(header[260:264]) != 1 {
				t.Fatal("invalid PAK header")
			}
			indexOffset := binary.LittleEndian.Uint32(header[264:268])
			payload := make([]byte, int(indexOffset)-1024)
			if _, err := io.ReadFull(stream, payload); err != nil {
				t.Fatal(err)
			}
			index := make([]byte, 316)
			if _, err := io.ReadFull(stream, index); err != nil {
				t.Fatal(err)
			}
			if string(bytes.TrimRight(index[:256], "\x00")) != "\\resource\\fonts\\mysh.ttf" {
				t.Fatal("wrong resource")
			}
			inflater, err := zlib.NewReader(bytes.NewReader(payload))
			if err != nil {
				t.Fatal(err)
			}
			font, err := io.ReadAll(inflater)
			inflater.Close()
			if err != nil {
				t.Fatal(err)
			}
			hash := sha256.Sum256(font)
			if hex.EncodeToString(hash[:]) != result.SHA256 {
				t.Fatal("font digest mismatch")
			}
			if extension == "ttf" && !bytes.Equal(font, original) {
				t.Fatal("TTF was modified")
			}
			if !bytes.Equal(font[:4], []byte{0, 1, 0, 0}) {
				t.Fatal("not TrueType")
			}
			// Consume padding as a stream to verify ZIP CRC as well.
			if _, err := io.Copy(io.Discard, stream); err != nil {
				t.Fatal(err)
			}
			after, _ := os.ReadFile(source)
			if !bytes.Equal(original, after) {
				t.Fatal("modified source font")
			}
		})
	}
}
