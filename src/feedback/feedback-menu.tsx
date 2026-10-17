import { Inbox, MessageSquare, User, Users } from "lucide-react";
import type { UserAvatarBadge } from "../components/user-avatar";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { TopBarActionMenu, type TopBarMenuEntry } from "../shell/topbar-action-menu";
import type { HoverMenuProps } from "../components/hover-menu";
// The vocabulary module, not the inbox: this menu is in every app's top bar, the inbox
// is a page (MOD-1).
import { FEEDBACK_CATEGORY_META, type FeedbackCategory } from "./feedback-vocabulary";
import { useFeedbackCategoryLabels } from "./feedback-labels";
import { FEEDBACK_PICKABLE_CATEGORIES } from "./feedback-record";
import { DEFAULT_FEEDBACK_MENU_LABELS } from "./feedback-menu-labels";

/**
 * `feedbackMenu` — the top-bar feedback menu's own words (0.27.0). The four category rows
 * are `feedbackCategory`'s, shared with the badges and the dialog's picker. de-CH canon
 * (keksdose `de-CH.json`, §10.6): `trigger` "Feedback senden", `discussion`
 * "Feedback-Diskussion", `myFeedback` "Mein Feedback", `inbox` "Feedback-Eingang".
 */
export interface FeedbackMenuLabels {
  /** The trigger's accessible name, and the menu's. keksdose `feedback.send`. */
  trigger: string;
  /** The link to the viewer's own reports — everyone's, an admin's too since 0.40
   *  (§10.2 decision 3). keksdose `feedback.my_title`. */
  myFeedback: string;
  /** 0.40: the link to the public list, {@link FeedbackMenuProps.publicHref} (§10.2
   *  decision 3; "All feedback" before). de-CH "Feedback-Diskussion". */
  discussion: string;
  /** 0.40: the admin's link to the triage list, {@link FeedbackMenuProps.inboxHref}
   *  ("View feedback" before). de-CH "Feedback-Eingang". */
  inbox: string;
}

// Defined in ./feedback-menu-labels, which holds no component code (0.34, KS U8).
export { DEFAULT_FEEDBACK_MENU_LABELS };

export interface FeedbackMenuProps {
  /** A category row was chosen — open the submit dialog on it (`useFeedbackSubmit`'s
   *  `open`). Never called with `CRASH`: there is no row for it. */
  onFile: (category: FeedbackCategory) => void;
  /** Adds the **Feedback inbox** row → {@link inboxHref} under "My feedback" (0.40, §10.2
   *  decision 11; until 0.39 it replaced it). The admin check is the app's (kastlan's is
   *  company-scoped). Default `false`. */
  isAdmin?: boolean;
  /**
   * Rows of the app's own, between the divider and the list link — keksdose's
   * `Sparkles` Help assistant → `/assistant` and `MessagesSquare` Support chat →
   * `/support` with its unread chip. Any {@link TopBarMenuEntry}; keep their `key`s clear
   * of the menu's own (`BUG`, `IDEA`, `QUESTION`, `OTHER`, `feedback-divider`,
   * `all-feedback`, `my-feedback`, `view-feedback`).
   */
  extraEntries?: TopBarMenuEntry[];
  /** The viewer's own reports, linked for everyone (an admin too since 0.40). Default
   *  `"/my-feedback"` (§2.3). */
  myFeedbackHref?: string;
  /** The admin inbox, linked for an admin. Default `"/feedback"` (§2.3). */
  inboxHref?: string;
  /**
   * The public list (0.38, docs/feedback-harmonization.md §9.2 decision 21): when passed,
   * a **Feedback discussion** row (`Users`, key `all-feedback`; "All feedback" until 0.40)
   * first of the list links, for everyone — the admin too, who reads what the others read
   * there. keksdose: `"/all-feedback"`. Leave it out where the app has no
   * public parts (kastlan) or the viewer may not see them (a Kurvenschmiede customer, a
   * demo — §9.2 decisions 7, 8).
   */
  publicHref?: string;
  /** A dot on the trigger — keksdose's unread support replies (`tone: "danger"`). Its
   *  `label` joins the trigger's name ("Send feedback 2 unread"). The words are the app's. */
  iconBadge?: UserAvatarBadge | null;
  /** Prop > `<UiKitProvider labels={{ feedbackMenu }}>` > English. */
  labels?: LabelOverride<FeedbackMenuLabels>;
  /** Which edge of the trigger the panel lines up with, `start` or `end` in the reading
   *  direction (see `HoverMenu`, whose type this is). Default `end`. */
  align?: HoverMenuProps["align"];
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
 * 5. the list links (0.40, §10.2 decision 11), in this order: **Feedback discussion**
 *    (`Users`, key `all-feedback`) → `publicHref`, when passed; **My feedback** (`User`,
 *    key `my-feedback`) → `/my-feedback`, for everyone, admins included; **Feedback
 *    inbox** (`Inbox`, key `view-feedback`) → `/feedback`, for an admin. An admin with
 *    public parts sees three, a member two; without them an admin two and anyone else
 *    one. Until 0.39 an admin had the inbox in place of their own list (feedback #331);
 *    Marcel's kk #419 gave them both.
 *
 * WHY A PRESET. Three apps had drawn three menus on the same primitive and they disagreed:
 * kastlan headed it "New submission", Kurvenschmiede "Send feedback" with a single link
 * that changed its words by role, keksdose had no heading and one link by role. keksdose
 * is the source (§2.4, §7.11): no heading, the list links by role — and the kit draws
 * it, so the row order, the icons and the words cannot drift again. Where the menu sits in the bar stays each app's.
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
  publicHref,
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
    ...(publicHref
      ? [
          {
            kind: "link",
            key: "all-feedback",
            to: publicHref,
            icon: <Users className="size-4" />,
            label: labels.discussion,
          } satisfies TopBarMenuEntry,
        ]
      : []),
    {
      kind: "link",
      key: "my-feedback",
      to: myFeedbackHref,
      icon: <User className="size-4" />,
      label: labels.myFeedback,
    },
    ...(isAdmin
      ? [
          {
            kind: "link",
            key: "view-feedback",
            to: inboxHref,
            icon: <Inbox className="size-4" />,
            label: labels.inbox,
          } satisfies TopBarMenuEntry,
        ]
      : []),
  ];
  return (
    <TopBarActionMenu
      icon={<MessageSquare className="size-5" />}
      iconBadge={iconBadge}
      aria-label={labels.trigger}
      entries={entries}
      align={align}
    />
  );
}
