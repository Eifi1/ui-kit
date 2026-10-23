/**
 * The showcase dev server for the tour e2e scripts (e2e-tour-phone.mjs, e2e-tour-desktop.mjs):
 * `npx vite --config showcase/vite.config.ts` on `port`, resolved once it answers. `stop()`
 * kills its process group.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export async function startDev(port) {
  const child = spawn("npx", ["vite", "--config", "showcase/vite.config.ts"], {
    cwd: ROOT,
    env: { ...process.env, SHOWCASE_PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
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
  child.stdout.on("data", (c) => (log += c));
  child.stderr.on("data", (c) => (log += c));
  const url = `http://localhost:${port}/`;
  for (let i = 0; i < 300; i++) {
    if (child.exitCode !== null) throw new Error(`vite exited:\n${log}`);
    try {
      if ((await fetch(url)).ok) return { stop, url };
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  stop();
  throw new Error(`vite did not answer on ${url}:\n${log}`);
}
