import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function extractReleaseNotes(changelog, rawVersion) {
  const version = rawVersion.trim().replace(/^v/, "");
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error("Release version must use MAJOR.MINOR.PATCH");
  }

  const sections = [];
  let section = null;
  let fence = null;
  for (const line of changelog.replace(/\r\n?/g, "\n").split("\n")) {
    const delimiter = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (
        delimiter &&
        delimiter[1][0] === fence[0] &&
        delimiter[1].length >= fence.length &&
        !delimiter[2].trim()
      )
        fence = null;
    } else if (delimiter) {
      fence = delimiter[1];
    } else if (/^##\s/.test(line)) {
      const heading = line.match(/^##\s+\[([^\]]+)\](?:\s+.*)?$/);
      section = heading?.[1] === version ? [] : null;
      if (section) sections.push(section);
      continue;
    }
    if (section) section.push(line);
  }

  if (sections.length !== 1)
    throw new Error(`CHANGELOG.md must contain exactly one [${version}] section`);
  const notes = sections[0]
    .join("\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
  if (
    !notes
      .replace(/^#{1,6}.*$/gm, "")
      .replace(/^\s*[-*+]\s*$/gm, "")
      .trim()
  ) {
    throw new Error(`Release notes for ${version} must not be empty`);
  }
  return `${notes}\n`;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const [version, output] = process.argv.slice(2);
  if (!version || !output)
    throw new Error("Usage: node scripts/generate-release-notes.mjs vMAJOR.MINOR.PATCH output.md");
  const changelog = await readFile(new URL("../CHANGELOG.md", import.meta.url), "utf8");
  await writeFile(output, extractReleaseNotes(changelog, version), "utf8");
}
