import { useEffect, useRef } from "react";

/**
 * Back closes the overlay, not the page (Keksdose feedback #172).
 *
 * On a phone the Back gesture is the universal "dismiss this" — so a dialog or a
 * full-screen search surface that ignores it doesn't merely fail to close: the
 * navigation lands somewhere else entirely, and on a route with nothing beneath it
 * that means leaving the app with the overlay still notionally open.
 *
 * The mechanism is one throwaway, SAME-URL history entry pushed while the overlay is
 * up. Back then pops a same-document entry — no route change, no re-render of the
 * page under it — and this hook turns that pop into `onClose()`. Same trick the
 * transactions page already uses for its unsaved-edit trap
 * (`use-soft-leave-guard.ts`); the two coexist because they use different marker
 * keys AND because `handlePop` only claims a pop that actually consumed OUR entry
 * — a foreign sentinel stacked on top of ours pops back ONTO us, and an overlay
 * that closed on that would vanish mid-edit (feedback #424/#426).
 *
 * Not a URL parameter, deliberately. Encoding "a dialog is open" in the address bar
 * makes it shareable and restorable, which is wrong for the overlays this covers —
 * nobody wants to send someone a link that opens a confirm dialog — and it would
 * fight the page-owned `?row=` / `f.*` params that ARE meaningful state.
 *
 * ## Ordering
 *
 * The stack is module-level because correctness here is about order ACROSS
 * instances: every mounted overlay hears the same `popstate`, but only the one whose
 * entry was actually popped may close. Overlays nest and unwind last-in-first-out —
 * a dialog opened from a search surface closes before the surface — so the top of
 * this stack is by construction the entry the browser just popped.
 *
 * ## Not undoing a real navigation
 *
 * The cleanup pops our entry when the overlay closes some other way (a button,
 * Escape, a backdrop click) so history doesn't silently accumulate dead entries. It
 * first checks that our marker is still the CURRENT entry: if the user followed a
 * link while the overlay was open, the router has pushed on top of us, and a blind
 * `history.back()` there would undo their navigation.
 */
const SENTINEL_KEY = "__hbUiOverlayHistory";

interface OverlayEntry {
  id: string;
  close: () => void;
}

const stack: OverlayEntry[] = [];

/**
 * The sentinels we have PUSHED and not yet unwound, oldest first.
 *
 * The stack above tracks live overlays; this tracks live history entries, and the
 * two come apart in exactly one case — which is the bug this list exists for.
 * Nested overlays that close in the same commit unwind parent-first, so the dialog's
 * cleanup runs while the sheet's entry is still on top of its own. It cannot call
 * `history.back()` there (that would consume the SHEET's entry, and the sheet is
 * about to consume it itself), so its entry was simply abandoned: a husk with no
 * live owner sitting between the user and the page.
 *
 * The user paid for it on the next Back press. It popped the husk, `handlePop` found
 * an empty stack and returned, and nothing visible happened — Back had to be pressed
 * twice to leave the page.
 *
 * So an abandoned entry is recorded as `dead` instead, and whichever overlay DOES
 * get to unwind pays the debt with a single `history.go(-n)`. `href` is what keeps
 * that safe: only dead entries pushed at the address we are still sitting at are
 * unwound, so a router navigation that landed between two sentinels is never
 * reversed on the user's behalf.
 */
interface PushedEntry {
  id: string;
  href: string;
  /** Its overlay is gone but the entry is not — someone above owes this pop. */
  dead: boolean;
}
const pushed: PushedEntry[] = [];

/** Entries a real Back press already consumed. Their overlay's cleanup still has to
 *  run, and it must not mistake "my entry is not current" for "my entry is buried"
 *  — it has no entry left at all. */
const consumed = new Set<string>();

/** Pops WE caused (a cleanup unwinding its own entries) — their `popstate` is
 *  bookkeeping, not a user gesture, and must not close a second overlay. A
 *  `history.go(-n)` traversal fires exactly ONE popstate however far it travels. */
let pendingProgrammatic = 0;
let listening = false;
let nextId = 0;

function currentHref(): string {
  return typeof window === "undefined" ? "" : window.location.href;
}

function forgetPushed(id: string): void {
  const at = pushed.findIndex((p) => p.id === id);
  if (at >= 0) pushed.splice(at, 1);
}

function currentSentinel(): string | null {
  const state = typeof window !== "undefined" ? window.history.state : null;
  if (!state || typeof state !== "object") return null;
  const id = (state as Record<string, unknown>)[SENTINEL_KEY];
  return typeof id === "string" ? id : null;
}

function handlePop() {
  if (pendingProgrammatic > 0) {
    pendingProgrammatic -= 1;
    return;
  }
  // Nothing open → an ordinary navigation, which is none of our business.
  const top = stack[stack.length - 1];
  if (!top) return;
  // We landed back ON the top overlay's own entry, so that entry was NOT what the
  // pop consumed — something stacked ABOVE it was (Keksdose feedback #424/#426).
  // The app layers a second same-URL sentinel of its own on top of ours for the
  // unsaved-edit trap (`use-soft-leave-guard.ts`), and it pops that sentinel every
  // time the form goes back to clean — twice-toggling one field was enough to
  // close the whole dialog. A pop is only ours when the entry we came to rest on
  // is no longer ours: either the layer below (a different overlay's marker) or
  // the plain page entry (none at all).
  if (currentSentinel() === top.id) return;
  stack.pop();
  // The browser consumed this entry, so the overlay's own cleanup has nothing left
  // to unwind and nothing to record as owed.
  consumed.add(top.id);
  forgetPushed(top.id);
  top.close();
}

function ensureListening() {
  if (listening || typeof window === "undefined") return;
  window.addEventListener("popstate", handlePop);
  listening = true;
}

/**
 * Make the platform Back gesture dismiss an overlay.
 *
 * @param open      whether the overlay is currently showing. Components that mount
 *                  only while open (the common case) pass `true`.
 * @param onClose   the overlay's own close handler — the same one Escape calls.
 */
export function useOverlayHistory(open: boolean, onClose: () => void): void {
  // The listener fires outside React's render, so it reads the latest handler
  // through a ref rather than through the closure the effect captured.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    ensureListening();
    const id = `overlay-${(nextId += 1)}`;
    const entry: OverlayEntry = { id, close: () => closeRef.current() };
    stack.push(entry);
    const prev = window.history.state;
    // Preserve react-router's own `{usr,key,idx}` — we only tack a marker on, and
    // the URL is unchanged, so the router treats popping this as a no-op re-render.
    window.history.pushState(
      { ...(prev && typeof prev === "object" ? prev : {}), [SENTINEL_KEY]: id },
      "",
    );
    pushed.push({ id, href: currentHref(), dead: false });
    return () => {
      const at = stack.indexOf(entry);
      if (at >= 0) stack.splice(at, 1);

      // A Back press already took this entry; there is nothing to unwind or to owe.
      if (consumed.delete(id)) return;

      const mine = pushed.findIndex((p) => p.id === id);
      // Only unwind an entry that is still THE current one. If a router push landed
      // on top of it, going back would undo the user's navigation instead — and if
      // a SIBLING overlay's sentinel landed on top, that overlay is about to unwind
      // and is the one that can take ours with it.
      if (currentSentinel() !== id) {
        if (mine >= 0) pushed[mine].dead = true;
        return;
      }

      // Ours plus every abandoned entry lying directly beneath it at this address.
      // One traversal, so one popstate, so one programmatic pop to absorb.
      const here = currentHref();
      let steps = 1;
      while (steps <= mine && pushed[mine - steps].dead && pushed[mine - steps].href === here) {
        steps += 1;
      }
      pushed.splice(mine - (steps - 1), steps);
      pendingProgrammatic += 1;
      window.history.go(-steps);
    };
  }, [open]);
}
