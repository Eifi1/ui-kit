import { useId } from "react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../lib/cn";
import { List, ListItem } from "../components/list";
import type { ListItemLinkProps } from "../components/list";
import type { LabelOverride } from "../i18n/kit-labels";
import { useAdminAreaLabels } from "./admin-area-labels";
import type { AdminAreaLabels } from "./admin-area-labels";

/** One link of the Tools list. */
export interface AdminToolLink {
  /** Unique in the list. */
  key: string;
  label: string;
  href: string;
  /** A lucide element, sized by the row. */
  icon?: ReactNode;
  /** `false` leaves the link out — Translations for an admin who doesn't review
   *  (§6.11, ka F7). Default: shown. */
  visible?: boolean;
}

export interface AdminToolLinksProps {
  links: readonly AdminToolLink[];
  /**
   * `sidebar` (default): a `<nav>` named and headed "Tools", for `SettingsLayout`'s
   * `sidebarFooter` under the section list on a desktop. `list`: the bare rows, for
   * `SettingsLayout`'s `phoneFooter`, which puts them in a list of their own.
   */
  variant?: "sidebar" | "list";
  /** Your router's link. Default: the `<UiKitProvider linkComponent>`, then `<a>`. */
  renderLink?: (props: ListItemLinkProps) => ReactElement;
  /** Prop > `<UiKitProvider labels={{ adminArea }}>` > English. */
  labels?: LabelOverride<AdminAreaLabels>;
  className?: string;
}

/**
 * The admin area's links to the admin tools that are pages of their own (0.42.0,
 * docs/admin-harmonization.md §2.5 decision 16, §6.11): Translations, and the app's task
 * pages (kastlan's Data import). The feedback inbox is not one of them: the top bar's
 * feedback menu reaches it, and the overview's tiles link to it.
 *
 * Draw it twice from one list — at the foot of the section sidebar and in the phone
 * footer:
 *
 *     <SettingsLayout
 *       sidebarFooter={<AdminToolLinks links={TOOLS} />}
 *       phoneFooter={<AdminToolLinks links={TOOLS} variant="list" />}
 *       …
 *     />
 *
 * With no visible link it renders nothing.
 */
export function AdminToolLinks({
  links,
  variant = "sidebar",
  renderLink,
  labels: labelsProp,
  className,
}: AdminToolLinksProps) {
  const labels = useAdminAreaLabels(labelsProp);
  const headingId = useId();
  const shown = links.filter((l) => l.visible !== false);
  if (shown.length === 0) return null;
  const rows = shown.map((l) => (
    <ListItem
      key={l.key}
      href={l.href}
      renderLink={renderLink}
      title={l.label}
      leading={
        l.icon === undefined ? undefined : (
          <span aria-hidden className="flex shrink-0 text-muted [&_svg]:size-4">
            {l.icon}
          </span>
        )
      }
    />
  ));
  if (variant === "list") return <>{rows}</>;
  return (
    <nav data-slot="admin-tool-links" aria-labelledby={headingId} className={cn("space-y-1", className)}>
      <div id={headingId} className="px-3 text-caption font-semibold uppercase tracking-wide text-muted">
        {labels.tools}
      </div>
      <List density="compact">{rows}</List>
    </nav>
  );
}
