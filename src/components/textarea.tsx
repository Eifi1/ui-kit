import { useId, useLayoutEffect, useRef } from "react";
import type { ChangeEvent, ReactNode, Ref, TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import {
  EndHintRow,
  FieldCaption,
  mergeDescribedBy,
  useFieldError,
  useFieldHint,
  type FieldHelpProps,
} from "./field-parts";
import {
  CharacterCount,
  FIELD_BASE,
  FIELD_INVALID,
  FieldGroup,
  FloatingField,
  FLOATING_INPUT_CLASS,
  FLOATING_PLACEHOLDER_ON_FOCUS,
  fieldBelow,
  hasPlaceholderText,
  useCharacterCountLabels,
  useTypedLength,
  type CharacterCountLabels,
} from "./field-base";

/**
 * The lower edge of {@link TEXTAREA_LABEL_STRIP} (0.25, Kurvenschmiede).
 *
 * The 0.24 strip ends on a hard line, and a line of text scrolled most of the way under
 * it left its lower edge showing below that line: in a pasted table, a row of comma
 * tails between the strip and the first whole line (`0,5;1,9` cut above its baseline is
 * `, ,`). This layer, hung under the strip, closes that gap. What it draws depends on
 * how much of the line on its way out is still below the strip ({@link labelEdge}):
 *
 * - **Half a line or less** — its descenders, the feet of its letters: covered, solid,
 *   down to exactly where that line's box ends. The strip's bottom snaps to the line
 *   box, so the row of tails is gone and the next line, which starts there, is not
 *   touched.
 * - **More than half** — a line you can still read: a soft edge, the strip's surface
 *   fading into it over {@link LABEL_EDGE_SOFT_PX}, where 0.24 cut it hard. Never taller
 *   than the part of that line already gone, so it grows from nothing as a line starts
 *   to move and never reaches the next one.
 * - **Nothing to cover** — at rest, or a line boundary right on the strip's edge:
 *   nothing drawn. An unscrolled first line is never covered (at rest the strip covers
 *   the top padding and nothing else, as in 0.24), and neither is any whole line.
 *
 * Why not one of the two alone. A plain fade under the strip, as tall as the tails,
 * dims the top of the first WHOLE line whenever it sits right under the strip (its
 * capitals start about 4px into a 20px line), and only half-hides the tails, which sit
 * in its fading part. A plain snap to the line box would hide a whole line the moment
 * one starts to scroll. The half-line threshold keeps what is shown legible: a line is
 * either hidden or shown with most of its letters, never as a row of stray marks.
 *
 * Its height and solid part are `--label-strip-edge` / `--label-strip-edge-solid`,
 * written by {@link TextareaLabelStrip} from the textarea's `scrollTop` and line height
 * on every scroll; unset (no layout, no script yet) the height is 0 and nothing shows.
 * A pseudo-element of the strip, so it inherits everything the strip already gets
 * right: shown only while the label is floated, the same horizontal insets (stopped
 * short of a classic scrollbar, on either side — RTL included), painted under the
 * label. Its colour is INHERITED from the strip (`bg-inherit`): `--bg-surface`, and the
 * disabled / `[readonly]` `--bg-surface-2`, in both themes, with no second copy of
 * those selectors to keep in step. The soft part is a mask over that colour (alpha
 * only — the `#000` is the mask's opacity, not a colour on screen).
 */
const TEXTAREA_LABEL_EDGE = cn(
  "after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-[var(--label-strip-edge,0px)] after:content-['']",
  "after:bg-inherit after:[mask-image:linear-gradient(#000_var(--label-strip-edge-solid,0px),transparent)]",
);

/** The soft edge over a line still more than half in view, in px: "a few pixels" —
 *  enough to take the cut off its letters, little enough to leave them legible. */
const LABEL_EDGE_SOFT_PX = 3;

/**
 * {@link TEXTAREA_LABEL_EDGE}'s height and solid part, in px, for a field scrolled
 * `scrollTop` with lines `lineHeight` tall.
 *
 * The strip covers the top padding exactly, so line boxes meet its lower edge whenever
 * `scrollTop` is a whole number of lines; `gone` is how far the line now on its way out
 * has passed under it, `left` how much of it is still below. A line height that is not
 * a length (`normal`) gives no line boxes to snap to: only the soft edge then.
 */
function labelEdge(scrollTop: number, lineHeight: number): { height: number; solid: number } {
  if (!(scrollTop > 0)) return { height: 0, solid: 0 };
  if (!(lineHeight > 0)) return { height: Math.min(scrollTop, LABEL_EDGE_SOFT_PX), solid: 0 };
  const gone = scrollTop % lineHeight;
  const left = gone === 0 ? 0 : lineHeight - gone;
  if (left > 0 && left <= lineHeight / 2) return { height: left, solid: left };
  return { height: Math.min(gone, LABEL_EDGE_SOFT_PX), solid: 0 };
}

/**
 * The backdrop of a labelled {@link Textarea}'s label strip (Kurvenschmiede, 0.24).
 *
 * The report: paste a long table into ColumnMapper, the field scrolls, and the floated
 * "Paste a table" / "Tabelle einfügen" sits ON the first visible line of text — on
 * desktop and on a phone. Not a ColumnMapper bug: every labelled textarea that scrolls
 * did it. An `<input>` has one line that never moves, so the strip FIELD_FLOATING_PAD
 * leaves for the label is always empty there; a textarea's top padding is part of its
 * SCROLLING area, and once the content scrolls the lines travel up through the strip
 * and under the label.
 *
 * The fix makes that padding stay put: this layer is a later sibling of the textarea
 * (so `peer-*` reaches it, and as a positioned box it paints above the textarea's
 * text), the label paints above it in turn, and it covers exactly the top padding —
 * `top-px` / `inset-x-px` inside the 1px border, `h-4` = `pt-4`. At rest it covers
 * padding and nothing else, so no pixel of an unscrolled line is ever hidden; scrolled
 * text slides out of sight under it instead of through the label.
 *
 * Why a layer and not "start the scrolling area below the strip" (a wrapper that draws
 * the border and background, the textarea transparent inside it): the box would stop
 * being the textarea. Its focus outline, its brand border on focus, the invalid ring,
 * the disabled and read-only greys and every caller's `[&_textarea]:…` would all have
 * to be rebuilt on the wrapper with `focus-within:` / `has-[…]:`, and a caller's
 * `style={{ height }}` would size the scroller rather than the field. The layer leaves
 * all of that exactly where it was.
 *
 * What it has to match, it matches from the same tokens the field uses: the surface is
 * FIELD_BASE's `--bg-surface`, and `--bg-surface-2` for `disabled` and `[readonly]` —
 * on the same ATTRIBUTE selector FIELD_BASE uses, for the reason given there. Focus and
 * `invalid` change only the border and the ring, which are outside the layer, so they
 * need nothing. Both themes come with the variables. The inner corners are the field's
 * radius (`rounded-md`, 0.375rem) less the 1px border, so the rounded border is never
 * cut into — `calc(0.375rem - 1px)` rather than `var(--radius-md)`, which Tailwind emits
 * only where a utility uses it and the kit's token check refuses (token-vars-declared).
 * Since 0.32 in rem (§3.2): the field's own corner grows with the text, so a fixed 5px
 * left the strip's corner square of the border's at 125 %.
 *
 * Hidden (`display: none`) until the label floats: an empty, unfocused field has
 * nothing that could scroll, and it renders exactly as it did before 0.24. Pointer
 * events pass through, so a click on the strip still lands in the field.
 *
 * The one thing CSS cannot know is a classic scrollbar's width, and a strip across the
 * whole inner width would hide the scrollbar's top arrow — see {@link TextareaLabelStrip}.
 *
 * Its lower edge, where a line scrolled half under it used to leave its tails showing,
 * is {@link TEXTAREA_LABEL_EDGE} (0.25).
 */
const TEXTAREA_LABEL_STRIP = cn(
  "pointer-events-none absolute inset-x-px top-px hidden h-4 rounded-t-[calc(0.375rem-1px)] bg-surface",
  // Never at Large (0.33, §10.17): the label stands above the field, so there is no
  // strip to keep scrolled text out of, and a layer here would hide the first line.
  "not-large:peer-focus:block not-large:peer-[:not(:placeholder-shown)]:block",
  "peer-disabled:bg-surface-2 peer-[[readonly]]:bg-surface-2",
  TEXTAREA_LABEL_EDGE,
);

/**
 * {@link TEXTAREA_LABEL_STRIP}, stopped short of a classic scrollbar.
 *
 * A Windows / Linux desktop draws a textarea's vertical scrollbar INSIDE the border, in
 * a gutter it takes from the content box (15px in Chromium); a strip across the full
 * inner width would sit on top of the scrollbar's up arrow. So the gutter is measured —
 * border box less client width less the borders — and the strip ends where it begins.
 * On whichever side it is: `clientLeft` includes a gutter on the LEFT, which is where
 * Chromium and Firefox put it in a right-to-left field. The side is applied as an
 * inline-start / inline-end inset, so when `dir` flips afterwards and the scrollbar
 * follows it to the other edge, the strip does too without a re-measure. That corner
 * also loses its rounding, since it no longer meets the border.
 *
 * Overlay scrollbars (macOS, phones) take no gutter: the measurement is zero and the
 * strip spans the field. A ResizeObserver on the textarea re-measures when the
 * scrollbar comes or goes (it takes the content box with it) and when the field is
 * resized by hand. Not laid out — hidden in a closed panel, or jsdom — the CSS insets
 * stand until it is.
 *
 * It also writes the strip's lower edge (0.25, {@link TEXTAREA_LABEL_EDGE}) from the
 * textarea's scroll position: a passive `scroll` listener, plus the same observer, since
 * a resize can move the scroll without the user scrolling.
 */
function TextareaLabelStrip() {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const strip = ref.current;
    const field = strip?.previousElementSibling;
    if (!strip || !(field instanceof HTMLTextAreaElement)) return;
    const fit = () => {
      if (field.offsetWidth === 0) return;
      const style = getComputedStyle(field);
      const borderLeft = parseFloat(style.borderLeftWidth) || 0;
      const borderRight = parseFloat(style.borderRightWidth) || 0;
      const gutter = field.offsetWidth - field.clientWidth - borderLeft - borderRight;
      // offsetWidth and clientWidth are whole pixels, so a field with no scrollbar can
      // read ±1 here; no scrollbar is that thin.
      const bar = gutter > 1.5;
      const onLeft = field.clientLeft - borderLeft > 1.5;
      // Kept as a LOGICAL side: a `dir` flipped later (a language switch) moves the
      // scrollbar across without resizing anything, so nothing would re-measure —
      // but it stays at the inline end, and so does an inline-end inset.
      const rtl = style.direction === "rtl";
      const atEnd = onLeft === rtl;
      const border = (end: boolean) => (end === rtl ? borderLeft : borderRight);
      strip.style.insetInlineEnd = bar && atEnd ? `${border(true) + gutter}px` : "";
      strip.style.insetInlineStart = bar && !atEnd ? `${border(false) + gutter}px` : "";
      strip.style.borderStartEndRadius = bar && atEnd ? "0" : "";
      strip.style.borderStartStartRadius = bar && !atEnd ? "0" : "";
    };
    // The edge under the strip follows the scroll — see TEXTAREA_LABEL_EDGE. The line
    // height is read each time, since a caller's class can change the type. Nothing to
    // draw is no property at all (the CSS default is a 0px edge), so a field at rest
    // carries exactly the strip it did in 0.24.
    const follow = () => {
      const edge = labelEdge(field.scrollTop, parseFloat(getComputedStyle(field).lineHeight));
      if (edge.height > 0) {
        strip.style.setProperty("--label-strip-edge", `${edge.height}px`);
        strip.style.setProperty("--label-strip-edge-solid", `${edge.solid}px`);
      } else {
        strip.style.removeProperty("--label-strip-edge");
        strip.style.removeProperty("--label-strip-edge-solid");
      }
    };
    fit();
    follow();
    field.addEventListener("scroll", follow, { passive: true });
    if (typeof ResizeObserver === "undefined") return () => field.removeEventListener("scroll", follow);
    // A resize can move the scroll too (a taller field clamps it).
    const observer = new ResizeObserver(() => {
      fit();
      follow();
    });
    observer.observe(field);
    return () => {
      field.removeEventListener("scroll", follow);
      observer.disconnect();
    };
  }, []);
  return <span ref={ref} aria-hidden data-slot="label-strip" className={TEXTAREA_LABEL_STRIP} />;
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldHelpProps {
  label?: ReactNode;
  /** See {@link Input}'s `invalid`. */
  invalid?: boolean;
  /** See {@link Input}'s `error`. */
  error?: ReactNode;
  /** See {@link Input}'s `hint` (keksdose K4): text is a caption under the field, a
   *  {@link FieldHint} rides the label line (or, unlabelled, the end edge). */
  hint?: ReactNode;
  /** See {@link Input}'s `showCount` (keksdose K11): a live "12/80" under the field,
   *  with `maxLength`, announced only near and at the limit. */
  showCount?: boolean;
  /** The counter's words. See {@link CharacterCountLabels}. */
  countLabels?: Partial<CharacterCountLabels>;
  /** The `<textarea>`. A React 19 ref prop since 0.34 — see {@link InputProps.ref}. */
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea(props: TextareaProps) {
  const { ref, className, label, id, placeholder, invalid, error, hint, help, showCount, countLabels, ...rest } = props;
  // See Input's `reserve`.
  const reserve = "error" in props || "hint" in props || "showCount" in props;
  const generated = useId();
  const fieldId = id ?? generated;
  const countId = useId();
  const hintParts = useFieldHint(hint, rest["aria-describedby"], { help, name: label ?? rest["aria-label"] });
  const maxLength = rest.maxLength;
  const counting = Boolean(showCount) && typeof maxLength === "number" && maxLength > 0;
  const length = useTypedLength(rest.value, rest.defaultValue);
  const countText = useCharacterCountLabels(countLabels);
  const { isInvalid, describedBy, errorEl } = useFieldError(
    error,
    invalid,
    mergeDescribedBy(hintParts.describedBy, counting && countId),
    rest["aria-invalid"],
  );
  const counter = counting ? (
    <CharacterCount
      id={countId}
      used={length.used}
      max={maxLength}
      labels={countText}
      caption={<FieldCaption parts={hintParts} className="mt-0" />}
    />
  ) : null;
  const below = fieldBelow(hintParts, counter, errorEl);
  const onChange = counting
    ? (e: ChangeEvent<HTMLTextAreaElement>) => {
        length.track(e.target.value);
        rest.onChange?.(e);
      }
    : rest.onChange;
  if (label === undefined) {
    const endHint = hintParts.labelHint;
    return (
      <FieldGroup errorEl={below} reserve={reserve}>
        <EndHintRow hint={endHint} className={className}>
          <textarea
            ref={ref}
            id={id}
            placeholder={placeholder}
            {...rest}
            aria-invalid={isInvalid || rest["aria-invalid"] || undefined}
            aria-describedby={describedBy}
            onChange={onChange}
            className={cn(FIELD_BASE, endHint === undefined && className, isInvalid && FIELD_INVALID)}
          />
        </EndHintRow>
      </FieldGroup>
    );
  }
  const ownPlaceholder = hasPlaceholderText(placeholder);
  return (
    <FieldGroup errorEl={below} reserve={reserve}>
      <FloatingField className={className} htmlFor={fieldId} label={label} hint={hintParts.labelHint}>
        <textarea
          ref={ref}
          id={fieldId}
          // The float trick's single space, unless the caller has a placeholder of its
          // own — then that, shown on focus once the label is out of its way (kastlan
          // 8, see FLOATING_PLACEHOLDER_ON_FOCUS).
          placeholder={ownPlaceholder ? placeholder : " "}
          {...rest}
          aria-invalid={isInvalid || rest["aria-invalid"] || undefined}
          aria-describedby={describedBy}
          onChange={onChange}
          className={cn(
            FLOATING_INPUT_CLASS,
            ownPlaceholder && FLOATING_PLACEHOLDER_ON_FOCUS,
            isInvalid && FIELD_INVALID,
          )}
        />
        {/* Between the textarea and the label, on purpose: after the textarea so it
            is its `peer` and paints over its text, before the label so the label
            paints over it. See TEXTAREA_LABEL_STRIP. */}
        <TextareaLabelStrip />
      </FloatingField>
    </FieldGroup>
  );
}
