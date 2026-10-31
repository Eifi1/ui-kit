// Moved to billing/plan-change-labels in 0.52 (refactor audit 2026-10-30, MOD-6): the
// billing and admin folders imported each other through it. Kept so the old path still
// answers; nothing in the kit imports it any more but the English catalogue.
export { DEFAULT_PLAN_CHANGE_LABELS } from "../billing/plan-change-labels";
export type { PlanChangeLabels } from "../billing/plan-change-labels";
