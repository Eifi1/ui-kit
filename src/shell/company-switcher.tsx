import { useState } from "react";
import type { ReactNode } from "react";
import { Building2 } from "lucide-react";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import { useAnnounce } from "../hooks/use-announce";
import { Spinner } from "../components/ui";
import { OptionSwitcherMenu } from "./option-switcher-menu";
import { TOPBAR_TRIGGER_CLASS } from "./topbar-controls";

/** Every string the switcher renders or speaks — the `companySwitcher` namespace. A
 *  different context (keksdose's budgets) renames them all. */
export interface CompanySwitcherLabels {
  /** The trigger's and the menu's accessible name. */
  switchCompany: string;
  /** The small heading over the list. */
  heading: string;
  /** The trigger's tooltip (and description), given the current company's name. */
  current: (name: string) => string;
  /** Read after the current company's name in the list, where the eye sees a check. */
  currentMark: string;
  /** Said while a switch is running. */
  switching: string;
}

export const DEFAULT_COMPANY_SWITCHER_LABELS: CompanySwitcherLabels = {
  switchCompany: "Switch company",
  heading: "Companies",
  current: (name) => `Company: ${name}`,
  currentMark: "(current)",
  switching: "Switching company…",
};

/** One company the user belongs to — kastlan's `/auth/me` `companies[]` (§5.3). */
export interface CompanySwitcherCompany<Id extends string | number = string | number> {
  /** kastlan's ids are numbers; a string works the same. */
  id: Id;
  name: string;
}

export interface CompanySwitcherProps<Id extends string | number> {
  /** Every company the user belongs to. With fewer than two there is nothing to
   *  switch, and nothing renders. */
  companies: readonly CompanySwitcherCompany<Id>[];
  /** The company the session is in — `/auth/me`'s `current_company_id`. */
  currentId: Id;
  /**
   * Another company was picked: `POST /auth/switch-company {company_id}`, store the
   * fresh tokens, reload what is company-scoped. While the promise runs the switcher is
   * disabled, so a second pick cannot race the first; a rejection frees it (the app
   * says why). Picking the current company does nothing.
   */
  onSwitch: (id: Id) => Promise<unknown> | void;
  /** The trigger's glyph. Default a building; keksdose's budgets would pass a wallet. */
  icon?: ReactNode;
  labels?: Partial<CompanySwitcherLabels>;
}

/**
 * The company switcher in the top bar (docs/auth-harmonization.md §5.3, §8): a kastlan
 * user may belong to several companies, and the access token carries the current one,
 * so switching is a request for new tokens — `onSwitch`, the app's. Built on
 * {@link OptionSwitcherMenu}, like `RoleSwitcher`: the icon trigger, the current company
 * in its tooltip, the list with a check on the current one.
 *
 * **Only for more than one company** — a user in one company has nothing to switch, and
 * the top bar stays as it was. **Disabled while a switch runs**: the trigger is swapped
 * for a disabled one with a spinner (`aria-busy`), and "Switching company…" is said, so
 * a second pick cannot race the first. The kit never sends the request.
 *
 * A generic context switcher: the labels rename it ("Switch budget", "Budgets"), `icon`
 * replaces the building, and `id` may be a number (kastlan's) or a string.
 */
export function CompanySwitcher<Id extends string | number>({
  companies,
  currentId,
  onSwitch,
  icon,
  labels: labelsProp,
}: CompanySwitcherProps<Id>) {
  const labels = useKitLabels("companySwitcher", DEFAULT_COMPANY_SWITCHER_LABELS, labelsProp);
  const [pending, setPending] = useState(false);
  const { announce, regionProps } = useAnnounce();
  if (companies.length < 2) return null;

  const current = companies.find((c) => c.id === currentId);
  const select = (value: string) => {
    if (pending) return;
    const picked = companies.find((c) => String(c.id) === value);
    if (!picked || picked.id === currentId) return;
    const result = onSwitch(picked.id);
    if (typeof (result as PromiseLike<unknown> | undefined)?.then !== "function") return;
    setPending(true);
    announce(labels.switching);
    (result as PromiseLike<unknown>).then(
      () => setPending(false),
      () => setPending(false),
    );
  };

  return (
    <>
      {pending ? (
        <button
          type="button"
          disabled
          aria-busy="true"
          aria-label={labels.switchCompany}
          className={cn(TOPBAR_TRIGGER_CLASS, "cursor-wait opacity-60 hover:bg-transparent")}
        >
          <Spinner label={null} />
        </button>
      ) : (
        <OptionSwitcherMenu<string>
          ariaLabel={labels.switchCompany}
          title={current ? labels.current(current.name) : undefined}
          heading={labels.heading}
          icon={icon ?? <Building2 className="size-5" />}
          options={companies.map((c) => ({
            value: String(c.id),
            label:
              c.id === currentId ? (
                // `relative`: the sr-only mark needs a local containing block.
                <span className="relative">
                  {c.name}
                  <span className="sr-only"> {labels.currentMark}</span>
                </span>
              ) : (
                c.name
              ),
          }))}
          value={String(currentId)}
          onSelect={select}
        />
      )}
      {/* Outside both triggers, so it survives the swap and is read when it changes. */}
      <span {...regionProps} />
    </>
  );
}
