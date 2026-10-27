import assert from "node:assert/strict";
import test from "node:test";

import { extractReleaseNotes } from "../generate-release-notes.mjs";

const changelog = `# 更新日志

## [Unreleased]

- 尚未发布

## [1.2.3] - 2026-10-27

### 新增
- 支持更新日志

### 修复
- 修复显示问题

## [1.2.2] - 2026-10-20

- 旧版本内容
`;

test("selects only the requested stable version and preserves Markdown", () => {
  assert.equal(
    extractReleaseNotes(changelog.replaceAll("\n", "\r\n"), "v1.2.3"),
    "### 新增\n- 支持更新日志\n\n### 修复\n- 修复显示问题\n",
  );
});

test("missing, duplicate, empty and prerelease notes fail before publishing", () => {
  for (const [text, version] of [
    [changelog, "1.2.4"],
    [changelog + "\n## [1.2.3]\n- duplicate", "1.2.3"],
    ["## [1.2.3]\n### 新增\n<!-- pending -->", "1.2.3"],
    [changelog, "1.2.3-beta.1"],
    [changelog, "01.2.3"],
    [changelog, "Unreleased"],
  ])
    assert.throws(() => extractReleaseNotes(text, version));
});

test("version-like headings inside fenced examples do not truncate or duplicate notes", () => {
  const notes = "- 示例\n\n```md\n## [1.2.3]\n```\n\n~~~md\n## [1.2.2]\n~~~";
  assert.equal(
    extractReleaseNotes(`## [1.2.3]\n${notes}\n## [1.2.2]\n- old`, "1.2.3"),
    notes + "\n",
  );
});
