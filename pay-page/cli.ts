import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";

import { PAY_CONFIG_FILE, PAY_PAGE_APPS, isPayPageUrl, payPageConfigProblems } from "../src/billing/pay-page";
import type { PaddleEnvironment, PayPageApp, PayPageConfig } from "../src/billing/pay-page";

/**
 * `eifi1-pay-page`, the package's bin (docs/billing-harmonization.md §14.4, §15.2.6):
 * copies the kit's pay page (`dist/pay/`) into a directory and writes its
 * `pay-config.json` — at each app's web image build, with the deployment's build
 * settings:
 *
 *     npx eifi1-pay-page --out /srv-pay \
 *       --token "$PADDLE_CLIENT_TOKEN" --environment "$PADDLE_ENVIRONMENT" \
 *       --app keksdose --app-url "$PAY_APP_URL"
 *
 * `--app` is the host's own app, a tag of the kit's map {@link PAY_PAGE_APPS}, which the
 * file carries whole: every pay page serves any app's transaction (0.39). `--app-url`
 * moves only the host's app to another site (a local stack, a dev deploy; an empty
 * build argument counts as none), and `--apps <file>` merges a JSON map of the same
 * shape over the kit's, field by field (several apps run locally against one sandbox).
 * The 0.33 flags `--return-url`, `--app-name`, `--terms-url` and `--privacy-url` are
 * refused with a line naming these.
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
  /** The host's own app: a tag of the map. */
  app: string;
  /** The host's app's site, replacing the map's (`https://dev.keksdose.app`): its URLs
   *  keep their paths. Empty or left out: the map's. */
  appUrl?: string | null;
  /** Merged over {@link PAY_PAGE_APPS}, app by app and field by field. */
  apps?: Readonly<Record<string, Partial<PayPageApp>>>;
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

/** `url` on `site`: the site's origin and path prefix, then the URL's own path, query
 *  and fragment — `https://keksdose.app/terms` on `http://localhost:5173` is
 *  `http://localhost:5173/terms`. */
function moved(url: string, site: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  return `${site.replace(/\/+$/, "")}${parsed.pathname}${parsed.search}${parsed.hash}`;
}

/** The kit's map with the file's merged over it, app by app and field by field. */
function mergedApps(over: PayPageBuildOptions["apps"]): Record<string, PayPageApp> {
  const apps: Record<string, PayPageApp> = {};
  for (const [tag, app] of Object.entries(PAY_PAGE_APPS)) apps[tag] = { ...app };
  for (const [tag, app] of Object.entries(over ?? {})) {
    // Defined, not assigned: a "__proto__" key in the file stays a key (and is refused
    // as a tag), never the map's prototype.
    const base = Object.prototype.hasOwnProperty.call(apps, tag) ? apps[tag] : {};
    Object.defineProperty(apps, tag, { value: { ...base, ...app }, enumerable: true, writable: true, configurable: true });
  }
  return apps;
}

/** The configuration the options make — checked, but not written. */
export function payPageConfig(options: Omit<PayPageBuildOptions, "out">): {
  config: PayPageConfig;
  problems: string[];
} {
  const app = (options.app ?? "").trim();
  const apps = mergedApps(options.apps);
  const problems: string[] = [];
  const site = given(options.appUrl);
  if (site !== null) {
    if (!isPayPageUrl(site)) problems.push("--app-url must be an https:// URL (http:// for localhost only)");
    else if (Object.prototype.hasOwnProperty.call(apps, app)) {
      const own = apps[app];
      apps[app] = {
        ...own,
        returnUrl: moved(own.returnUrl, site),
        termsUrl: moved(own.termsUrl, site),
        privacyUrl: moved(own.privacyUrl, site),
      };
    }
  }
  const config: PayPageConfig = {
    token: given(options.token),
    environment: given(options.environment) as PaddleEnvironment | null,
    app,
    apps,
  };
  return { config, problems: [...problems, ...payPageConfigProblems(config)] };
}

/** `--apps <file>`: a JSON object of apps by tag. Throws a {@link PayPageError}. */
export function readAppsFile(path: string): Record<string, Partial<PayPageApp>> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    throw new PayPageError([`--apps ${path} can't be read as JSON: ${(err as Error).message}`]);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new PayPageError([`--apps ${path} must hold a JSON object of apps by tag`]);
  }
  return parsed as Record<string, Partial<PayPageApp>>;
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
       --app <tag> [--app-url <https://…>] [--apps <file>]

Copies @eifi1/ui-kit's pay page into <dir> and writes its ${PAY_CONFIG_FILE}: the
token, the host's app (--app: ${Object.keys(PAY_PAGE_APPS).join(", ")}) and the kit's
map of apps, which the page reads each transaction's app from. --app-url moves the
host's app to another site; --apps merges a JSON map of apps by tag over the kit's.
Without a token (billing off) the page says there is nothing to pay.`;

/** The 0.33 flags: one app's page. Refused since 0.39, with the line that says why. */
const OLD_FLAGS = ["return-url", "app-name", "terms-url", "privacy-url"] as const;

const OLD_FLAGS_REFUSED =
  "eifi1-pay-page: --return-url, --app-name, --terms-url and --privacy-url are gone (ui-kit 0.39): " +
  "every pay page serves every app, from the kit's map. Pass --app <tag> instead, with --app-url <https://…> " +
  "for another site (your PAY_APP_URL) and --apps <file> to merge your own map.";

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
        app: { type: "string" },
        "app-url": { type: "string" },
        apps: { type: "string" },
        // Parsed only to be refused with a line that names the new flags.
        ...Object.fromEntries(OLD_FLAGS.map((flag) => [flag, { type: "string" as const }])),
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
  if (OLD_FLAGS.some((flag) => values[flag] !== undefined)) {
    io.error(`${OLD_FLAGS_REFUSED}\n\n${USAGE}`);
    return 2;
  }
  const text = (key: string) => (typeof values[key] === "string" ? (values[key] as string) : "");
  try {
    const appsFile = given(text("apps"));
    const config = writePayPage(
      {
        out: text("out"),
        token: text("token"),
        environment: text("environment"),
        app: text("app"),
        appUrl: text("app-url"),
        apps: appsFile === null ? undefined : readAppsFile(appsFile),
      },
      io.bundleDir,
    );
    io.log(
      `eifi1-pay-page: wrote ${config.app}'s pay page (serving ${Object.keys(config.apps).join(", ")}) ` +
        `to ${text("out").trim()} ` +
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
