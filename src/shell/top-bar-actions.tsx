import { Fragment } from "react";
import type { ReactNode } from "react";

/**
 * The top bar's items by name (docs/top-bar-harmonization.md §2.1, §6.6). Each is the
 * app's own node — a kit part or its own — and any may be left out.
 */
export interface TopBarActionsProps {
  /** kastlan's `CompanySwitcher`: the context, first. */
  companySwitcher?: ReactNode;
  /** `GlobalSearch` (⌘K). */
  search?: ReactNode;
  /** `ThemeToggle`. */
  theme?: ReactNode;
  /** `FeedbackMenu`. */
  feedback?: ReactNode;
  /** `TourMenu`. */
  tours?: ReactNode;
  /** kastlan's assistant, beside the tours while it is on. */
  assistant?: ReactNode;
  /** `SyncStatusIndicator`. */
  sync?: ReactNode;
  /** `DevSwitchers` (role, then plan). */
  dev?: ReactNode;
  /** kastlan's platform button. */
  platform?: ReactNode;
  /** The account menu. When it is set the signed-out slots are not drawn. */
  account?: ReactNode;
  /** Signed out (§6.6): the bar's `LanguageMenu`, since there is no account menu to hold
   *  the language. Drawn only without `account`. */
  language?: ReactNode;
  /** Signed out (§6.6): the "Sign in" button, where the account menu would be. Drawn only
   *  without `account`. */
  signIn?: ReactNode;
}

/** §2.1's order, then the signed-out pair in the account menu's place. */
export const TOP_BAR_ACTION_ORDER = [
  "companySwitcher",
  "search",
  "theme",
  "feedback",
  "tours",
  "assistant",
  "sync",
  "dev",
  "platform",
  "account",
  "language",
  "signIn",
] as const satisfies readonly (keyof TopBarActionsProps)[];

const present = (node: ReactNode) => node !== undefined && node !== null && node !== false && node !== "";

/**
 * The top bar's actions in the one order every app shares (§2.1): company switcher ·
 * Search · Theme · Feedback · Tours (· Assistant) · Sync · dev role · dev plan · platform ·
 * account menu — and, signed out, Language · Sign in where the account menu goes (§6.6).
 * The app fills the slots it has; an empty slot is skipped, so it leaves no gap.
 *
 * It draws a fragment, no box of its own: hand it to `TopBar`'s `actions`, whose row
 * spaces the items.
 *
 * ```tsx
 * <TopBar brand={…} actions={<TopBarActions search={…} theme={…} tours={…} account={…} />} />
 * ```
 */
export function TopBarActions(props: TopBarActionsProps) {
  const signedOut = !present(props.account);
  return (
    <>
      {TOP_BAR_ACTION_ORDER.map((slot) => {
        if ((slot === "language" || slot === "signIn") && !signedOut) return null;
        const node = props[slot];
        return present(node) ? <Fragment key={slot}>{node}</Fragment> : null;
      })}
    </>
  );
}
