// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PAY_PAGE_APPS } from "../pay-page";
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

const ARGS = ["--app", "keksdose"];

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
    // The host's app and the kit's whole map: the page serves any app's transaction.
    expect(config()).toEqual({ token: "live_7d1f0c", environment: "live", app: "keksdose", apps: PAY_PAGE_APPS });
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

  it("moves only the host's app with --app-url, keeping its paths; an empty one is none", () => {
    const local = ["--app", "kurvenschmiede", "--app-url", "http://localhost:5173/"];
    expect(run(["--out", out, "--token", "test_1b2c", "--environment", "sandbox", ...local]).code).toBe(0);
    expect(config().app).toBe("kurvenschmiede");
    expect(config().apps.kurvenschmiede).toEqual({
      name: "Kurvenschmiede",
      returnUrl: "http://localhost:5173/settings/subscription",
      termsUrl: "http://localhost:5173/terms",
      privacyUrl: "http://localhost:5173/privacy",
    });
    expect(config().apps.keksdose).toEqual(PAY_PAGE_APPS.keksdose);
    expect(run(["--out", out, "--app", "kastlan", "--app-url", "https://dev.kastlan.app/base"]).code).toBe(0);
    expect(config().apps.kastlan.returnUrl).toBe("https://dev.kastlan.app/base/admin/billing");
    expect(run(["--out", out, "--app", "kastlan", "--app-url", ""]).code).toBe(0);
    expect(config().apps.kastlan).toEqual(PAY_PAGE_APPS.kastlan);
  });

  it("refuses an --app-url that isn't https://, but takes http:// on localhost", () => {
    const http = run(["--out", out, "--app", "keksdose", "--app-url", "http://keksdose.example"]);
    expect(http.code).toBe(1);
    expect(http.errors).toContain("--app-url must be an https:// URL");
    expect(existsSync(out)).toBe(false);
  });

  it("merges an --apps file over the kit's map, field by field, and checks it", () => {
    const apps = join(work, "apps.json");
    writeFileSync(
      apps,
      JSON.stringify({
        keksdose: { returnUrl: "http://localhost:5173/settings/subscription" },
        lenkbank: {
          name: "lenkbank",
          returnUrl: "http://localhost:5174/billing",
          termsUrl: "http://localhost:5174/terms",
          privacyUrl: "http://localhost:5174/privacy",
        },
      }),
    );
    expect(run(["--out", out, "--app", "lenkbank", "--apps", apps]).code).toBe(0);
    expect(config().app).toBe("lenkbank");
    expect(Object.keys(config().apps)).toEqual(["keksdose", "kastlan", "kurvenschmiede", "lenkbank"]);
    expect(config().apps.keksdose).toEqual({ ...PAY_PAGE_APPS.keksdose, returnUrl: "http://localhost:5173/settings/subscription" });

    writeFileSync(apps, JSON.stringify({ shop: { name: "Shop", returnUrl: "http://shop.example/" } }));
    const bad = run(["--out", out, "--app", "keksdose", "--apps", apps]);
    expect(bad.code).toBe(1);
    expect(bad.errors).toContain("apps.shop.returnUrl must be an https:// URL");
    expect(bad.errors).toContain("apps.shop.termsUrl must be an https:// URL");

    writeFileSync(apps, "[1, 2]");
    expect(run(["--out", out, "--app", "keksdose", "--apps", apps]).errors).toContain("must hold a JSON object");
    expect(run(["--out", out, "--app", "keksdose", "--apps", join(work, "none.json")]).errors).toContain(
      "can't be read as JSON",
    );
  });

  it("refuses the 0.33 flags with a line naming --app, writing nothing", () => {
    for (const flag of ["--return-url", "--app-name", "--terms-url", "--privacy-url"]) {
      const old = run(["--out", out, flag, "https://keksdose.app/x"]);
      expect(old.code, flag).toBe(2);
      expect(old.errors).toContain("are gone (ui-kit 0.39)");
      expect(old.errors).toContain("--app <tag>");
      expect(old.errors).toContain("--app-url");
    }
    expect(existsSync(out)).toBe(false);
  });

  it("names what is missing, an app the map doesn't know, and refuses an unknown option with its usage", () => {
    const missing = run(["--token", "live_x", "--environment", "live"]);
    expect(missing.code).toBe(1);
    expect(missing.errors).toContain("--out is missing");
    expect(missing.errors).toContain("app is missing");
    expect(run(["--out", out, "--app", "lenkbank"]).errors).toContain(
      'app "lenkbank" is not in apps (keksdose, kastlan, kurvenschmiede)',
    );
    const unknown = run(["--out", out, "--colour", "red", ...ARGS]);
    expect(unknown.code).toBe(2);
    expect(unknown.errors).toContain("Usage: eifi1-pay-page");
    expect(run(["--help"])).toMatchObject({ code: 0 });
  });

  it("refuses when the kit's page isn't built", () => {
    rmSync(join(bundle, "pay.js"));
    expect(() =>
      writePayPage({ out, app: "keksdose" }, bundle),
    ).toThrow(PayPageError);
    expect(existsSync(out)).toBe(false);
  });
});
