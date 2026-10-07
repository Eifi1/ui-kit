import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";

/**
 * The ring a `?focus=` target wears for {@link SETTINGS_FOCUS_MS} — keksdose's
 * `HIGHLIGHT`, in tokens: `--brand` for the ring and the page's own surface for the gap,
 * where keksdose named a slate for the dark theme. A ring rather than a background
 * flash: the destructive cards already own a background tint, and a ring reads the same
 * on every card.
 */
export const SETTINGS_FOCUS_RING = ["ring-2", "ring-[var(--brand)]", "ring-offset-2", "ring-offset-[var(--bg-page)]"];

/** How long the ring stays (§3.5). */
export const SETTINGS_FOCUS_MS = 1800;

/** How long a target that is not on the page yet (a lazy card, a card waiting for its
 *  data) is waited for before the hook gives up on it. */
const WAIT_MS = 5000;

const HEADING = "[data-settings-heading], h1, h2, h3, h4, h5, h6";

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * `?focus=<anchor>` (docs/settings-harmonization.md §3.5): scroll the card into view, ring
 * it for 1.8 s, move focus to its heading for a screen reader, then remove `focus` — and
 * ONLY `focus` — with a replace, so a reload does not ring it again. Every other
 * parameter stays: a tour's `tour` / `tourStep`, the admin roster's filters (dropping URL
 * parts broke keksdose's tours once, dev#495). The hash and `location.state` stay too.
 *
 * A search hit, ⌘K, a tour and a mail link all arrive this way. `SettingsLayout` calls it
 * for its own page; an app's own page can call it with no argument to act on its URL.
 *
 * `anchor`:
 *  - left out: the URL's `focus` parameter;
 *  - a string: that anchor (the layout passes the URL's, once its route is canonical);
 *  - `null`: nothing to do yet — the layout passes it while the address is about to be
 *    replaced, so a removal here cannot undo a redirect there.
 *
 * "Once its group has rendered": the effect runs after the commit that mounted the
 * group's cards, so the card is there; a card that mounts later (lazy, or behind its
 * data) is waited for, for a few seconds, before the hook gives up and leaves the URL
 * as it is.
 */
export function useSettingsFocus(anchor?: string | null): void {
  const location = useLocation();
  const navigate = useNavigate();
  const target = anchor === undefined ? new URLSearchParams(location.search).get("focus") : anchor;
  // The ring outlives the effect that drew it: removing `focus` from the URL re-runs the
  // effect (and cleans it up) at once, and the ring must still stay its 1.8 s.
  const ring = useRef<{ el: HTMLElement; timer: number } | null>(null);

  useEffect(() => {
    if (!target) return;
    const { pathname, search, hash, state } = location;

    const land = (el: HTMLElement) => {
      el.scrollIntoView?.({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });

      if (ring.current) {
        window.clearTimeout(ring.current.timer);
        ring.current.el.classList.remove(...SETTINGS_FOCUS_RING);
      }
      el.classList.add(...SETTINGS_FOCUS_RING);
      el.setAttribute("data-settings-focus", "");
      const timer = window.setTimeout(() => {
        el.classList.remove(...SETTINGS_FOCUS_RING);
        el.removeAttribute("data-settings-focus");
        if (ring.current?.el === el) ring.current = null;
      }, SETTINGS_FOCUS_MS);
      ring.current = { el, timer };

      // The heading, so a screen reader starts at the card's name; the card itself when
      // it has none. `preventScroll`: the smooth scroll above is already on its way.
      const heading = el.querySelector<HTMLElement>(HEADING) ?? el;
      if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });

      const params = new URLSearchParams(search);
      if (params.get("focus") !== target) return;
      params.delete("focus");
      const rest = params.toString();
      navigate({ pathname, search: rest ? `?${rest}` : "", hash }, { replace: true, state });
    };

    const found = document.getElementById(target);
    if (found) {
      land(found);
      return;
    }
    const observer = new MutationObserver(() => {
      const el = document.getElementById(target);
      if (!el) return;
      observer.disconnect();
      window.clearTimeout(giveUp);
      land(el);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const giveUp = window.setTimeout(() => observer.disconnect(), WAIT_MS);
    return () => {
      observer.disconnect();
      window.clearTimeout(giveUp);
    };
    // `location`, a new object per navigation: the same hit picked twice is two
    // navigations, and rings twice.
  }, [target, location, navigate]);

  useEffect(
    () => () => {
      const current = ring.current;
      if (!current) return;
      window.clearTimeout(current.timer);
      current.el.classList.remove(...SETTINGS_FOCUS_RING);
      current.el.removeAttribute("data-settings-focus");
    },
    [],
  );
}
