/**
 * The browser and the showcase server for the scripts that drive Chromium: the truncation
 * sweep (screenshot-sizes.mjs, `vite preview` of the built showcase) and the tour e2e
 * scripts (e2e-tour-phone.mjs, e2e-tour-desktop.mjs, the dev server). One copy of each
 * (refactor audit 2026-10-30, TST-10): the e2e scripts had their own server starter and a
 * bare `chromium.launch()`.
 *
 * Launch the browser FIRST, then start the server inside the `try` whose `finally` stops
 * it. The server runs detached, in its own process group; a launch that throws after it
 * started (no headless shell, no libasound) left it holding the port, and Vite's
 * `strictPort` failed the next run with "port in use". In that `finally`, stop the server
 * BEFORE `browser.close()`: a crashed browser rejects its close (0.52 code review).
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The machine is not set up for a browser run. Printed as its message alone, which says
 *  what to run; the stack and playwright's own banner would only bury it. */
export class SetupError extends Error {}

/** The repository's own playwright-core (a devDependency), and its version. */
export function loadPlaywright() {
  const require = createRequire(join(ROOT, "package.json"));
  try {
    return { chromium: require("playwright-core").chromium, version: require("playwright-core/package.json").version };
  } catch (error) {
    if (error?.code !== "MODULE_NOT_FOUND") throw error;
    throw new SetupError("playwright-core is not installed: it is a devDependency, so run `npm ci`", { cause: error });
  }
}

/** The browser's environment: ours, with ~/.local/lib on the library path when it exists —
 *  where a machine without root keeps the libasound the headless shell links against. */
export function browserEnv() {
  const local = join(homedir(), ".local/lib");
  const path = process.env.LD_LIBRARY_PATH ?? "";
  if (!existsSync(local) || path.split(":").includes(local)) return { ...process.env };
  return { ...process.env, LD_LIBRARY_PATH: path ? `${path}:${local}` : local };
}

/** Playwright's own headless shell, unless CHROMIUM names another browser. A missing
 *  browser ends the run with the command that installs it, not playwright's banner,
 *  which says `npx playwright install` — a package this repository does not have. */
export async function launchBrowser(chromium, version) {
  try {
    return await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, env: browserEnv() });
  } catch (error) {
    if (process.env.CHROMIUM || !/Executable doesn't exist/.test(error?.message ?? "")) throw error;
    const path = /Executable doesn't exist at (\S+)/.exec(error.message)?.[1] ?? "its cache";
    throw new SetupError(
      `playwright-core ${version} expects its Chromium headless shell at ${path}, and it is not there.\n` +
        "Install it once with:  npx playwright-core install chromium-headless-shell\n" +
        "(or set CHROMIUM to a browser executable; a revision the client does not pin is unsupported)",
      { cause: error },
    );
  }
}

/**
 * `npx vite <args> --config showcase/vite.config.ts` with `portVariable` set to `port`,
 * resolved once it answers; `stop()` kills its process group. `tries` × 200 ms is how long
 * it may take: the dev server compiles on the first request, the preview only serves.
 */
async function startVite(name, args, portVariable, port, tries) {
  const child = spawn("npx", ["vite", ...args, "--config", "showcase/vite.config.ts"], {
    cwd: ROOT,
    env: { ...process.env, [portVariable]: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
    // Its own process group, so stopping it stops vite and not only the npx above it.
    detached: true,
  });
  const stop = () => {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      /* already gone */
    }
  };
  let log = "";
  child.stdout.on("data", (chunk) => (log += chunk));
  child.stderr.on("data", (chunk) => (log += chunk));
  const url = `http://localhost:${port}/`;
  for (let i = 0; i < tries; i++) {
    if (child.exitCode !== null) throw new Error(`${name} exited:\n${log}`);
    try {
      if ((await fetch(url)).ok) return { stop, url };
    } catch {
      /* not up yet */
    }
    await new Promise((done) => setTimeout(done, 200));
  }
  stop();
  throw new Error(`${name} did not answer on ${url}:\n${log}`);
}

/** The showcase dev server (the tour e2e scripts), on SHOWCASE_PORT's `port`. */
export const startDev = (port) => startVite("vite", [], "SHOWCASE_PORT", port, 300);

/** `vite preview` of the built showcase (the sweep), on SHOWCASE_PREVIEW_PORT's `port`. */
export const startPreview = (port) => startVite("vite preview", ["preview"], "SHOWCASE_PREVIEW_PORT", port, 100);
