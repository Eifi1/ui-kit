// The English words of ./not-found-page, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./not-found-page re-exports them.

import type { NotFoundLabels } from "./not-found-page";

export const DEFAULT_NOT_FOUND_LABELS: NotFoundLabels = {
  title: "Page not found",
  body: "This address doesn’t exist (any more). It may be a typo, or the page has moved.",
  home: "Go to the start page",
  app: "Back to the app",
};
