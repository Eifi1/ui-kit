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
 *
 * ## The traversal is deferred
 *
 * And it is *scheduled* rather than issued, because `history.go()` lands a task
 * later while everything this module knows is written synchronously. See
 * {@link Unwind}: an overlay opening inside that window adopts the entry instead
 * of stacking a second one on it, which is what makes the hook survive React
 * StrictMode's mount → clean up → mount (steering-design feedback #49).
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

/**
 * The unwind a cleanup has asked for and not yet issued.
 *
 * **`history.go()` is asynchronous and everything above is written
 * synchronously**, which is the seam the whole of this block exists to close.
 * The traversal lands a task later, so an overlay that opens in the *same* tick
 * as one that closed used to push its sentinel on top of the entry that was
 * about to be popped — and the pop then took the NEW entry. The overlay left on
 * screen had no entry of its own (so Back no longer closed it) and the old one
 * stayed behind as a husk between the user and their page.
 *
 * That is not an exotic race. **React StrictMode remounts every effect** — mount,
 * clean up, mount again, all in one commit — so in development *every* dialog
 * anyone opened left a husk behind, the position drifted one entry further from
 * the page on each open, and the Back press that was meant to leave the page was
 * spent on something invisible instead (steering-design feedback #49).
 *
 * So the traversal is deferred by a task, and an overlay mounting inside that
 * window **adopts** the entry instead of pushing a second one (see the effect).
 * Adoption is `replaceState` on an entry that is already there: no traversal, no
 * window in which the count can be wrong, and the StrictMode remount costs
 * exactly nothing.
 */
interface Unwind {
  timer: ReturnType<typeof setTimeout>;
  /** The sentinel on the entry to leave — the top of `entries`. */
  id: string;
  href: string;
  /** That entry plus the abandoned ones directly beneath it, oldest first. */
  entries: PushedEntry[];
}
let unwind: Unwind | null = null;

/** Issue the deferred traversal, if the ground has not moved under it.
 *
 *  A real Back press or a router navigation during the deferred task leaves us
 *  somewhere that is not the entry we meant to leave, and going back from there
 *  would take something that is not ours. The entries are then simply forgotten
 *  rather than handed back as `dead`: a forgotten entry costs one dead Back
 *  press, while an over-counted one costs the user a navigation they did make. */
function runUnwind(): void {
  const job = unwind;
  unwind = null;
  if (!job) return;
  if (currentSentinel() !== job.id || currentHref() !== job.href) return;
  pendingProgrammatic += 1;
  window.history.go(-job.entries.length);
}

function currentHref(): string {
  return typeof window === "undefined" ? "" : window.location.href;
}

function forgetPushed(id: string): void {
  const at = pushed.findIndex((p) => p.id === id);
  if (at >= 0) pushed.splice(at, 1);
}

/**
 * The sentinel this module believes is on the entry we are standing on.
 *
 * `history.state` is where the tag physically sits, because it is the only
 * per-entry storage a browser has — but it is not this module's storage, so
 * since the 2026-09-22 audit it is no longer read as the last word.
 * The ROUTER owns that object and writes it WHOLE: every
 * `setSearchParams(…, { replace: true })` stamps `{usr, key, idx}` over
 * whatever was there. A `DataTable` with `urlSync` does exactly that, on mount
 * and on every filter change — so an overlay opened from such a table had its
 * tag wiped off the entry it was standing on, and then:
 *
 *  * its cleanup read "not my entry" and abandoned a live entry as a husk;
 *  * the push path below could not find itself in `pushed`, so it discarded
 *    every record it had (`splice(0)`) and nothing was ever unwound again;
 *  * the StrictMode adoption never matched, so in development every dialog
 *    pushed a second entry and the deferred `go(-1)` ate the live one — which
 *    is Back no longer closing the overlay at all.
 *
 * So `standing` answers when the tag is gone: a MISSING tag on an entry we have
 * not left is a wipe to repair rather than a verdict. The tag is still read
 * FIRST wherever it is there, because it is the one thing that can see a FOREIGN
 * same-URL entry stacked above ours (feedback #424/#426, below) — module-level
 * bookkeeping cannot, since nobody tells us about someone else's `pushState`.
 */
let standing: string | null = null;

/** The tag actually on the current entry, with no repair and no belief. */
function taggedSentinel(): string | null {
  const state = typeof window !== "undefined" ? window.history.state : null;
  if (!state || typeof state !== "object") return null;
  const id = (state as Record<string, unknown>)[SENTINEL_KEY];
  return typeof id === "string" ? id : null;
}

/** Put our tag back on the current entry, keeping whatever the router has since
 *  written there — we are a passenger in that object, not its owner. */
function retag(id: string): void {
  const prev = window.history.state;
  window.history.replaceState(
    { ...(prev && typeof prev === "object" ? prev : {}), [SENTINEL_KEY]: id },
    "",
  );
}

function currentSentinel(): string | null {
  const tag = taggedSentinel();
  if (tag !== null) {
    standing = tag;
    return tag;
  }
  if (standing === null || typeof window === "undefined") return null;
  // Only ever re-stamp an entry we still hold a record for. Without that guard a
  // belief left over from an overlay that is long gone — a tab that has since
  // navigated, a test file that ran another case — would be stamped onto a
  // stranger's entry, and the next cleanup would traverse off it.
  if (!pushed.some((p) => p.id === standing)) {
    standing = null;
    return null;
  }
  retag(standing);
  return standing;
}

function handlePop() {
  // A pop MOVES us, so the belief is stale by definition: re-read it from the
  // entry we have landed on before anything below consults it, or the repair in
  // `currentSentinel` would stamp the entry we just left onto the one we are on.
  standing = taggedSentinel();
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
    const marked = { ...(prev && typeof prev === "object" ? prev : {}), [SENTINEL_KEY]: id };
    // An entry that is on its way out and that we are still standing on is ours
    // to take over: same URL, same slot, only the marker changes. Pushing a
    // second one on top of it is what used to leave a husk on every StrictMode
    // remount — see {@link Unwind}.
    const adopting = unwind && unwind.id === currentSentinel() && unwind.href === currentHref();
    if (adopting && unwind) {
      clearTimeout(unwind.timer);
      const inherited = unwind.entries;
      unwind = null;
      // Preserve react-router's own `{usr,key,idx}` — we only swap the marker,
      // and the entry we are swapping it on is the one the router is already on.
      window.history.replaceState(marked, "");
      // The abandoned ones beneath come back owed; ours takes the top slot.
      for (const owed of inherited.slice(0, -1)) pushed.push({ ...owed, dead: true });
      pushed.push({ id, href: currentHref(), dead: false });
      standing = id;
    } else {
      // A push DESTROYS every entry ahead of the one we are on, so anything we
      // still had recorded above our own position is gone. Kept, those would be
      // counted into a later `history.go(-n)` and the overshoot would come out
      // of a navigation the user actually made. Where we cannot tell which of
      // ours are beneath us — we are standing on a plain page entry, or on a
      // husk nobody tracks — none of them can be proven to be, so none survive.
      const under = pushed.findIndex((p) => p.id === currentSentinel());
      pushed.splice(under + 1);
      // Preserve react-router's own `{usr,key,idx}` — we only tack a marker on, and
      // the URL is unchanged, so the router treats popping this as a no-op re-render.
      window.history.pushState(marked, "");
      pushed.push({ id, href: currentHref(), dead: false });
      standing = id;
    }
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
      const leaving = pushed.splice(mine - (steps - 1), steps);
      // Scheduled, not issued: an overlay opening in this same tick takes the
      // entry over instead, which is what makes the hook survive a StrictMode
      // remount. An unwind already waiting is dropped rather than merged — it
      // was the entry ABOVE ours and something has since moved off it, so its
      // count can no longer be proven, and an over-counted traversal costs a
      // navigation the user made while an under-counted one costs one dead Back.
      if (unwind) clearTimeout(unwind.timer);
      unwind = { timer: setTimeout(runUnwind, 0), id, href: here, entries: leaving };
    };
  }, [open]);
}
