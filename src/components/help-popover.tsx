import { useId } from "react";
import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "../lib/cn";
import type { RemLength } from "../hooks/use-breakpoint";
import { FOCUS_RING } from "./focus-ring";
import { Popover } from "./popover";

/** {@link HelpPopover}'s props. */
export interface HelpPopoverProps {
  /**
   * Names the "?" and the panel — a short question ("What do the statuses mean?") or
   * "About <field>" ("About the settlement date"), in the reader's language. Required:
   * a "?" named "?" tells a screen reader nothing about what it opens. Not the help
   * itself, which is `children`.
   */
  label: string;
  /** The help: a paragraph, or a few. Rendered in the panel at body size. */
  children: ReactNode;
  /** The panel's width — {@link Popover}'s `width`. Default `"20rem"`, a paragraph's
   *  measure; it follows the text size and never exceeds the viewport. */
  width?: number | RemLength;
  /** Classes for the "?" button. */
  className?: string;
}

/** A paragraph's measure: 320 px at Normal, in rem so it grows with the text size. */
const HELP_WIDTH: RemLength = "20rem";

/**
 * A "?" whose HELP opens on a tap, a click or Enter — for a paragraph too long to print
 * under a field (0.34, keksdose K3, live #400: *"Remove the long text and move it behind
 * a clickable notice like a circle"*).
 *
 * **Help, not a fact** (docs/text-size-harmonization.md §10.23). {@link FieldHint} is
 * the "?" for a FACT — a format, a limit, a consequence — and since 0.32 it turns into
 * its own words under the field at Large and on a touch screen (`useInlineHint`, §4 "No
 * fact only in a tooltip"), because a fact a reader cannot reach is a fact they do not
 * have. That rule stays. This part is for HELP: why the field exists, how to choose,
 * what the options mean — text the field is usable without. Printed inline it was the
 * longest thing in keksdose's transaction form (four statuses, ~500 characters, on every
 * new row on a phone). `useInlineHint` turns only a FieldHint into a caption, so this
 * one stays on the label line at every size.
 *
 * **On a field: its `help`** (0.36, round 0.36 decision 1). Every kit field that takes a
 * `hint` takes a `help` beside it, and the `@eifi1/ui-kit/rhf` bindings too: pass the
 * help's words and the field draws this "?" on its label line (an unlabelled one at its
 * end edge, outside the box), named "About “<label>”" — or pass a HelpPopover to name it
 * yourself. `hint` stays the FACT, printed under the field; while `help` is set a
 * FieldHint there draws no "?" of its own, so the field has one. Passed as `hint`, as in
 * 0.34, it still rides the label line. It also stands on its own, beside a heading or a
 * column title.
 *
 * **A popover, not a tooltip**: a tooltip bubble is for a line, and opens on hover a
 * finger never makes. This is the kit {@link Popover}: it opens and closes on a tap or a
 * click (and on Enter or Space, as any button does), closes on Escape and on a press
 * outside, and takes the focus into its panel and gives it back to the "?" on close. The
 * panel is a `dialog` named by `label` and described by the help, so a screen reader
 * reads both on opening. The "?" says `aria-expanded` and `aria-haspopup="dialog"`.
 *
 * **"?" rather than "!"**: it answers a question ("what is the difference between
 * accepted and cleared?", keksdose live #247); "!" is a warning.
 *
 * ```tsx
 * <Select label="Status" hint="Cleared and reconciled rows are locked." help={
 *   <HelpPopover label="What do the statuses mean?">
 *     Pending: … Accepted: … Cleared: … Reconciled: …
 *   </HelpPopover>
 * } … />
 * ```
 */
export function HelpPopover({ label, children, width = HELP_WIDTH, className }: HelpPopoverProps) {
  const panelId = useId();
  const bodyId = useId();
  return (
    <Popover
      width={width}
      panelId={panelId}
      // The panel is named by the question and described by the answer, so focus moving
      // into it reads both.
      aria-label={label}
      aria-describedby={bodyId}
      trigger={({ open, toggle, ref }) => (
        <button
          ref={ref}
          // Never `submit`: the "?" sits on a field's label line, inside a form.
          type="button"
          aria-label={label}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={open ? panelId : undefined}
          onClick={(e) => {
            // The "?" sits in a label strip: the press is the "?"'s, not the field's.
            e.preventDefault();
            toggle();
          }}
          // FieldHint's look, so the two marks read as one family on a label line; the
          // open one holds its hover colour while its panel shows.
          className={cn(
            "flex rounded-full text-placeholder transition-colors hover:text-secondary",
            open && "text-secondary",
            FOCUS_RING,
            className,
          )}
        >
          <HelpCircle aria-hidden className="size-3.5" />
        </button>
      )}
    >
      {() => (
        <div id={bodyId} className="space-y-2 text-sm leading-snug text-primary">
          {children}
        </div>
      )}
    </Popover>
  );
}
