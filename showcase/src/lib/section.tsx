import { Children, Fragment } from "react";
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
      {blurb && <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">{inlineCode(blurb)}</p>}
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
        {hint && <span className="text-xs text-[var(--text-muted)]">{inlineCode(hint)}</span>}
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

/** A constraint the reader has to know about before deciding a component is broken.
 *
 *  `mt-3` unless it is the first thing in its box: a Note is dropped after a Stage, a
 *  StatTileGrid or another Note inside a card that has no `space-y` of its own, and
 *  there it sat flush against the box above it — on some pages and not others,
 *  depending on whether the author happened to wrap it. In a `space-y` parent the top
 *  margin collapses into the gap that is already there, so nothing doubles. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] px-3 py-2 text-xs text-[var(--text-secondary)] first:mt-0">
      {inlineCode(children)}
    </p>
  );
}

/**
 * `code` spans in PLAIN STRINGS — a hint, a blurb, a Note's text.
 *
 * Those are written as string attributes (`hint="Only \`title\` is required"`), where
 * JSX cannot hold a `<code>`, and the backticks were printed literally. A string is
 * split on backtick pairs; elements pass through untouched, so a Note that already
 * writes its own `<code>` renders as before. An unpaired backtick stays a backtick.
 *
 * `dir="ltr"` on the span: a code snippet is an identifier with a direction of its
 * own. Inside a right-to-left specimen the bidi algorithm otherwise treats the quotes
 * of `dir="rtl"` as neutral and moves them to the far end: `"dir="rtl`.
 */
export function inlineCode(node: ReactNode): ReactNode {
  if (typeof node === "string") {
    const parts = node.split("`");
    // An even count of parts is an odd count of backticks: leave the string alone
    // rather than guess which one is the stray.
    if (parts.length < 3 || parts.length % 2 === 0) return node;
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <code key={i} dir="ltr" className="font-mono">
          {part}
        </code>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      ),
    );
  }
  if (Array.isArray(node)) {
    return Children.map(node, (child) => inlineCode(child));
  }
  return node;
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
        <span className="block truncate font-mono text-caption text-[var(--text-muted)]">{value}</span>
      </span>
    </div>
  );
}

/**
 * Break opportunities inside a long code token, at the points a person would break it.
 *
 * Readout cells used `overflow-wrap: anywhere`, which lets a line break between ANY
 * two characters — and, worse, counts every cell's minimum width as one character, so
 * the table's auto layout squeezed whichever column it liked: "tr/ue", "M/E",
 * "2027/-09-/30", a key column five letters wide. Now a cell breaks only at spaces and
 * at the `<wbr>`s put in here: before a `.` (`panel` / `.rect`, the way code is
 * wrapped; never a decimal point), after `(`, `[`, `{`, `,`, `/`, `_`, `:`, `=` and
 * `|`. Only in tokens long enough to need it (16+ characters) and never in a number,
 * so `1,234,567.891`, a date and `true` stay whole. `overflow-wrap: break-word` stays
 * as the last resort for a single segment still wider than the cell — it breaks
 * without shrinking the column.
 */
const LONG_TOKEN = 16;
const NUMBER = /^[-+−]?[\d.,'’ ]+$/;
function softBreaks(text: string): ReactNode {
  const words = text.split(/(\s+)/);
  if (!words.some((w) => w.length >= LONG_TOKEN && !NUMBER.test(w))) return text;
  return words.map((word, i) => {
    if (word.length < LONG_TOKEN || NUMBER.test(word)) return <Fragment key={i}>{word}</Fragment>;
    // Split into [segment, breakpoint-char] pieces and put a <wbr> on the right side.
    const pieces = word.split(/([.([{,/_:=|])/);
    return (
      <Fragment key={i}>
        {pieces.map((piece, j) => {
          if (j % 2 === 0) return piece;
          // `.` breaks BEFORE itself; everything else after. Never at the very start,
          // and never inside a decimal (`70.000003`, in a JSON readout).
          const quiet = pieces[j - 1] === "" || /\d$/.test(pieces[j - 1]);
          return piece === "." ? (
            <Fragment key={j}>
              {!quiet && <wbr />}
              {piece}
            </Fragment>
          ) : (
            <Fragment key={j}>
              {piece}
              <wbr />
            </Fragment>
          );
        })}
      </Fragment>
    );
  });
}

function breakable(node: ReactNode): ReactNode {
  return typeof node === "string" ? softBreaks(node) : node;
}

/** Input → output, for the exported helpers that have nothing to render. These are
 *  a third of the package's public surface (calc, dates, filters, sorts, palette
 *  math) and a showcase that skipped them would document only the half you can see.
 *
 *  On a phone, once the table is under 24rem of its OWN width (a container query, so a
 *  table inside a Stage or a nested card counts), each row stacks: the expression on
 *  its line, the result indented under it. Two columns in 300px left one of them a few
 *  characters wide whichever way the table divided it; stacked, both get the full width
 *  and break only where they must. From `md` up the table keeps its two columns even
 *  in a narrow card — that layout is the desktop's, and it was never the broken one. */
export function OutTable({ rows }: { rows: Array<[expression: string, result: ReactNode]> }) {
  return (
    <div className="@container">
      <table className="w-full text-left text-xs max-md:@max-sm:block">
        <tbody className="max-md:@max-sm:block">
          {rows.map(([expr, result], i) => (
            <tr
              key={i}
              className="border-b border-[var(--border)] last:border-b-0 max-md:@max-sm:block max-md:@max-sm:py-1.5"
            >
              <td className="py-1.5 pr-4 align-top font-mono break-words text-[var(--text-secondary)] max-md:@max-sm:block max-md:@max-sm:p-0">
                {breakable(expr)}
              </td>
              <td className="py-1.5 align-top font-mono font-medium break-words text-[var(--text-primary)] max-md:@max-sm:block max-md:@max-sm:ps-3 max-md:@max-sm:pt-0.5 max-md:@max-sm:pb-0">
                {breakable(result)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** An exported class constant, shown as its literal value — these are part of the
 *  public API (a consumer composes with them) but have no rendering of their own.
 *  The name gets the same soft breaks as a readout cell: `DEFAULT_ACCOUNT_SETTINGS_
 *  LABELS` breaks after an underscore, not mid-word. */
export function ConstList({ items }: { items: Array<[name: string, value: string]> }) {
  return (
    <dl className="space-y-2">
      {items.map(([name, value]) => (
        <div key={name}>
          <dt className="font-mono text-xs font-medium break-words text-[var(--text-primary)]">
            {softBreaks(name)}
          </dt>
          <dd className="break-words font-mono text-caption leading-relaxed text-[var(--text-muted)]">
            {softBreaks(value)}
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
