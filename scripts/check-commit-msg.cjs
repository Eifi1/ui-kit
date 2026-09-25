#!/usr/bin/env node
/**
 * Validate a commit message against the Conventional Commits format.
 *
 * The allowed types are read from .versionrc.cjs so they stay in lock-step with
 * the changelog/semver config used by commit-and-tag-version — a commit that
 * passes here is a commit the release tool can categorise. Dependency-free on
 * purpose (no commitlint), so it runs in a hook or in CI without an install.
 */
const fs = require("fs");
const path = require("path");

// .versionrc.cjs is a CommonJS module (this package is ESM; kastlan's flavour, not keksdose's
// .versionrc.json); require it directly rather than JSON.parse.
const versionrc = require(path.join(__dirname, "..", ".versionrc.cjs"));
const TYPES = versionrc.types.map((t) => t.type);

// <type>(<scope>)?!?: <subject>  — scope and the breaking-change "!" are optional.
const HEADER = new RegExp(`^(${TYPES.join("|")})(\\([\\w .,/-]+\\))?!?: .+`);
const MAX_HEADER = 100;

/** Returns an error string if the message is invalid, or null when it's fine. */
function validate(message) {
  const firstLine =
    message.split("\n").find((l) => l.trim() && !l.startsWith("#")) ?? "";
  // git generates these itself; don't reject them.
  if (/^(Merge|Revert|fixup!|squash!)/.test(firstLine)) return null;
  if (firstLine.length > MAX_HEADER) {
    return `Header is ${firstLine.length} chars (max ${MAX_HEADER}).`;
  }
  if (!HEADER.test(firstLine)) {
    return [
      "Commit messages must follow Conventional Commits:",
      "  <type>(<scope>)?: <subject>",
      `  allowed types: ${TYPES.join(", ")}`,
      '  example: "feat(chip): pressed state for action chips"',
      `  got: "${firstLine}"`,
    ].join("\n");
  }
  return null;
}

module.exports = { validate, TYPES };

if (require.main === module) {
  const arg = process.argv[2];
  let message = arg ?? "";
  // The husky commit-msg hook passes a file path; also accept a raw string.
  try {
    if (arg && fs.existsSync(arg)) message = fs.readFileSync(arg, "utf8");
  } catch {
    /* not a path — treat the argument as the message itself */
  }
  const error = validate(message);
  if (error) {
    console.error(`✖ ${error.replace(/\n/g, "\n  ")}`);
    process.exit(1);
  }
}
