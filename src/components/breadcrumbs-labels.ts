// The English words of ./breadcrumbs, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./breadcrumbs re-exports them.

import type { BreadcrumbsLabels } from "./breadcrumbs";

export const DEFAULT_BREADCRUMBS_LABELS: BreadcrumbsLabels = {
  label: "Breadcrumb",
  showAll: "Show full path",
};
