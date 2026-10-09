#!/usr/bin/env node
import process from "node:process";
import { fileURLToPath } from "node:url";

import { runPayPageCli } from "./cli";

/**
 * The `eifi1-pay-page` bin, built to `dist/bin/eifi1-pay-page.mjs`; the page it copies
 * is `dist/pay/`, beside it. See `cli.ts`.
 */
process.exitCode = runPayPageCli(process.argv.slice(2), {
  bundleDir: fileURLToPath(new URL("../pay/", import.meta.url)),
  log: (message) => console.log(message),
  error: (message) => console.error(message),
});
