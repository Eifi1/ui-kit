#!/usr/bin/env node
/**
 * The `eifi1-npm-audit` bin: one call that runs on import, as the pay page's bin.ts.
 * scripts/build-npm-audit.mjs bundles it into `dist/bin/eifi1-npm-audit.mjs`, and the kit's
 * own gate runs it from source (`check:security`: `node npm-audit/bin.mjs`; Node strips
 * cli.ts's types, as gen-styling-inventory.mjs imports role-utilities.ts).
 *
 * Until 0.66 the bin was cli.ts itself, behind `if (argv[1] is this module)`. That guard
 * failed OPEN: reached through a shim that hands Node another path, or a bundler that
 * rewrites `import.meta.url`, nothing ran, nothing printed, and the exit code was 0 — a
 * security gate passing silently, which is what Staunlabor's frontend gate runs (refactor
 * audit 2026-11-22, TST-3). A `.mjs`, not a `.ts`: it imports `./cli.ts` by its real name,
 * which tsconfig.json may not allow (allowImportingTsExtensions, see its comment).
 */
import process from "node:process";

import { runNpmAuditCli } from "./cli.ts";

process.exitCode = runNpmAuditCli(process.argv.slice(2));
