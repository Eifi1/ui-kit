import { Inbox, MessageSquare } from "lucide-react";
import type { UserAvatarBadge } from "../components/user-avatar";
import { useKitLabels } from "../i18n/kit-labels";
import { TopBarActionMenu, type TopBarMenuEntry } from "../shell/topbar-action-menu";
import { FEEDBACK_CATEGORY_META, type FeedbackCategory } from "./feedback-inbox";
import { useFeedbackCategoryLabels } from "./feedback-labels";
import { FEEDBACK_PICKABLE_CATEGORIES } from "./feedback-record";

/**
 * `feedbackMenu` — the top-bar feedback menu's own words (0.27.0). The four category rows
 * are `feedbackCategory`'s, shared with the badges and the dialog's picker. de-CH canon
 * (keksdose `de-CH.json`): `trigger` "Feedback senden", `myFeedback` "Mein Feedback",
 * `viewFeedback` "Feedback ansehen".
 */
export interface FeedbackMenuLabels {
  /** The trigger's accessible name, and the menu's. keksdose `feedback.send`. */
  trigger: string;
  /** The link to the reporter's own reports — everyone but an admin. keksdose
   *  `feedback.my_title`. */
  myFeedback: string;
  /** The link to the inbox — an admin's one list link, in place of "My feedback".
   *  keksdose `feedback.view_all`. */
  viewFeedback: string;
}

export const DEFAULT_FEEDBACK_MENU_LABELS: FeedbackMenuLabels = {
  trigger: "Send feedback",
  myFeedback: "My feedback",
  viewFeedback: "View feedback",
};

export interface FeedbackMenuProps {
  /** A category row was chosen — open the submit dialog on it (`useFeedbackSubmit`'s
   *  `open`). Never called with `CRASH`: there is no row for it. */
  onFile: (category: FeedbackCategory) => void;
  /** The list link is "View feedback" → {@link inboxHref} INSTEAD of "My feedback" (§4.1,
   *  keksdose `top-bar.tsx:205-214`). The admin check is the app's (kastlan's is
   *  company-scoped). Default `false`. */
  isAdmin?: boolean;
  /**
   * Rows of the app's own, between the divider and the list link — keksdose's
   * `Sparkles` Help assistant → `/assistant` and `MessagesSquare` Support chat →
   * `/support` with its unread chip. Any {@link TopBarMenuEntry}; keep their `key`s clear
   * of the menu's own (`BUG`, `IDEA`, `QUESTION`, `OTHER`, `feedback-divider`,
   * `my-feedback`, `view-feedback`).
   */
  extraEntries?: TopBarMenuEntry[];
  /** The user's own reports, linked for everyone but an admin. Default `"/my-feedback"`
   *  (§2.3). */
  myFeedbackHref?: string;
  /** The admin inbox, linked for an admin. Default `"/feedback"` (§2.3). */
  inboxHref?: string;
  /** A dot on the trigger — keksdose's unread support replies (`tone: "danger"`). Its
   *  `label` joins the trigger's name ("Send feedback 2 unread"). The words are the app's. */
  iconBadge?: UserAvatarBadge | null;
  /** Prop > `<UiKitProvider labels={{ feedbackMenu }}>` > English. */
  labels?: Partial<FeedbackMenuLabels>;
  /** Which edge of the trigger the panel lines up with. Default `end`. */
  align?: "start" | "end" | "left" | "right";
}

/**
 * The top-bar feedback menu, the same in every app (0.27.0, docs/feedback-harmonization.md
 * §4.1) — keksdose `frontend/src/app/top-bar.tsx:156` on the kit's `TopBarActionMenu`:
 *
 * 1. a `MessageSquare` trigger named "Send feedback", with an optional `iconBadge`;
 * 2. Bug · Idea · Question · Other (`Bug`, `Lightbulb`, `HelpCircle`, `MoreHorizontal` —
 *    the category badges' own glyphs), each calling `onFile(category)`;
 * 3. a divider, always;
 * 4. the app's `extraEntries`;
 * 5. ONE list link, `Inbox`: an admin's is "View feedback" → `/feedback`, everyone
 *    else's "My feedback" → `/my-feedback` — keksdose's (`top-bar.tsx:205-214`, feedback
 *    #331: admins get the management view, everyone else their own submissions).
 *
 * WHY A PRESET. Three apps had drawn three menus on the same primitive and they disagreed:
 * kastlan headed it "New submission", Kurvenschmiede "Send feedback" with a single link
 * that changed its words by role, keksdose had no heading and one link by role. keksdose
 * is the source (§2.4, §7.11): no heading, one link — the inbox for an admin, who reaches
 * their own reports there too — and the kit draws it, so the row order, the icons and the
 * words cannot drift again. Where the menu sits in the bar stays each app's.
 *
 * `CRASH` has no row and never will: crash reports are filed by the error boundary with
 * the stack and a fingerprint (keksdose feedback #160), and a hand-filed "crash" would sort
 * to the top like one with none of what makes it actionable. The server refuses it with a
 * 422 anyway (§3.4).
 *
 * The menu forwards nothing to its trigger, as `TopBarActionMenu` does not: keksdose's
 * tour anchor (`data-tour="feedback-menu"`) stays on a wrapping `<span>`. Needs a router,
 * as every `TopBarActionMenu` with link rows does.
 */
export function FeedbackMenu({
  onFile,
  isAdmin = false,
  extraEntries,
  myFeedbackHref = "/my-feedback",
  inboxHref = "/feedback",
  iconBadge,
  labels: labelsProp,
  align,
}: FeedbackMenuProps) {
  const labels = useKitLabels("feedbackMenu", DEFAULT_FEEDBACK_MENU_LABELS, labelsProp);
  const categoryLabels = useFeedbackCategoryLabels();
  const entries: TopBarMenuEntry[] = [
    ...FEEDBACK_PICKABLE_CATEGORIES.map((category): TopBarMenuEntry => {
      const Icon = FEEDBACK_CATEGORY_META[category].icon;
      return {
        key: category,
        icon: <Icon className="size-4" />,
        label: categoryLabels[category],
        onSelect: () => onFile(category),
      };
    }),
    { kind: "divider", key: "feedback-divider" },
    ...(extraEntries ?? []),
    {
      kind: "link",
      key: isAdmin ? "view-feedback" : "my-feedback",
      to: isAdmin ? inboxHref : myFeedbackHref,
      icon: <Inbox className="size-4" />,
      label: isAdmin ? labels.viewFeedback : labels.myFeedback,
    },
  ];
  return (
    <TopBarActionMenu
      icon={<MessageSquare className="size-5" />}
      iconBadge={iconBadge}
      ariaLabel={labels.trigger}
      entries={entries}
      align={align}
    />
  );
}
