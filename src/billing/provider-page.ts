/**
 * The provider's hosted portal in a NEW TAB (0.43, docs/billing-harmonization.md §17):
 * "Payment and invoices", the portal's "Cancel subscription" and the payment-failed
 * banner's "Update payment method" open at the provider while the app stays open where
 * it was. kastlan's `usePortal` (feat/kit-0.42, `72c3177`) is the reference.
 *
 * The checkout is NOT one of them (§17.4): it stays in the same tab, since the page waits
 * for the payer's return (`useCheckoutProcessing`).
 */

/** How the page went: in a tab of its own, or — the browser refused one — in this one. */
export type ProviderPageWay = "new-tab" | "same-tab";

export interface OpenProviderPageOptions {
  /** The window to open from and to fall back to. Default the global `window` (a test's
   *  or an iframe's own). */
  window?: Window;
}

/**
 * Opens the provider's page in a new tab, from INSIDE the click: call it in the click
 * handler itself, before any `await` — a `window.open` after one is blocked as a pop-up.
 *
 * 1. opens `about:blank` synchronously and sets its `opener` to `null`, so the provider's
 *    page cannot reach back into the app;
 * 2. awaits `fetchUrl` — the app's `POST /billing/portal` with its target, answering the
 *    `url` (the kit sends no request);
 * 3. points the tab at the URL;
 * 4. on a refusal closes the tab again and rethrows, so the app shows its error;
 * 5. where the browser refused the tab (a pop-up blocker), or it was closed while the
 *    URL was on its way, the app's own page goes there instead.
 *
 *     <SubscriptionActions
 *       onPortal={(target) => {
 *         openProviderPage(() => api.billingPortal({ target }).then((r) => r.url)).catch(showError);
 *       }}
 *       providerName="Paddle"
 *       appName="Kastlan"
 *     />
 *
 * Resolves with the way it went.
 */
export async function openProviderPage(
  fetchUrl: () => Promise<string>,
  options: OpenProviderPageOptions = {},
): Promise<ProviderPageWay> {
  const win = options.window ?? window;
  let tab: Window | null;
  try {
    tab = win.open("about:blank", "_blank");
  } catch {
    tab = null;
  }
  if (tab) {
    try {
      // The provider's page must not reach back into the app.
      tab.opener = null;
    } catch {
      /* a browser that guards `opener`: the tab is still ours to point */
    }
  }
  let url: string;
  try {
    url = await fetchUrl();
  } catch (error) {
    tab?.close();
    throw error;
  }
  if (tab && !tab.closed) {
    tab.location.href = url;
    return "new-tab";
  }
  win.location.assign(url);
  return "same-tab";
}
