import { createContext } from "react";

/**
 * Set by `PageHeader` around its `breadcrumbs` (0.49 KIT-9), so a `Breadcrumbs` there
 * knows the page's title is already on screen: it hides its current entry by default
 * (`hideCurrent`) and draws nothing when only the home entry would remain. Internal.
 */
export const PageHeaderTrailContext = createContext<{ titled: boolean } | null>(null);
