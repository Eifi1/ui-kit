import { useEffect, useRef } from "react";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { toast } from "../components/toast";
import { isSharedComputer, type SharedComputerLabels } from "./shared-computer";
import { DEFAULT_SHARED_COMPUTER_LABELS } from "./shared-computer-labels";

/**
 * Signs an abandoned shared-computer session out: after `idleMinutes` (15) without input,
 * it calls the app's `onSignOut` (0.62, Marcel 2026-11-12; docs/local-first-harmonization.md
 * D6, docs/auth-harmonization.md §6.3). A minute before, a toast says so and offers "Stay
 * signed in".
 *
 * WHY THE CLIENT TOO, when the server already ends a shared session after 15 idle minutes
 * (server-kit 0.27's `SessionPolicy`): the server ends the SESSION, not what the open tab
 * shows. A tab left open on a library PC keeps the last person's pages on screen, and their
 * tokens in its memory, until something calls the server. This hook is that something.
 *
 * `onSignOut` is the app's ordinary sign-out (auth §6.3): this device's push dropped
 * (`dropPushSubscription`), the session ended on the server (`DELETE /auth/sessions/current`),
 * then the tokens and the person's traces dropped, then the sign-in page. It must drop the
 * tokens however the revoke ends: offline, or with the server's own limit already past.
 *
 * Input is a press, a key, a touch, a wheel, a moving pointer, or the tab shown again
 * (`visibilitychange` to visible, `pageshow` from the back-forward cache). While the warning
 * shows, a pointer only moving is not enough: the toast would slip away under the pointer
 * heading for its button.
 *
 * Counted per tab, on purpose: a shared-computer session is the tab's own (kept in its page
 * memory), and input in another tab may be the next person's, which must not keep an
 * abandoned tab alive.
 *
 * Mount it where the session is signed in (the authed shell), or pass
 * `enabled={signedIn && isSharedComputer()}`: it signs out once per run, and a run starts
 * again only when `enabled` turns true or the hook mounts anew. The toast needs a mounted
 * `<Toaster>`.
 */
export function useSharedComputerIdleSignOut({
  onSignOut,
  idleMinutes = 15,
  enabled,
  warn = true,
  labels: labelsProp,
}: SharedComputerIdleSignOutOptions): void {
  const labels = useKitLabels("sharedComputer", DEFAULT_SHARED_COMPUTER_LABELS, labelsProp);
  const on = enabled ?? isSharedComputer();
  // Read when they are needed, so a new function or language each render restarts nothing.
  const latest = useRef({ onSignOut, labels });
  useEffect(() => {
    latest.current = { onSignOut, labels };
  });

  useEffect(() => {
    if (!on) return;
    const idleMs = idleMinutes * MINUTE;
    // No warning when there is no minute to give one in.
    const warnAt = warn && idleMs > WARN_BEFORE_MS ? idleMs - WARN_BEFORE_MS : null;
    // The wall clock, not a timer's own count: a machine asleep or a tab frozen in the
    // background runs no timer, but the time still passed for whoever walks up to it.
    let last = Date.now();
    let warned = false;
    let ended = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const takeWarningDown = () => {
      if (!warned) return;
      warned = false;
      toast.dismiss(IDLE_TOAST_ID);
    };
    const end = () => {
      ended = true;
      clearTimeout(timer);
      takeWarningDown();
      void latest.current.onSignOut();
    };
    // The one timer. Input does not move it: it only notes the time, and the timer, once it
    // fires, sleeps again for whatever is left. A pointer stream then costs an assignment
    // per event, not a clearTimeout and a setTimeout.
    const schedule = () => {
      clearTimeout(timer);
      const due = last + (warnAt !== null && !warned ? warnAt : idleMs) - Date.now();
      timer = setTimeout(tick, Math.min(Math.max(0, due), MAX_DELAY_MS));
    };
    const tick = () => {
      const idle = Date.now() - last;
      if (idle >= idleMs) return end();
      if (warnAt !== null && !warned && idle >= warnAt) {
        warned = true;
        const words = latest.current.labels;
        toast(words.idleWarning, {
          id: IDLE_TOAST_ID,
          duration: Infinity,
          action: { label: words.staySignedIn, onClick: () => presence(false) },
        });
      }
      schedule();
    };
    const presence = (moveOnly: boolean) => {
      if (ended) return;
      const now = Date.now();
      // Back past the limit while no timer ran: the session was abandoned, whoever this is.
      if (now - last >= idleMs) return end();
      if (warned ? moveOnly : now - last < THROTTLE_MS) return;
      last = now;
      if (warned) {
        takeWarningDown();
        schedule();
      }
    };

    const onInput = (event: Event) => presence(event.type === "pointermove");
    const onShown = () => {
      if (document.visibilityState === "visible") presence(false);
    };
    // Back to this page from the back-forward cache: the page's memory, and so a shared
    // session kept there, came back with it, though the person may have left for another site
    // in this tab. Ended at once, as a reload ends it (0.62).
    const onPageShow = (event: PageTransitionEvent) => (event.persisted ? end() : presence(false));
    const listen = { capture: true, passive: true } as const;
    for (const type of INPUT_EVENTS) window.addEventListener(type, onInput, listen);
    document.addEventListener("visibilitychange", onShown);
    window.addEventListener("pageshow", onPageShow);
    schedule();
    return () => {
      ended = true;
      clearTimeout(timer);
      takeWarningDown();
      for (const type of INPUT_EVENTS) window.removeEventListener(type, onInput, listen);
      document.removeEventListener("visibilitychange", onShown);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [on, idleMinutes, warn]);
}

export interface SharedComputerIdleSignOutOptions {
  /** The app's sign-out: push dropped, this session ended on the server, then the tokens
   *  dropped whatever the server answered, then the sign-in page. Called once per run. */
  onSignOut: () => Promise<unknown> | void;
  /** Minutes without input. Default 15: server-kit 0.27's idle limit for a shared session,
   *  so the tab and the server end it together. */
  idleMinutes?: number;
  /** Default: {@link isSharedComputer}, read each render. Pass `signedIn && …` where the
   *  hook is mounted outside the signed-in shell. */
  enabled?: boolean;
  /** The toast a minute before, with "Stay signed in". Default `true`. */
  warn?: boolean;
  /** The `sharedComputer` namespace's `idleWarning` and `staySignedIn`. */
  labels?: LabelOverride<SharedComputerLabels>;
}

const MINUTE = 60_000;
/** The warning's lead, which its words name: "in a minute". */
const WARN_BEFORE_MS = MINUTE;
/** Input within a second of the last one noted is the same presence. */
const THROTTLE_MS = 1_000;
/** setTimeout's ceiling (2^31 − 1 ms, ~24.8 days): a longer delay would fire at once. */
const MAX_DELAY_MS = 2_147_483_647;
/** One warning at a time, replaced in place. */
const IDLE_TOAST_ID = "shared-computer-idle";
const INPUT_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;
