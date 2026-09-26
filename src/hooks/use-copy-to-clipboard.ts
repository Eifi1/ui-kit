import { useCallback, useEffect, useRef, useState } from "react";

export type CopyState = "idle" | "copied" | "failed";

export interface UseCopyToClipboardOptions {
  /** How long `copied` / `failed` stays up before the state returns to `idle`, in
   *  ms. `0` keeps it until the next copy or {@link UseCopyToClipboardReturn.reset}. */
  resetAfter?: number;
}

export interface UseCopyToClipboardReturn {
  state: CopyState;
  /** Copy `text`. Resolves to whether it actually reached the clipboard — the same
   *  answer `state` gives, for a caller that wants to act on it directly. */
  copy: (text: string) => Promise<boolean>;
  reset: () => void;
}

/**
 * The legacy path: select a throwaway `<textarea>` and ask the document to copy it.
 *
 * `navigator.clipboard` exists only in a secure context, so an app opened over plain
 * http on a LAN address (how keksdose is tested on a phone) has no Clipboard API at
 * all. `execCommand("copy")` is deprecated but still implemented everywhere, and it
 * answers with a boolean, which is all this needs. Focus and the user's selection are
 * put back afterwards: copying must not move the keyboard.
 */
function legacyCopy(text: string): boolean {
  if (typeof document === "undefined" || typeof document.execCommand !== "function") return false;
  const active = document.activeElement as HTMLElement | null;
  const selection = document.getSelection();
  const ranges: Range[] = [];
  if (selection) for (let i = 0; i < selection.rangeCount; i++) ranges.push(selection.getRangeAt(i));

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  // Off-screen but rendered: a `display: none` textarea cannot be selected.
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.insetInlineStart = "-9999px";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let ok: boolean;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  if (selection) {
    selection.removeAllRanges();
    for (const r of ranges) selection.addRange(r);
  }
  active?.focus?.();
  return ok;
}

/** Copy `text`, by the Clipboard API when there is one and the legacy path when
 *  there is not — or when the API refuses (a denied permission, a document that is
 *  not focused). Never throws. */
export async function copyToClipboard(text: string): Promise<boolean> {
  const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
  if (clipboard && typeof clipboard.writeText === "function") {
    try {
      await clipboard.writeText(text);
      return true;
    } catch {
      // Fall through: the API exists but refused. The legacy path sometimes succeeds
      // where the permission prompt was dismissed.
    }
  }
  return legacyCopy(text);
}

/**
 * Copy text and KNOW whether it worked.
 *
 * keksdose had two copy buttons that flipped to "Copied" on click and never looked at
 * the promise — so on the http LAN build, where there is no Clipboard API, they
 * confirmed a copy that had not happened. The state here is set from the result, and
 * a failure is a state of its own rather than a quiet return to idle.
 */
export function useCopyToClipboard({ resetAfter = 2000 }: UseCopyToClipboardOptions = {}): UseCopyToClipboardReturn {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setState("idle");
  }, []);

  const copy = useCallback(
    async (text: string) => {
      if (timer.current) clearTimeout(timer.current);
      const ok = await copyToClipboard(text);
      if (!mounted.current) return ok;
      setState(ok ? "copied" : "failed");
      if (resetAfter > 0) {
        timer.current = setTimeout(() => {
          timer.current = null;
          setState("idle");
        }, resetAfter);
      }
      return ok;
    },
    [resetAfter],
  );

  return { state, copy, reset };
}
