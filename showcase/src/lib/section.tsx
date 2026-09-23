import type { ReactNode } from "react";
import { cn } from "@eifi1/ui-kit";

/**
 * The showcase's own chrome. Deliberately thin, and deliberately built out of the
 * kit's TOKENS rather than Tailwind's palette — a showcase that painted itself
 * `bg-white`/`text-slate-900` would keep looking right while the palette switch
 * underneath it did nothing, which is precisely the failure this page exists to
 * make visible.
 */

/** One top-level section. The `<h2>` carries the anchor the section nav links to,
 *  and is what the render test asserts — so a renamed section fails CI rather than
 *  silently disappearing from the page. */
export function Section({
  id,
  title,
  blurb,
  children,
}: {
  id: string;
  title: string;
  blurb?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16 border-t border-[var(--border)] pt-8 first:border-t-0">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
      {blurb && <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">{blurb}</p>}
      <div className="mt-5 space-y-6">{children}</div>
    </section>
  );
}

/** One labelled specimen inside a section. `hint` is where a constraint goes —
 *  "needs a Router", "only below 768px" — because an example that silently does
 *  nothing on this page reads as a broken component. */
/** A stable anchor id from a heading, so the on-this-page nav and a deep link agree. */
export function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function Example({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  // The id is DERIVED from the label rather than passed in, so a page's contents list
  // and its anchors cannot disagree: `OnThisPage` reads these headings out of the DOM
  // instead of keeping a parallel registry that drifts the first time somebody adds an
  // example. `scroll-mt` leaves a little air above a heading a contents link jumps to.
  const id = slugify(label);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h3 id={id} className="scroll-mt-6 text-sm font-medium text-[var(--text-primary)]">
          {label}
        </h3>
        {hint && <span className="text-xs text-[var(--text-muted)]">{hint}</span>}
      </div>
      <div
        className={cn(
          "rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Horizontal specimen strip — wraps, so a row of eight buttons stays usable at
 *  phone width instead of overflowing the card. */
export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-3", className)}>{children}</div>;
}

/** A constraint the reader has to know about before deciding a component is broken. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] px-3 py-2 text-xs text-[var(--text-secondary)]">
      {children}
    </p>
  );
}

/** A single design token, shown as the colour plus the value that produced it. */
export function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden
        className="size-8 shrink-0 rounded-md border border-[var(--border)]"
        style={{ background: value }}
      />
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-[var(--text-primary)]">{name}</span>
        <span className="block truncate font-mono text-[11px] text-[var(--text-muted)]">{value}</span>
      </span>
    </div>
  );
}

/** Input → output, for the exported helpers that have nothing to render. These are
 *  a third of the package's public surface (calc, dates, filters, sorts, palette
 *  math) and a showcase that skipped them would document only the half you can see. */
export function OutTable({ rows }: { rows: Array<[expression: string, result: ReactNode]> }) {
  return (
    <table className="w-full text-left text-xs">
      <tbody>
        {rows.map(([expr, result], i) => (
          <tr key={i} className="border-b border-[var(--border)] last:border-b-0">
            <td className="py-1.5 pr-4 align-top font-mono text-[var(--text-secondary)]">{expr}</td>
            <td className="py-1.5 align-top font-mono font-medium text-[var(--text-primary)]">
              {result}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** An exported class constant, shown as its literal value — these are part of the
 *  public API (a consumer composes with them) but have no rendering of their own. */
export function ConstList({ items }: { items: Array<[name: string, value: string]> }) {
  return (
    <dl className="space-y-2">
      {items.map(([name, value]) => (
        <div key={name}>
          <dt className="font-mono text-xs font-medium text-[var(--text-primary)]">{name}</dt>
          <dd className="break-words font-mono text-[11px] leading-relaxed text-[var(--text-muted)]">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The demo area of a specimen — the component on its own, centred, on a faint
 * ground, with the readouts and the explanation left-aligned BELOW it. The pattern
 * MUI's and Radix's docs use: the eye should land on the component before the prose.
 *
 * ONE WIDTH for every item. The kit's fields fill their container, as MUI's do with
 * `fullWidth` — so a specimen's width was whatever wrapper its author happened to put
 * round it (`max-w-xs`, `w-72`, a Row, nothing), and one page showed three different
 * field widths. Here each direct child is 20rem, wrapping into centred rows, so every
 * field on every page is the same size. A child that is a layout of its own — a grid
 * of states, a settings list — opts out with `data-stage="wide"` and takes the width.
 */
export function Stage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "mb-3 flex flex-wrap items-start justify-center gap-4 rounded-md border border-dashed border-[var(--border)] bg-[var(--bg-page)] px-4 py-8",
        "[&>*]:w-80 [&>*]:max-w-full [&>[data-stage=wide]]:w-full",
        className,
      )}
    >
      {children}
    </div>
  );
}
