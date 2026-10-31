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
  /** `DevMenu` (0.51, docs/top-bar-harmonization.md §2.7.1): the one flask — the role,
   *  the plan, then the app's own dev sections. Fill it only behind
   *  `import.meta.env.DEV`, so a production build drops the branch. (0.42's
   *  `DevSwitchers` was a DevMenu with no sections; removed in 0.52.) */
  dev?: ReactNode;
  /** kastlan's platform button. */
  platform?: ReactNode;
  /** 0.46 (docs/notifications-harmonization.md §10.1): `NotificationBell`, right before the
   *  account menu. Optional per app: an app shows the bell or an unread dot on the avatar,
   *  never both (keksdose keeps its dot and leaves this empty). */
  notifications?: ReactNode;
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
  "notifications",
  "account",
  "language",
  "signIn",
] as const satisfies readonly (keyof TopBarActionsProps)[];

const present = (node: ReactNode) => node !== undefined && node !== null && node !== false && node !== "";

/**
 * The top bar's actions in the one order every app shares (§2.1): company switcher ·
 * Search · Theme · Feedback · Tours (· Assistant) · Sync · dev role · dev plan · platform ·
 * notifications (the bell, 0.46) · account menu — and, signed out, Language · Sign in where the account menu goes (§6.6).
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
