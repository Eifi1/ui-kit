import type { ReactNode } from "react";
import { DateHelpers } from "./dates";
import { NumberHelpers } from "./numbers";
import { FieldClassConstants } from "./fields";

/**
 * The helpers page: everything on the Inputs pages that was a function or a constant
 * rather than a component. They sat between specimens there — the date arithmetic
 * between the range picker and the month picker, the calculator's grammar under the
 * number pad — where they read as part of the component above them. Grouped here by
 * the input family they serve, each still rendered from the real export at render.
 */
export function Helpers() {
  return (
    <>
      <Group title="Dates" hint="@eifi1/ui-kit/dates">
        <DateHelpers />
      </Group>
      <Group title="Numbers & money" hint="lib/calc and the currency table">
        <NumberHelpers />
      </Group>
      <Group title="Fields" hint="the class constants a custom field is composed from">
        <FieldClassConstants />
      </Group>
    </>
  );
}

function Group({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="space-y-6 border-t border-[var(--border)] pt-8 first:border-t-0 first:pt-0">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{hint}</p>
      </div>
      {children}
    </section>
  );
}
