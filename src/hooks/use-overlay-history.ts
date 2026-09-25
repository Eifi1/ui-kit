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
  /** The router's `idx` on this entry when the marker went on — see {@link locate}. */
  idx: number | undefined;
  /** The router's `key` copied from the page entry beneath ours. */
  key: string | undefined;
  /** {@link routeOf} the address the marker was placed at. */
  route: string;
}
const pushed: PushedEntry[] = [];

/**
 * Entries of ours that a ROUTER NAVIGATION made from inside the overlay has left
 * behind — ours, still in the history, but no longer on top and no longer anyone's.
 *
 * Nothing can take an entry out from under a newer one, so they cannot be unwound;
 * what can be done is to not let the user land on one. A traversal that comes to
 * rest on a buried entry is carried straight on over the whole run of them, in the
 * direction it was going (see `skipBuried`): Back from the new page lands on the page
 * the overlay was opened from, Forward from there lands on the new page, and no press
 * is spent on an entry with nothing on screen for it.
 *
 * `below` / `above` count the buried entries of the same run on either side. The
 * router's `idx` tells the direction apart — except after a REPLACE navigation, when
 * the page above the run shares the run's `idx`; the two keys decide there.
 */
interface BuriedEntry {
  idx: number;
  /** The `idx` of the router entry that buried the run: higher after a push, the
   *  same after a replace. */
  aboveIdx: number;
  /** The key of the page entry directly beneath the run. */
  belowKey: string | undefined;
  /** The key of the router entry that buried the run, when it did. */
  aboveKey: string | undefined;
  below: number;
  above: number;
}
const buried = new Map<string, BuriedEntry>();

/** The router `{idx, key}` of the entry the last traversal (or burial) left us on —
 *  what `skipBuried` compares against to know which way the user was going. */
let lastSeen: { idx: number | undefined; key: string | undefined } | null = null;

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
  if (currentSentinel() !== job.id || currentHref() !== job.href) {
    // A router navigation landed between the cleanup and this task: the entries
    // are under it (or were replaced by it) rather than simply forgotten.
    if (taggedSentinel() === null) buryUnder(job.entries);
    return;
  }
  pendingProgrammatic += 1;
  window.history.go(-job.entries.length);
}

function currentHref(): string {
  return typeof window === "undefined" ? "" : window.location.href;
}

/** The router's own `{idx, key}` on the current entry, where a router has put them. */
function routerMark(): { idx: number | undefined; key: string | undefined } {
  const state = typeof window !== "undefined" ? (window.history.state as unknown) : null;
  if (!state || typeof state !== "object") return { idx: undefined, key: undefined };
  const { idx, key } = state as Record<string, unknown>;
  return { idx: typeof idx === "number" ? idx : undefined, key: typeof key === "string" ? key : undefined };
}

/**
 * The part of an address that names the PAGE — the query string left out.
 *
 * A `setSearchParams(…, { replace: true })` rewrites the query on the entry the
 * overlay is standing on; that is a wipe to repair, not a move. Anything else changing
 * is a navigation. Under a hash router the page lives in the hash (`#/table?f.q=x`), so
 * a hash that starts with `#/` counts up to its own `?`; an ordinary `#fragment` does
 * not name a page and is left out.
 */
function routeOf(href: string): string {
  try {
    const url = new URL(href);
    const hashRoute = url.hash.startsWith("#/") ? url.hash.split("?")[0] : "";
    return url.origin + url.pathname + hashRoute;
  } catch {
    return href;
  }
}

/**
 * Is the untagged entry we are standing on still `p`'s — merely wiped by the router —
 * or an entry the router NAVIGATED to from inside the overlay?
 *
 * The router's `idx` is the one per-entry fact that separates the two, because it is
 * the one the router itself keeps straight: a replace leaves it as it was, a push adds
 * one. Our own push copies the page's state, so our entry carries the page's `idx` and
 * a router push on top of it carries one more. The key would not do — every replace
 * mints a new one, so the wipe this repair exists for would already fail it. Neither
 * would the address alone: a push to the address we are already at is still a push.
 *
 * `idx` does not see one move, the router REPLACING our entry with a different page
 * (same `idx`), so the page named by the address must also be unchanged. Where there is
 * no `idx` to compare (no router, or one that keeps none) the address is all there is.
 */
function isStillOn(p: PushedEntry): boolean {
  if (routeOf(currentHref()) !== p.route) return false;
  const { idx } = routerMark();
  return idx === undefined || p.idx === undefined || idx === p.idx;
}

/**
 * The router has navigated while our entries were on top: record which of `records`
 * (ours, oldest first, ending with the top one) it buried and which it replaced, and
 * drop them from `pushed` — none of them can be unwound any more. Returns whether it
 * recognised a navigation at all; when it cannot tell (no router `idx` to go by), it
 * leaves everything as it was and the caller falls back to marking the entry dead.
 */
function buryUnder(records: PushedEntry[]): boolean {
  const top = records[records.length - 1];
  const here = routerMark();
  if (!top || top.idx === undefined || here.idx === undefined) return false;
  let run: PushedEntry[];
  if (here.idx > top.idx) {
    run = [];
    for (let i = records.length - 1; i >= 0 && records[i].idx === top.idx; i -= 1) run.unshift(records[i]);
  } else if (here.idx === top.idx && !isStillOn(top)) {
    // Replaced: the top entry IS the new page now, and gone as ours. Those beneath it
    // are buried under it.
    run = [];
    for (let i = records.length - 2; i >= 0 && records[i].idx === top.idx; i -= 1) run.unshift(records[i]);
  } else {
    return false;
  }
  run.forEach((r, i) => {
    buried.set(r.id, {
      idx: top.idx as number,
      aboveIdx: here.idx as number,
      belowKey: run[0].key,
      aboveKey: here.key,
      below: i,
      above: run.length - 1 - i,
    });
  });
  for (const r of records) forgetPushed(r.id);
  lastSeen = here;
  return true;
}

/**
 * A traversal came to rest on one of our buried entries: carry it on over the run, the
 * way it was going. Back from above (a higher `idx`, or the very entry that buried us)
 * continues down to the page beneath; Forward from that page continues up. A landing
 * from anywhere this cannot place is left alone — one idle press is the price of not
 * guessing, and a wrong guess would move the user somewhere they did not ask to go.
 */
function skipBuried(from: typeof lastSeen): void {
  const tag = taggedSentinel();
  const rec = tag !== null ? buried.get(tag) : undefined;
  if (!rec || !from || stack.some((e) => e.id === tag)) return;
  let steps = 0;
  if ((from.idx !== undefined && from.idx > rec.idx) || (from.key !== undefined && from.key === rec.aboveKey)) {
    steps = -(rec.below + 1);
  } else if (
    from.idx !== undefined &&
    // Below the run, or level with it when nothing above it is (a push buried it),
    // or level with it and provably the page beneath (a replace buried it). The
    // router's first entry has no key at all, so an absent key is a key here.
    (from.idx < rec.idx || (from.idx === rec.idx && (rec.aboveIdx > rec.idx || from.key === rec.belowKey)))
  ) {
    steps = rec.above + 1;
  }
  if (steps === 0) return;
  pendingProgrammatic += 1;
  window.history.go(steps);
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
  //
  // And only an entry that is still the one the marker was placed on. A row that
  // NAVIGATES (a palette result, a dialog's link) has the router push the new page
  // before the overlay's cleanup runs; that entry carries no tag either, and
  // re-stamping it made the cleanup "unwind" the navigation itself — the page
  // changed and changed straight back. See `isStillOn` for how the two are told apart.
  const record = pushed.find((p) => p.id === standing);
  if (!record || !isStillOn(record)) {
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
  const from = lastSeen;
  lastSeen = routerMark();
  if (pendingProgrammatic > 0) {
    pendingProgrammatic -= 1;
    return;
  }
  closeOnPop();
  skipBuried(from);
}

function closeOnPop() {
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
      const was = inherited[inherited.length - 1];
      pushed.push({ id, href: currentHref(), dead: false, idx: was.idx, key: was.key, route: was.route });
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
      const page = routerMark();
      pushed.push({ id, href: currentHref(), dead: false, idx: page.idx, key: page.key, route: routeOf(currentHref()) });
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
        // A router navigation from inside the overlay: nothing to unwind — the
        // entries it left beneath the new page are skipped over instead.
        if (mine >= 0 && taggedSentinel() === null && buryUnder(pushed.slice(0, pushed.length))) return;
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
