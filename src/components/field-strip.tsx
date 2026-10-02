import { useId } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { LabelStrip, useFieldMessages } from "./field-parts";

/**
 * How far down the content starts, under the 11px label — see {@link FieldStripProps.pad}.
 *
 *  - `"clear"` (default) — 20px: the content starts below the label's whole line box.
 *  - `"field"` — 16px: the strip plus a 26px bordered control is exactly a labelled
 *    {@link Input}'s 42px.
 */
export type FieldStripPad = "clear" | "field";

/** What a {@link FieldStrip} hands render-prop children. */
export interface FieldStripIds {
  /** The label's id — for content that names ITSELF by the label (`aria-labelledby`)
   *  under `group={false}`, or anything else that has to point at it. */
  labelId: string;
  /** The ids of the caption and the error while they are on screen, else `undefined`.
   *  The group is described by them already; spread this on the content under
   *  `group={false}`, where there is no group to describe. */
  describedBy: string | undefined;
}

export interface FieldStripProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** The 11px static label, on the line a labelled field's label sits on. */
  label: ReactNode;
  /**
   * Field anatomy, as on {@link Input}: plain text is a caption under the content (and
   * describes the group); a {@link FieldHint} "?" rides the label line.
   */
  hint?: ReactNode;
  /** A message under the content, in `--danger`, describing the group. `null`,
   *  `false` and `""` are no error. The content's own controls are the caller's to
   *  mark `aria-invalid`; a `group` cannot be. */
  error?: ReactNode;
  /**
   * Dims the label with the content, as a disabled field's label dims. The content is
   * the caller's: disable (or hide) its controls yourself — keksdose's location cell
   * turns its map into a picture and drops its buttons, which no flag here could guess.
   */
  disabled?: boolean;
  /**
   * How tall the strip is — what the content needs, measured in keksdose (`pt-5` /
   * `pt-4`, the 0.22 `LABEL_STRIP_PAD`):
   *
   *  - `"clear"` (default) — 20px. The content starts below the label's whole line box
   *    (4px down, 13.75px tall). For content with no inset of its own: a map, a row of
   *    buttons, a pill, a line of text, a row of tiles whose selection is their frame
   *    (SwatchPicker, IconPicker).
   *  - `"field"` — 16px. The strip plus a 26px bordered control (1 + 2 + 20 + 2 + 1) is
   *    exactly a labelled Input's 42px, so the row's bottom edges line up. The label's
   *    line box runs 1.75px into the control's top hairline, so only content with an
   *    inset of its own keeps clear of it — the segmented group's 2px moat
   *    (ToggleGroup's `labelPlacement="strip"`).
   *
   * A responsive strip is a `className`: it merges after the pad, so keksdose's status
   * cell writes `className="pt-5 @3xl:pt-4"` (20px on a phone, 16px in the desktop row).
   */
  pad?: FieldStripPad;
  /**
   * The wrapper is a `role="group"` named by the label (default), so a screen reader
   * entering the map or the first button hears "Location, group" — what the visible
   * label tells a sighted reader the content is about.
   *
   * `false` for content that is a labelled group ITSELF (a `role="radiogroup"` of the
   * app's own, a TileRadioGroup's container, a fieldset): a group inside a group, both
   * named "Pattern", is read twice. The wrapper is then a plain box, and the content
   * takes the name from the render-prop's `labelId` (and the caption and error from
   * its `describedBy`).
   */
  group?: boolean;
  /** The content. A function receives {@link FieldStripIds}. */
  children: ReactNode | ((ids: FieldStripIds) => ReactNode);
}

/**
 * The kit's label strip for content of your own — keksdose G8.
 *
 * 0.22 gave three groups a strip label (keksdose K2): ToggleGroup's
 * `labelPlacement="strip"`, SwatchPicker's and IconPicker's `label`. Each draws the
 * 11px label (and its `FieldHint`) on the same line as the labelled fields beside it,
 * over content WITHOUT a field's border round it. keksdose's transaction row has one
 * cell left that is not one of those groups: the location — a map, a "Locate me" and a
 * "Search" button — still built by hand as a `relative` cell, a floated `FieldLabel`
 * and a `pt-5` box (transaction-location-field.tsx), and so is the reconciled-status
 * stand-in (cleared-status-toggle.tsx, `ClearedStatusLocked`). This is the strip on its
 * own, the same component the three groups draw theirs with:
 *
 * ```tsx
 * <FieldStrip label={t("transactions.location")} className={className}>
 *   <div className="space-y-2">
 *     <PinMap … />
 *     <div className="flex flex-wrap gap-2"><Button …>Locate me</Button>…</div>
 *   </div>
 * </FieldStrip>
 * ```
 *
 * The label sits where a field's static label sits (`top-1`, `inset-x-3`, 11px in a
 * `leading-tight` line); the content starts `pad` down, full width. `className` styles
 * the wrapper — the grid or flex item in the caller's row — and merges after the pad.
 *
 * Not a {@link Field}: that one sets a 14px label ABOVE its control, in flow, for a form
 * that labels its fields that way. This is for a row whose fields float their labels
 * inside them, where a label above would be the only one of its kind.
 */
export function FieldStrip({
  label,
  hint,
  error,
  disabled = false,
  pad = "clear",
  group = true,
  className,
  children,
  ...rest
}: FieldStripProps) {
  const labelId = useId();
  const messages = useFieldMessages({ hint, error });
  const content = typeof children === "function" ? children({ labelId, describedBy: messages.describedBy }) : children;
  // The caller's own description first, then the caption, then the error — the order
  // every kit field reads them in.
  const groupDescribedBy = [rest["aria-describedby"], messages.describedBy].filter(Boolean).join(" ") || undefined;
  return (
    <LabelStrip
      {...rest}
      {...(group
        ? {
            role: "group",
            // An explicit name wins, as on the kit's labelled groups.
            "aria-labelledby":
              rest["aria-label"] === undefined && rest["aria-labelledby"] === undefined
                ? labelId
                : rest["aria-labelledby"],
            "aria-describedby": groupDescribedBy,
          }
        : null)}
      labelId={labelId}
      label={label}
      hint={messages.labelHint}
      disabled={disabled}
      pad={pad}
      className={className}
    >
      {content}
      {messages.below}
    </LabelStrip>
  );
}
