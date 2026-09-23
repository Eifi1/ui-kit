import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Announce a state change that produces no focus change.
 *
 * Sorting a column, applying a filter, moving to the next page: the rows under the
 * cursor silently become different rows, and nothing tells a screen-reader user. There
 * is no focus move to carry the news, because the control they activated is still the
 * control they are on. A live region is the only channel.
 *
 * Two details that are the whole reason this is a hook rather than a `<div aria-live>`
 * written inline at each call site:
 *
 *  1. **The region must already be in the DOM before the message arrives.** Screen
 *     readers subscribe to a live region when they encounter it; a region that mounts
 *     *with* its first message is usually missed entirely. So `regionProps` is spread
 *     onto an element that renders empty from the start and never unmounts.
 *  2. **Re-announcing the same string must still speak.** Assistive tech diffs the
 *     region's content, so setting "12 results" when it already says "12 results" is a
 *     no-op — which is exactly the case that matters when a user re-applies a filter
 *     and needs confirmation that something happened. Clearing first and setting on the
 *     next tick forces a diff.
 */

export interface AnnounceRegionProps {
  role: "status" | "alert";
  "aria-live": "polite" | "assertive";
  "aria-atomic": true;
  /** `sr-only-fixed` — visually hidden without inflating the document height. */
  className: string;
  children: string;
}

export interface UseAnnounceReturn {
  /** Speak `message`. Passing the same string twice still speaks twice. */
  announce: (message: string) => void;
  /** Spread onto an element that is rendered unconditionally. */
  regionProps: AnnounceRegionProps;
}

export interface UseAnnounceOptions {
  /**
   * `polite` (default) waits for a pause; `assertive` interrupts. Sorting and paging
   * are polite — interrupting someone mid-sentence to tell them a table re-sorted is
   * worse than telling them a moment later. Reserve assertive for failures.
   */
  politeness?: "polite" | "assertive";
}

export function useAnnounce({ politeness = "polite" }: UseAnnounceOptions = {}): UseAnnounceReturn {
  const [message, setMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const announce = useCallback((next: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    // Clear, then set on a later tick. A 0ms timeout is enough: it puts the two
    // mutations in separate frames, which is what makes the second one a diff.
    setMessage("");
    timerRef.current = setTimeout(() => setMessage(next), 50);
  }, []);

  return {
    announce,
    regionProps: {
      role: politeness === "assertive" ? "alert" : "status",
      "aria-live": politeness,
      // Read the whole region, not just the changed words — "Page 3 of 14" is a
      // sentence, and an atomic=false region can announce a bare "3".
      "aria-atomic": true,
      // `sr-only-fixed`, not `sr-only`: this region is rendered by the KIT inside a
      // consumer's component, so there is no wrapper we can require to be `relative`.
      // Tailwind's `sr-only` is `position: absolute` and would extend the document
      // height from wherever it landed — see the note on the class in tokens.css.
      className: "sr-only-fixed",
      children: message,
    },
  };
}
