// The English words of ./plan-change, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./plan-change re-exports them.

import type { PlanChangeLabels } from "./plan-change";

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
