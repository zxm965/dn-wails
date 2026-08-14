import { readFile, writeFile } from "node:fs/promises";

const displayNameKey = "APP_DISPLAY_NAME";
const projectRoot = new URL("../", import.meta.url);

function parseValue(rawValue, lineNumber) {
  const value = rawValue.trim();
  if (!value) return "";

  const quote = value[0];
  if (quote !== "'" && quote !== '"') return value;
  if (value.length < 2 || value.at(-1) !== quote) {
    throw new Error(`.env line ${lineNumber}: unterminated quoted value`);
  }
  return value.slice(1, -1);
}

async function readDisplayName() {
  const source = await readFile(new URL(".env", projectRoot), "utf8");
  let displayName = "";
  let found = false;

  for (const [index, sourceLine] of source.split(/\r?\n/).entries()) {
    const line = sourceLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    if (key !== displayNameKey) continue;
    if (found) throw new Error(`.env line ${index + 1}: duplicate ${displayNameKey}`);

    displayName = parseValue(line.slice(separatorIndex + 1), index + 1).trim();
    found = true;
  }

  if (!found) throw new Error(`.env: ${displayNameKey} is required`);
  if (!displayName) throw new Error(`.env: ${displayNameKey} cannot be empty`);
  if (Array.from(displayName).length > 40)
    throw new Error(`.env: ${displayNameKey} cannot exceed 40 characters`);
  if (
    Array.from(displayName).some((character) => {
      const codePoint = character.codePointAt(0);
      return (
        codePoint !== undefined &&
        (codePoint <= 0x1f ||
          (codePoint >= 0x7f && codePoint <= 0x9f) ||
          codePoint === 0x2028 ||
          codePoint === 0x2029)
      );
    })
  ) {
    throw new Error(`.env: ${displayNameKey} cannot contain control characters`);
  }
  if (displayName === "." || displayName === ".." || /[\\/:]/u.test(displayName)) {
    throw new Error(`.env: ${displayNameKey} cannot contain path separators`);
  }

  return displayName;
}

function quoteYaml(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

async function syncBuildMetadata(displayName) {
  const configURL = new URL("build/config.yml", projectRoot);
  const source = await readFile(configURL, "utf8");
  const pattern = /^(\s*productName:\s*).+$/m;
  if (!pattern.test(source)) throw new Error("build/config.yml is missing info.productName");
  const next = source.replace(pattern, `$1${quoteYaml(displayName)}`);
  if (next !== source) await writeFile(configURL, next);
}

function escapeXML(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function setPlistString(source, key, value) {
  const escapedValue = escapeXML(value);
  const existingPattern = new RegExp(`(<key>${key}</key>\\s*<string>)[^<]*(</string>)`);
  if (existingPattern.test(source)) return source.replace(existingPattern, `$1${escapedValue}$2`);

  const bundleNamePattern = /(\s*<key>CFBundleName<\/key>\s*<string>[^<]*<\/string>)/;
  if (!bundleNamePattern.test(source)) throw new Error("macOS Info.plist is missing CFBundleName");
  return source.replace(
    bundleNamePattern,
    `$1\n\t\t<key>${key}</key>\n\t\t<string>${escapedValue}</string>`,
  );
}

async function syncMacOSPlists(displayName) {
  for (const path of ["build/darwin/Info.plist", "build/darwin/Info.dev.plist"]) {
    const plistURL = new URL(path, projectRoot);
    const source = await readFile(plistURL, "utf8");
    const next = setPlistString(
      setPlistString(source, "CFBundleName", displayName),
      "CFBundleDisplayName",
      displayName,
    );
    if (next !== source) await writeFile(plistURL, next);
  }
}

const displayName = await readDisplayName();
switch (process.argv[2] ?? "--print") {
  case "--print":
    process.stdout.write(displayName);
    break;
  case "--sync-build-metadata":
    await syncBuildMetadata(displayName);
    break;
  case "--sync-macos-plists":
    await syncMacOSPlists(displayName);
    break;
  default:
    throw new Error(`Unknown option: ${process.argv[2]}`);
}
