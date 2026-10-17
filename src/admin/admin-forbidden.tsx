import type { ComponentPropsWithRef } from "react";
import { ShieldAlert } from "lucide-react";
import { cn } from "../lib/cn";
import { Button } from "../components/button";
import { EmptyState } from "../components/empty-state";
import type { LabelOverride } from "../i18n/kit-labels";
import { useAdminAreaLabels } from "./admin-area-labels";
import type { AdminAreaLabels } from "./admin-area-labels";

export interface AdminForbiddenProps extends Omit<ComponentPropsWithRef<"div">, "children" | "title"> {
  /** The app's name, in the sentence: "This is where administrators run Kastlan." */
  appName: string;
  /** The button's target: the app's start page (keksdose `/budget`, kastlan `/dashboard`). */
  homeHref: string;
  /** The button's words, where the app names its start ("Back to the budget"). Default
   *  `adminArea.forbiddenHome`, "Go to the start page". */
  homeLabel?: string;
  /** Pass it to a translation reviewer: a second button, "Review translations", to the
   *  tool their role does have (§2.2 decision 8). */
  reviewerHref?: string;
  /** The heading's level. Default `h1`: the page stands alone inside the app shell. */
  headingAs?: "h1" | "h2" | "h3";
  /** Prop > `<UiKitProvider labels={{ adminArea }}>` > English. */
  labels?: LabelOverride<AdminAreaLabels>;
}

/**
 * The admin area's 403 page (0.42.0, docs/admin-harmonization.md §2.2 decision 8, §6.7),
 * keksdose's `AdminForbidden`: "Only for administrators" / "This is where administrators
 * run {app}. Your account cannot open this page.", and a button back to the app's start.
 *
 * It RENDERS, it does not redirect: the app's client gate shows it in place of the admin
 * page, on the same admin check the account menu uses, inside the lazy route — so a
 * bookmark keeps its address, and signing in as an admin opens the page that was asked
 * for. The server's gate stays the rule. kastlan shows it on its admin tools (`/admin`,
 * `/import`, `/feedback`); its work pages keep their generic 403.
 *
 * The words say only that this area is closed to this account, never that the person
 * administers nothing anywhere: a kastlan superuser who isn't ADMIN in the acting company
 * gets this page too.
 */
export function AdminForbidden({
  appName,
  homeHref,
  homeLabel,
  reviewerHref,
  headingAs = "h1",
  labels: labelsProp,
  className,
  ...rest
}: AdminForbiddenProps) {
  const labels = useAdminAreaLabels(labelsProp);
  return (
    <div {...rest} data-slot="admin-forbidden" className={cn("mx-auto w-full max-w-xl p-4 md:p-6", className)}>
      <EmptyState
        icon={<ShieldAlert />}
        headingAs={headingAs}
        title={labels.forbiddenTitle}
        hint={labels.forbiddenBody(appName)}
        action={
          <>
            <Button href={homeHref} variant="secondary">
              {homeLabel ?? labels.forbiddenHome}
            </Button>
            {reviewerHref !== undefined && (
              <Button href={reviewerHref} variant="secondary">
                {labels.forbiddenReviewer}
              </Button>
            )}
          </>
        }
      />
    </div>
  );
}
