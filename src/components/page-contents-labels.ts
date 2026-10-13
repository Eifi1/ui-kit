// The English words of ./page-contents, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./page-contents re-exports them.

import type { PageContentsLabels } from "./page-contents";

export const DEFAULT_PAGE_CONTENTS_LABELS: PageContentsLabels = {
  title: "On this page",
};
