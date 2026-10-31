// The words of admin/plan-change and their type, in a module with no component code: the
// English catalogue (src/i18n/defaults.ts) imports them without the component, so `en`
// loads as one chunk like the other languages (0.34, KS U8). In billing/ since 0.52:
// PlanSwitchConfirm reads them too, and with them in admin/ the billing and admin folders
// imported each other (refactor audit 2026-10-30, MOD-6). admin/plan-change re-exports
// both, and admin/plan-change-labels still answers for the old path.

/** The `planChange` namespace: the column, the grant dialog and the result's lines. */
export interface PlanChangeLabels {
  /** The column's header: "Plan". */
  column: string;
  /** The dialog's title: "Change plan". */
  title: string;
  /** Its confirm button: "Change plan". */
  confirm: string;
  /** The plan select's label: "Plan". */
  plan: string;
  /** The line over the select: "Current plan: Free". */
  current: (plan: string) => string;
  /** Under the select — the fact that is not on the button. */
  keepsItems: string;
  /** The end of a free grant's field: "Free until". */
  until: string;
  /** Under it. */
  untilHint: string;
  /** Why the confirm is held while nothing would change. */
  needsChange: string;
  /** The result: the plan moved from one to another. */
  changed: (from: string, to: string) => string;
  /** The result: an account with no plan before, or the same plan again. */
  set: (to: string) => string;
  /** The result: a running beta kept its own end (§12.34); only the plan moved. */
  keptBeta: string;
  /** The result: the grant runs until `date` (formatted). */
  untilDone: (date: string) => string;
  /** The result: the account owns more than the new plan allows. */
  overLimit: string;
  /**
   * The column's usage, spelled out (its tooltip): "1 of 5 budgets". Figures arrive
   * formatted; `dimension` is the app's word, as `usage.label` gives it — since 0.33.1
   * in the form the LIMIT takes when the label gives its plural forms ("1 of 1 budget",
   * "1 of 5 budgets"): in every shipped language the word follows the limit, or heads
   * the line in German, whose `von` would want a dative plural no app form carries
   * ("Budgets: 1 von 5"). An override of yours gets the same word. Since 0.34 the grant
   * dialog's usage line too, when `usage` comes as the column's shape.
   */
  usageOf: (used: string, limit: string, dimension: string) => string;
}

export const DEFAULT_PLAN_CHANGE_LABELS: PlanChangeLabels = {
  column: "Plan",
  title: "Change plan",
  confirm: "Change plan",
  plan: "Plan",
  current: (plan) => `Current plan: ${plan}`,
  keepsItems: "A smaller plan only blocks creating more; nothing is deleted.",
  until: "Free until",
  untilHint: "Leave empty for no end. A running beta keeps its own end.",
  needsChange: "Pick another plan or an end date.",
  changed: (from, to) => `Plan changed from ${from} to ${to}.`,
  set: (to) => `Plan set to ${to}.`,
  keptBeta: "The beta keeps its end; only the plan changed.",
  untilDone: (date) => `Free until ${date}.`,
  overLimit: "Above the new plan’s limit: nothing is removed, new items are blocked.",
  usageOf: (used, limit, dimension) => `${used} of ${limit} ${dimension}`,
};
