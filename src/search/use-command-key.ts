import { useHotkey, type UseHotkeyOptions } from "../hooks/use-hotkey";

/**
 * Registers a global ⌘K / Ctrl-K shortcut that calls `onOpen`.
 *
 * Its own module since 0.34 (MOD-1, refactor audit 2026-10): `GlobalSearch` listens for
 * the shortcut from the moment the top bar mounts but loads the palette only when it is
 * first opened, and a hook imported from command-palette.tsx would have brought the
 * palette along with it. Still exported from command-palette.tsx, where it always was.
 *
 * `useHotkey("Mod+K")` since 0.52 (refactor audit 2026-10-30, DUP-12): Cmd+K on a Mac,
 * Ctrl+K elsewhere, with no other modifier, once per press. Hand-rolled, it took Ctrl+K
 * on a Mac as well — a text field's kill-line there — and Ctrl+Shift+K, Cmd+Alt+K and
 * every repeat of a held key. It still fires from inside a text field: the palette is
 * where a search starts, whatever has focus.
 *
 * `enabled: false` lets Mod+K go (0.52 code review, global-search.tsx): `GlobalSearch
 * shortcut={false}` passed a no-op, and the listener still cancelled every Mod+K — the
 * browser's own Ctrl+K and any other handler on the page that checks `defaultPrevented`.
 */
export function useCommandKey(onOpen: () => void, options: Pick<UseHotkeyOptions, "enabled"> = {}): void {
  useHotkey("Mod+K", () => onOpen(), { allowInInputs: true, enabled: options.enabled });
}
