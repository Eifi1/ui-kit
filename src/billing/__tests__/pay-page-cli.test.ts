// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PAY_PAGE_FILES, PayPageError, runPayPageCli, writePayPage } from "../../../pay-page/cli";

/**
 * `eifi1-pay-page`, the package's bin (docs/billing-harmonization.md §14.4): it copies
 * the kit's page into an app's build and writes `pay-config.json` — and refuses a wrong
 * pairing, so it fails the build, not a buyer.
 */

const ROOT = resolve(__dirname, "../../..");

let work: string;
let bundle: string;
let out: string;

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), "pay-page-cli-"));
  // A built page as `dist/pay/` holds it: the shipped static files and a pay.js.
  bundle = join(work, "dist-pay");
  for (const file of PAY_PAGE_FILES) {
    const target = join(bundle, file);
    mkdirSync(dirname(target), { recursive: true });
    if (file === "pay.js") writeFileSync(target, "/* the page */\n");
    else copyFileSync(join(ROOT, "pay-page", file), target);
  }
  writeFileSync(join(bundle, "stray.txt"), "not part of the page");
  out = join(work, "srv-pay");
});

afterEach(() => {
  rmSync(work, { recursive: true, force: true });
});

const ARGS = [
  "--return-url",
  "https://keksdose.app/settings/subscription",
  "--app-name",
  "Keksdose",
  "--terms-url",
  "https://keksdose.app/terms",
  "--privacy-url",
  "https://keksdose.app/privacy",
];

function run(argv: string[]) {
  const logged: string[] = [];
  const errors: string[] = [];
  const code = runPayPageCli(argv, {
    bundleDir: bundle,
    log: (m) => void logged.push(m),
    error: (m) => void errors.push(m),
  });
  return { code, logged: logged.join("\n"), errors: errors.join("\n") };
}

const config = () => JSON.parse(readFileSync(join(out, "pay-config.json"), "utf8"));

describe("eifi1-pay-page (§14.4)", () => {
  it("copies the page — and only the page — and writes pay-config.json", () => {
    const { code, logged } = run(["--out", out, "--token", "live_7d1f0c", "--environment", "live", ...ARGS]);
    expect(code).toBe(0);
    expect(logged).toContain("(live)");
    for (const file of PAY_PAGE_FILES) expect(existsSync(join(out, file)), file).toBe(true);
    expect(existsSync(join(out, "stray.txt"))).toBe(false);
    expect(readFileSync(join(out, ".well-known/apple-developer-merchantid-domain-association"), "utf8")).toBe(
      readFileSync(join(ROOT, "pay-page/.well-known/apple-developer-merchantid-domain-association"), "utf8"),
    );
    expect(config()).toEqual({
      token: "live_7d1f0c",
      environment: "live",
      returnUrl: "https://keksdose.app/settings/subscription",
      appName: "Keksdose",
      termsUrl: "https://keksdose.app/terms",
      privacyUrl: "https://keksdose.app/privacy",
    });
  });

  it("writes token null without a token — an empty build argument counts as none", () => {
    expect(run(["--out", out, "--token", "", "--environment", "", ...ARGS]).code).toBe(0);
    expect(config()).toMatchObject({ token: null, environment: null });
    expect(run([`--out=${out}`, ...ARGS]).code).toBe(0);
    expect(config().token).toBeNull();
  });

  it("refuses a token whose prefix disagrees with the environment, writing nothing", () => {
    const { code, errors } = run(["--out", out, "--token", "test_1b2c", "--environment", "live", ...ARGS]);
    expect(code).toBe(1);
    expect(errors).toContain("the token is a sandbox token (test_…), but the environment is live");
    expect(existsSync(out)).toBe(false);
  });

  it("refuses a return URL that isn't https://, but takes http:// on localhost", () => {
    const http = ARGS.map((a) => (a === "https://keksdose.app/settings/subscription" ? "http://keksdose.app/s" : a));
    expect(run(["--out", out, ...http]).errors).toContain("returnUrl must be an https:// URL");
    const local = ARGS.map((a) =>
      a === "https://keksdose.app/settings/subscription" ? "http://localhost:5173/settings/subscription" : a,
    );
    expect(run(["--out", out, "--token", "test_1b2c", "--environment", "sandbox", ...local]).code).toBe(0);
  });

  it("names what is missing, and refuses an unknown option with its usage", () => {
    const missing = run(["--token", "live_x", "--environment", "live"]);
    expect(missing.code).toBe(1);
    expect(missing.errors).toContain("--out is missing");
    expect(missing.errors).toContain("appName is missing");
    const unknown = run(["--out", out, "--colour", "red", ...ARGS]);
    expect(unknown.code).toBe(2);
    expect(unknown.errors).toContain("Usage: eifi1-pay-page");
    expect(run(["--help"])).toMatchObject({ code: 0 });
  });

  it("refuses when the kit's page isn't built", () => {
    rmSync(join(bundle, "pay.js"));
    expect(() =>
      writePayPage(
        {
          out,
          returnUrl: "https://a.example/s",
          appName: "A",
          termsUrl: "https://a.example/t",
          privacyUrl: "https://a.example/p",
        },
        bundle,
      ),
    ).toThrow(PayPageError);
    expect(existsSync(out)).toBe(false);
  });
});
