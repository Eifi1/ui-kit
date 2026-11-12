import type { FeedbackEnvironment } from "./feedback-record";

/**
 * Which copy of the app this is — the `environment` every feedback report and crash
 * carries (`useFeedbackSubmit`, `createCrashReporter`; §3.2), so the admin list marks
 * anything not filed from production (0.61, lifted from keksdose
 * `frontend/src/app/deploy-environment.ts`).
 *
 * Each app wrote its own, and they disagreed. keksdose and kastlan read the hostname;
 * Kurvenschmiede read a build flag (`import.meta.env.DEV ? "local" : "prod"`,
 * `shared/lib/crash-reporter.ts`). The flag cannot answer the question: a deployment runs
 * a production BUILD — that is the point of deploying it — so `import.meta.env.PROD` is
 * true on a dev copy too, and on `vite preview` or a docker run on a laptop, each of
 * which would then file as production. Since
 * dev.keksdose.app the same image serves two databases, and a bug filed from dev against
 * prod data (or the reverse) costs a round trip to discover: the screenshot looks the same
 * either way. The host can tell them apart, costs nothing, and keeps one image for both.
 *
 * The rule, keksdose's:
 *
 * - **production** is exactly the hosts the app names — its domain and its `www`;
 * - **dev** is exactly the hosts it names for that copy — its domain, and the platform URL
 *   in front of which the domain mapping sits (keksdose's Cloud Run
 *   `keksdose-web-dev-….a.run.app`), which is what a tester has while the mapping is still
 *   provisioning, exactly when the marker matters most;
 * - **everything else is "local"**: localhost, a LAN address, the `.sslip.io` name a
 *   phone-preview certificate is issued for, a tunnel, a renamed service. Never "unknown"
 *   and never production: an environment the app cannot name is not one to treat as
 *   production silently, and getting that backwards would hide the marker exactly where
 *   nobody knows where they are.
 *
 * No app's hosts live here: each passes its own.
 */

/**
 * The hosts of an app's deployments. An entry is a host name, matched whole (never a
 * suffix: `evil-keksdose.app` and `keksdose.app.example.com` are not keksdose.app), or
 * a pattern for a platform URL with a generated part, tested against the lower-cased
 * host — anchor it (`/^myapp-web-dev-[a-z0-9-]+\.a\.run\.app$/`), or it matches inside
 * any host.
 */
export interface DeployEnvironmentHosts {
  /** The production hosts: `["myapp.example", "www.myapp.example"]`. */
  prod: readonly (string | RegExp)[];
  /** The dev deployment's hosts, if the app has one (kastlan and Kurvenschmiede have
   *  none: everything not production is somebody's machine). */
  dev?: readonly (string | RegExp)[];
}

/** A host matches an entry: a name whole and in any case (DNS is case-blind, and a typed
 *  address can carry capitals), a pattern anywhere it says. `search`, not `test`: a
 *  pattern written with the `g` flag keeps a `lastIndex` that `test` would advance, and
 *  the second call on the same host would answer differently from the first. */
function listed(entries: readonly (string | RegExp)[] | undefined, host: string): boolean {
  return (entries ?? []).some((entry) =>
    typeof entry === "string" ? entry.toLowerCase() === host : host.search(entry) !== -1,
  );
}

/**
 * The copy of the app the page is served from: `"prod"`, `"dev"` or `"local"`, read off
 * the host — {@link DeployEnvironmentHosts} says how.
 *
 * ```ts
 * // Once, beside the app's crash reporter: the page's host does not change.
 * export const DEPLOY_ENVIRONMENT = deployEnvironment({
 *   prod: ["myapp.example", "www.myapp.example"],
 *   dev: ["dev.myapp.example", /^myapp-web-dev-[a-z0-9-]+\.a\.run\.app$/],
 * });
 *
 * createCrashReporter({ …, environment: DEPLOY_ENVIRONMENT });
 * useFeedbackSubmit({ …, environment: DEPLOY_ENVIRONMENT });
 * ```
 *
 * `hostname` defaults to `location.hostname`; where there is none (a test, a server
 * render) the host is `""`, which is "local".
 */
export function deployEnvironment(
  hosts: DeployEnvironmentHosts,
  hostname: string = globalThis.location?.hostname ?? "",
): FeedbackEnvironment {
  const host = hostname.toLowerCase();
  if (listed(hosts.prod, host)) return "prod";
  if (listed(hosts.dev, host)) return "dev";
  return "local";
}
