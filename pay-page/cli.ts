import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";

import { PAY_CONFIG_FILE, payPageConfigProblems } from "../src/billing/pay-page";
import type { PaddleEnvironment, PayPageConfig } from "../src/billing/pay-page";

/**
 * `eifi1-pay-page`, the package's bin (docs/billing-harmonization.md §14.4): copies the
 * kit's pay page (`dist/pay/`) into a directory and writes its `pay-config.json` — at
 * each app's web image build, with the deployment's build settings:
 *
 *     npx eifi1-pay-page --out /srv-pay \
 *       --token "$PADDLE_CLIENT_TOKEN" --environment "$PADDLE_ENVIRONMENT" \
 *       --return-url https://keksdose.app/settings/subscription \
 *       --app-name Keksdose \
 *       --terms-url https://keksdose.app/terms --privacy-url https://keksdose.app/privacy
 *
 * It refuses a token whose prefix disagrees with the environment and a URL that isn't
 * `https://` (`http://` for localhost only), so a wrong pairing fails the build, not a
 * buyer. Without a token (billing off; an empty build argument counts as none) it
 * writes `"token": null`, and the page says there is nothing to pay. The kit itself is
 * never rebuilt.
 */

/** What the page is made of, as the kit's build leaves it in `dist/pay/` — and nothing
 *  else is copied, so no stray file reaches the pay host. */
export const PAY_PAGE_FILES = [
  "index.html",
  "pay.js",
  "pay.css",
  ".well-known/apple-developer-merchantid-domain-association",
] as const;

export interface PayPageBuildOptions {
  /** The directory to write: the pay host's root (`/srv-pay` in the Caddy stage). */
  out: string;
  /** Paddle's client-side token; empty or left out: none (billing off). */
  token?: string | null;
  /** `sandbox` or `live`; needed with a token. */
  environment?: string | null;
  /** The app's subscription page: the way back. */
  returnUrl: string;
  appName: string;
  termsUrl: string;
  privacyUrl: string;
}

/** A refusal: the problems, one per line. */
export class PayPageError extends Error {
  readonly problems: readonly string[];
  constructor(problems: readonly string[]) {
    super(`eifi1-pay-page: ${problems.join("; ")}`);
    this.name = "PayPageError";
    this.problems = problems;
  }
}

/** An empty build argument is no argument. */
const given = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
};

/** The configuration the options make — checked, but not written. */
export function payPageConfig(options: Omit<PayPageBuildOptions, "out">): {
  config: PayPageConfig;
  problems: string[];
} {
  const config: PayPageConfig = {
    token: given(options.token),
    environment: given(options.environment) as PaddleEnvironment | null,
    returnUrl: (options.returnUrl ?? "").trim(),
    appName: (options.appName ?? "").trim(),
    termsUrl: (options.termsUrl ?? "").trim(),
    privacyUrl: (options.privacyUrl ?? "").trim(),
  };
  return { config, problems: payPageConfigProblems(config) };
}

/**
 * Copies the page from `bundleDir` (the kit's `dist/pay/`) into `options.out` and
 * writes its `pay-config.json`. Throws a {@link PayPageError} — before writing anything
 * — for a configuration with problems, or a bundle that isn't there.
 */
export function writePayPage(options: PayPageBuildOptions, bundleDir: string): PayPageConfig {
  const { config, problems } = payPageConfig(options);
  const out = (options.out ?? "").trim();
  if (out === "") problems.unshift("--out is missing: the directory to write the page into");
  const missing = PAY_PAGE_FILES.filter((file) => !existsSync(join(bundleDir, file)));
  if (missing.length > 0) {
    problems.push(`the kit's pay page is incomplete in ${bundleDir} (missing ${missing.join(", ")})`);
  }
  if (problems.length > 0) throw new PayPageError(problems);
  for (const file of PAY_PAGE_FILES) {
    const target = join(out, file);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(bundleDir, file), target);
  }
  writeFileSync(join(out, PAY_CONFIG_FILE), `${JSON.stringify(config, null, 2)}\n`);
  return config;
}

const USAGE = `Usage: eifi1-pay-page --out <dir> [--token <test_…|live_…> --environment <sandbox|live>]
       --return-url <https://…> --app-name <name> --terms-url <https://…> --privacy-url <https://…>

Copies @eifi1/ui-kit's pay page into <dir> and writes its ${PAY_CONFIG_FILE}.
Without a token (billing off) the page says there is nothing to pay.`;

export interface PayPageCliIo {
  /** The kit's built page: `dist/pay/`. */
  bundleDir: string;
  log: (message: string) => void;
  error: (message: string) => void;
}

/** The command line: parses `argv`, writes the page, and answers the exit code. */
export function runPayPageCli(argv: readonly string[], io: PayPageCliIo): number {
  let values: Record<string, string | boolean | undefined>;
  try {
    ({ values } = parseArgs({
      args: [...argv],
      strict: true,
      allowPositionals: false,
      options: {
        out: { type: "string" },
        token: { type: "string" },
        environment: { type: "string" },
        "return-url": { type: "string" },
        "app-name": { type: "string" },
        "terms-url": { type: "string" },
        "privacy-url": { type: "string" },
        help: { type: "boolean", short: "h" },
      },
    }));
  } catch (err) {
    io.error(`eifi1-pay-page: ${(err as Error).message}\n\n${USAGE}`);
    return 2;
  }
  if (values.help) {
    io.log(USAGE);
    return 0;
  }
  const text = (key: string) => (typeof values[key] === "string" ? (values[key] as string) : "");
  try {
    const config = writePayPage(
      {
        out: text("out"),
        token: text("token"),
        environment: text("environment"),
        returnUrl: text("return-url"),
        appName: text("app-name"),
        termsUrl: text("terms-url"),
        privacyUrl: text("privacy-url"),
      },
      io.bundleDir,
    );
    io.log(
      `eifi1-pay-page: wrote the pay page to ${text("out").trim()} ` +
        (config.token ? `(${config.environment})` : "(no token: billing off, the page says there is nothing to pay)"),
    );
    return 0;
  } catch (err) {
    if (err instanceof PayPageError) {
      io.error(["eifi1-pay-page: refused —", ...err.problems.map((p) => `  - ${p}`)].join("\n"));
      return 1;
    }
    throw err;
  }
}
