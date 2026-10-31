// @vitest-environment node
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

/**
 * The scripts that drive Chromium stop the showcase server they started even when the
 * browser's own `close()` rejects (0.52 code review, scripts/e2e-tour-desktop.mjs; the
 * same order in e2e-tour-phone.mjs and screenshot-sizes.mjs). Their `finally` awaited
 * `browser.close()` before `server.stop()`: a Chromium that crashed mid-run (OOM, a killed
 * renderer) threw there, and the detached Vite kept its port, so the next run's
 * `strictPort` failed with "port in use" — what TST-10 had set out to end.
 *
 * Each script runs for real, its scripts/e2e-showcase-server.mjs swapped (a module hook)
 * for a stand-in: a browser whose `newContext` and `close` both reject, and a server whose
 * `stop` leaves a file behind. No browser, no Vite, no port.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const work = mkdtempSync(join(tmpdir(), "uikit-browser-scripts-"));
afterAll(() => rmSync(work, { recursive: true, force: true }));

const STUB = join(work, "showcase-server-stub.mjs");
writeFileSync(
  STUB,
  `import { writeFileSync } from "node:fs";
export class SetupError extends Error {}
export const loadPlaywright = () => ({ chromium: {}, version: "0" });
export const browserEnv = () => ({ ...process.env });
export const launchBrowser = async () => ({
  newContext: async () => { throw new Error("Target page, context or browser has been closed"); },
  close: async () => { throw new Error("Browser has been closed (renderer crashed)"); },
});
const server = (port) => ({ url: "http://localhost:" + port + "/", stop: () => writeFileSync(process.env.STOPPED, "stopped") });
export const startDev = async (port) => server(port);
export const startPreview = async (port) => server(port);
`,
);
const HOOKS = join(work, "hooks.mjs");
writeFileSync(
  HOOKS,
  `export async function resolve(specifier, context, next) {
  if (specifier === "./e2e-showcase-server.mjs") return { url: ${JSON.stringify(pathToFileURL(STUB).href)}, shortCircuit: true };
  return next(specifier, context);
}
`,
);
const REGISTER = join(work, "register.mjs");
writeFileSync(
  REGISTER,
  `import { register } from "node:module";\nregister(${JSON.stringify(pathToFileURL(HOOKS).href)});\n`,
);

/** Runs `script` with the stand-in; whether the server was stopped, and what it printed. */
function run(script: string, ...args: string[]) {
  const stopped = join(work, `${script}.stopped`);
  const r = spawnSync(
    process.execPath,
    ["--import", pathToFileURL(REGISTER).href, join(ROOT, "scripts", script), ...args],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, STOPPED: stopped },
      timeout: 30_000,
    },
  );
  return { stopped: existsSync(stopped), status: r.status, out: r.stdout + r.stderr };
}

describe("the browser scripts stop their server when the browser crashed (0.52 code review)", () => {
  it.each([
    ["e2e-tour-desktop.mjs"],
    ["e2e-tour-phone.mjs"],
    ["screenshot-sizes.mjs", "--out", join(work, "sizes"), "--pages", "overview"],
  ])("%s", (script, ...args) => {
    const result = run(script, ...args);
    expect(result.stopped, result.out).toBe(true);
    // The run still fails: the crash is reported, not swallowed.
    expect(result.status, result.out).not.toBe(0);
  });
});
