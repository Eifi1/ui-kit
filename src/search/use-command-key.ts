import { useEffect } from "react";

/**
 * Registers a global ⌘K / Ctrl-K shortcut that calls `onOpen`.
 *
 * Its own module since 0.34 (MOD-1, refactor audit 2026-10): `GlobalSearch` listens for
 * the shortcut from the moment the top bar mounts but loads the palette only when it is
 * first opened, and a hook imported from command-palette.tsx would have brought the
 * palette along with it. Still exported from command-palette.tsx, where it always was.
 */
export function useCommandKey(onOpen: () => void): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        onOpen();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onOpen]);
}
