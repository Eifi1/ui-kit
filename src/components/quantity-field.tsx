import { useId } from "react";
import type { ReactNode } from "react";
import { QuantityRow, DEFAULT_QUANTITY_LABELS, type QuantityInputProps } from "./quantity-input";
import { FIELD_CAPTION_CLASS, mergeDescribedBy, useFieldMessages, type FieldHelpProps } from "./field-parts";
import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { dataAttributes } from "../lib/data-attributes";
import { hasContent } from "../lib/presence";
import { formatQuantity, type Quantity } from "../lib/quantity";

/** {@link QuantityField}'s props: {@link QuantityInput}'s, and a field's anatomy. */
export interface QuantityFieldProps extends QuantityInputProps, FieldHelpProps {
  /** The visible label, floating in the amount's box as NumberField's does. Without one,
   *  name the field with `aria-label`. */
  label?: ReactNode;
  /** A fact under the field, on its description — or a `FieldHint` on the label's line
   *  (its words at Large and on touch, §4) — as on every kit field. */
  hint?: ReactNode;
  /** What is wrong, in the caller's words: under the field, on its description, and it
   *  paints both controls. `null`, `false` and `""` are no message. */
  error?: ReactNode;
  /** Announced as required (`aria-required` on the amount). Whether it IS required is the
   *  form's validation to say. */
  required?: boolean;
  /**
   * A quantity to take with one tap — the household's usual pack, the last one bought: a
   * line under the field, "Suggested · 500 g", whose quantity is a button that sets the
   * value to it (amount and unit). Shown while it is passed and has an amount; the app
   * stops passing it when it no longer applies. Taking it when the value already is it
   * changes nothing, so the button keeps its place and its focus.
   */
  suggestion?: Quantity;
  /** Where the suggestion comes from, in the app's words ("Usual pack", "Last time") —
   *  FieldSuggestion's `from`. Default the kit's "Suggested" (`quantity.suggested`). */
  suggestionFrom?: ReactNode;
  /** The field's box — a width, a grid cell. `inputClassName` and `selectClassName`
   *  reach the two controls. */
  className?: string;
}

/** Two quantities that say the same: same unit, same amount. */
function same(a: Quantity, b: Quantity): boolean {
  return a.unit === b.unit && Object.is(a.amount, b.amount);
}

/**
 * {@link QuantityInput} as a labelled field: the label floating in the amount's box, the
 * unit select beside it, and under both the suggestion to take, the caption and the error.
 *
 * ```tsx
 * <QuantityField
 *   label="Flour"
 *   family="mass"
 *   value={qty}
 *   onChange={setQty}
 *   suggestion={{ amount: 1, unit: "kg" }}
 *   suggestionFrom="Usual pack"
 * />
 * ```
 *
 * The amount and the unit are one field to a screen reader: the amount is named by the
 * label, the select "Unit for “<label>”", and both are described by the same suggestion,
 * caption and error. Tab goes amount → unit → the suggestion's button.
 *
 * `className` is the field's box (a width, a grid cell); `inputClassName` and
 * `selectClassName` reach the two controls.
 */
export function QuantityField(props: QuantityFieldProps) {
  return <QuantityFieldBody {...props} />;
}

/** @internal QuantityField, with the name its unit select is called by when the label is
 *  drawn outside it — RhfQuantityField's, above. Not on the barrel. */
export function QuantityFieldBody(props: QuantityFieldProps & { fieldName?: string }) {
  const {
    ref,
    label,
    hint,
    help,
    error,
    required,
    suggestion,
    suggestionFrom,
    fieldName,
    className,
    invalid,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    "aria-required": ariaRequired,
    ...rest
  } = props;
  const labels = useKitLabels("quantity", DEFAULT_QUANTITY_LABELS, rest.labels);
  const locale = useKitLocale(rest.locale);
  const name = label ?? rest["aria-label"];

  const offer = suggestion !== undefined && suggestion.amount !== null && Number.isFinite(suggestion.amount);
  const suggestionId = useId();
  // The suggestion first — it is about the value, nearest the control — then the caption
  // and the error, the order every kit field reads its description in.
  const messages = useFieldMessages({
    hint,
    help,
    name,
    error,
    invalid,
    describedBy: mergeDescribedBy(ariaDescribedBy, offer && suggestionId),
    ariaInvalid,
  });

  const shown = offer ? formatQuantity(suggestion, locale, { labels }) : "";
  const take = () => {
    if (!offer || rest.disabled) return;
    if (!same(suggestion, rest.value)) rest.onChange({ amount: suggestion.amount, unit: suggestion.unit });
  };

  // The data-* props tag the field's box, not the row inside it.
  const rowProps = Object.fromEntries(Object.entries(rest).filter(([key]) => !key.startsWith("data-"))) as typeof rest;

  return (
    <div {...dataAttributes(props)} className={className}>
      <QuantityRow
        {...rowProps}
        ref={ref}
        label={label}
        labelHint={messages.labelHint}
        fieldName={fieldName}
        aria-describedby={messages.describedBy}
        aria-required={required || ariaRequired || undefined}
        invalid={messages.isInvalid}
      />
      {offer && (
        <p id={suggestionId} data-slot="quantity-suggestion" className={FIELD_CAPTION_CLASS}>
          {hasContent(suggestionFrom) ? suggestionFrom : labels.suggested}
          <span aria-hidden="true"> · </span>
          <button
            type="button"
            onClick={take}
            disabled={rest.disabled}
            aria-label={labels.takeSuggestion(shown)}
            // FieldSuggestion's text button: the caption's type, underlined as the kit's
            // secondary TextLink is; the focus outline follows a wrapped line.
            className={cn(
              "rounded-sm font-medium text-secondary underline underline-offset-2 transition-colors hover:text-primary",
              "focus-visible:outline-focus focus-visible:outline-offset-2 focus-visible:outline-brand",
              "disabled:cursor-default disabled:no-underline disabled:opacity-50",
            )}
          >
            {shown}
          </button>
        </p>
      )}
      {messages.below}
    </div>
  );
}
