import { forwardRef, useId, useState } from "react";
import type { ChangeEvent, FocusEvent } from "react";
import { useKitLabels } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import {
  PHONE_COUNTRIES,
  PHONE_DIAL_CODES,
  formatNationalPhone,
  formatPhone,
  isE164,
  parsePhone,
} from "../lib/phone";
import type { ParsedPhone, PhoneCountry, PhoneCountryCode } from "../lib/phone";
import { hasMessage, mergeDescribedBy } from "./choice-parts";
import { Input, Select, type InputProps } from "./ui";

// ── Labels ────────────────────────────────────────────────────────────────────

/** The words {@link PhoneInput} renders on its own behalf. */
export interface PhoneInputLabels {
  /** The country-code select's accessible name. */
  countryCode: string;
  /** The select's last option: a number from a country not listed, typed with its
   *  own "+". */
  other: string;
}

export const DEFAULT_PHONE_INPUT_LABELS: PhoneInputLabels = {
  countryCode: "Country code",
  other: "Other",
};

/**
 * The `phoneInput` namespace: prop > `<UiKitProvider labels>` > English (0.22.0).
 */
function usePhoneInputLabels(prop: Partial<PhoneInputLabels> | undefined): PhoneInputLabels {
  const labels: PhoneInputLabels = useKitLabels("phoneInput", DEFAULT_PHONE_INPUT_LABELS, prop);
  return labels;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** The caption and the error under the row — the type every kit field uses for them
 *  (Select's caption, Input's `error`). */
const CAPTION_CLASS = "mt-1 text-[11px] leading-tight text-[var(--text-muted)]";
const ERROR_CLASS = "mt-1 text-[11px] leading-tight text-[var(--danger)]";

const isTextHint = (hint: unknown): hint is string | number =>
  (typeof hint === "string" && hint !== "") || typeof hint === "number";

/** A stored value read back: an E.164 number these rules can read, else `null`. */
function storedNumber(value: string): ParsedPhone | null {
  return isE164(value) ? parsePhone(value, "other") : null;
}

/** The select's country for a stored E.164 value, or `null` for free text. */
function countryOf(value: string): PhoneCountry | null {
  const parsed = storedNumber(value);
  return parsed ? (parsed.country ?? "other") : null;
}

/** What the field emits for typed text: E.164 when it reads, the text unchanged when
 *  it does not. */
function emitFor(raw: string, country: PhoneCountry): string {
  return parsePhone(raw, country)?.e164 ?? raw;
}

/**
 * The text a stored value shows, outside of typing. Under its own country: the national
 * number grouped ("21 000 00 01" beside "CH +41"). Under another (a "+33" number while
 * the select says "Other"): the whole international number. Free text: as it is.
 */
function displayOf(value: string, country: PhoneCountry): string {
  const parsed = storedNumber(value);
  if (!parsed) return value;
  if (parsed.country !== null && parsed.country === country) {
    return formatNationalPhone(parsed.national, parsed.country);
  }
  return formatPhone(parsed.e164);
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface PhoneInputProps extends Omit<InputProps, "type" | "value" | "defaultValue"> {
  /** The number: E.164 ("+41210000001") for one the field could read, or free text —
   *  a value saved before the field existed is shown exactly as it is. `""` is no
   *  number. */
  value: string;
  /** On every change: E.164 when the typed text reads as a number of the selected
   *  country (or carries its own "+"), otherwise the typed text UNCHANGED. Nothing is
   *  refused — see {@link PhoneInput}. Plain `onChange` still fires with the raw event;
   *  bind this one to a form. */
  onValueChange?: (value: string) => void;
  /** The country a number typed without "+" belongs to, until the value says
   *  otherwise. Default `"CH"`. */
  defaultCountry?: PhoneCountry;
  /** The countries the select offers, in order; "Other" always follows. Default
   *  {@link PHONE_COUNTRIES} (CH, LI, DE, AT, FR, IT). A stored number from a country
   *  left out still shows under its own code. */
  countries?: readonly PhoneCountryCode[];
  /** See {@link PhoneInputLabels}. */
  labels?: Partial<PhoneInputLabels>;
  /** Classes for the whole field — the select, the input and the lines under them.
   *  `inputClassName` reaches the `<input>`. */
  className?: string;
}

/**
 * A phone number field (kastlan): a country-code select and the number, stored as
 * E.164 and shown grouped.
 *
 * kastlan's contacts kept whatever was typed — "079 …", "+41 (0)79 …", "0041 79 …" —
 * which nobody could dial from the app or match against the next import. This field
 * turns all of those into one stored form, "+41210000001", without taking anything
 * away from the person typing:
 *
 *  - **A country to type against.** The select (default CH, then LI, DE, AT, FR, IT
 *    and "Other") says which country a number without "+" belongs to; the national
 *    trunk 0 may be typed or left out. Typing a "+" or "00" overrides it, and the
 *    select follows the number ("+49 …" switches it to DE). Changing the select moves
 *    the national number to the new country code.
 *  - **E.164 when it reads, the text when it does not.** A number the rules read is
 *    emitted as E.164; anything else ("ask reception", an extension) is emitted exactly
 *    as typed. Never refused, never an error of its own: a contact's number is often
 *    known only roughly, and a field that will not save "079 … (mornings)" makes
 *    people type it into the notes instead. An app that needs a dialable number
 *    checks {@link isE164} on submit.
 *  - **Existing values untouched.** A free-text value from before is shown exactly as
 *    it is, and normalised only when someone edits it — the field never rewrites a
 *    record just by being opened.
 *  - **Grouped when settled.** While typing the field shows what was typed; on blur a
 *    number it read is regrouped by its country ("21 000 00 01").
 *
 * **The limitation** — there is no libphonenumber behind this (≈150 kB of metadata in
 * every bundle): the six countries have light rules (the trunk 0, a plausible length)
 * and every other country is any "+" with 8–15 digits. A well-formed number that does
 * not exist passes, and German and Austrian landlines, whose area codes vary in length,
 * are grouped only where the split is known (mobile prefixes, the largest cities) and
 * otherwise shown as one block. See `lib/phone.ts`.
 *
 * `label`, `hint`, `error` and `invalid` read as on {@link Input}: the label floats in
 * the number's box, and a text hint and the error go under the whole row, attached to
 * the number with `aria-describedby`. The select is named by `labels.countryCode`, and
 * the pair is a group named by a string `label`.
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  {
    value,
    onValueChange,
    onChange,
    onBlur,
    defaultCountry = "CH",
    countries = PHONE_COUNTRIES,
    labels,
    className,
    inputClassName,
    label,
    hint,
    error,
    invalid,
    disabled,
    "aria-describedby": ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const text = usePhoneInputLabels(labels);
  const [country, setCountry] = useState<PhoneCountry>(() => countryOf(value) ?? defaultCountry);
  // What was typed, shown for as long as it still reads as the value (AmountInput's
  // draft): the person's own spacing stays under their fingers, and is regrouped on
  // blur.
  const [draft, setDraft] = useState<string | null>(null);
  // The last value this field emitted, to tell its own echo from a value set outside.
  const [emitted, setEmitted] = useState<string | null>(null);
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    if (value !== emitted) {
      // Set from outside (a reset, another record): its own country, none of our text.
      const own = countryOf(value);
      if (own) setCountry(own);
      setDraft(null);
    }
  }

  const emit = (next: string) => {
    setEmitted(next);
    onValueChange?.(next);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
    const raw = e.target.value;
    setDraft(raw);
    const parsed = parsePhone(raw, country);
    // A number typed with its own "+" takes the select with it.
    if (parsed && parsed.country !== country) setCountry(parsed.country ?? "other");
    emit(parsed?.e164 ?? raw);
  };

  const handleCountry = (next: PhoneCountry) => {
    setCountry(next);
    const stored = storedNumber(value);
    if (stored) {
      // "Other", the same country, or a generic number with its own "+": the number
      // stays, only the way it is shown changes.
      if (next === "other" || stored.country === null || stored.country === next) {
        setDraft(null);
        return;
      }
      // A different listed country: the national number moves to its code. If it does
      // not read there, the digits are kept as text for the person to finish.
      emit(parsePhone(stored.national, next)?.e164 ?? stored.national);
      setDraft(null);
      return;
    }
    // Free text (or a draft): read it again under the new country.
    const source = draft ?? value;
    const parsed = source.trim() === "" ? null : parsePhone(source, next);
    if (parsed && parsed.e164 !== value) {
      setDraft(source);
      emit(parsed.e164);
    }
  };

  const display = draft !== null && emitFor(draft, country) === value ? draft : displayOf(value, country);

  // The select offers the configured countries, plus the stored number's own if it
  // is not among them — a select cannot show a value it has no option for.
  const options: PhoneCountryCode[] = [...countries];
  if (country !== "other" && !options.includes(country)) options.push(country);

  const captionId = useId();
  const errorId = useId();
  const caption = isTextHint(hint);
  const showError = hasMessage(error);
  const named = typeof label === "string" && label !== "";

  return (
    <div
      className={className}
      role={named ? "group" : undefined}
      aria-label={named ? label : undefined}
    >
      <div className="flex items-stretch gap-2">
        <Select
          aria-label={text.countryCode}
          value={country}
          disabled={disabled}
          onChange={(e) => handleCountry(e.target.value as PhoneCountry)}
          className="w-28 shrink-0"
          // Stretched to the number's height: a labelled field is taller than an
          // unlabelled select, and the pair should read as one row.
          selectClassName="h-full tabular-nums"
        >
          {options.map((code) => (
            <option key={code} value={code}>
              {`${code} +${PHONE_DIAL_CODES[code]}`}
            </option>
          ))}
          <option value="other">{text.other}</option>
        </Select>
        {/* Its own flex item, so nothing Input wraps itself in can take the sizing. */}
        <div className="min-w-0 flex-1">
          <Input
            ref={ref}
            {...rest}
            type="tel"
            autoComplete={rest.autoComplete ?? "tel"}
            label={label}
            // A FieldHint "?" rides the label line; text goes under the whole row.
            hint={caption ? undefined : hint}
            invalid={invalid || showError}
            aria-describedby={mergeDescribedBy(ariaDescribedBy, caption && captionId, showError && errorId)}
            disabled={disabled}
            value={display}
            onChange={handleChange}
            onBlur={(e: FocusEvent<HTMLInputElement>) => {
              setDraft(null);
              onBlur?.(e);
            }}
            inputClassName={cn("tabular-nums", inputClassName)}
          />
        </div>
      </div>
      {caption && (
        <p id={captionId} className={CAPTION_CLASS}>
          {hint}
        </p>
      )}
      {showError && (
        <p id={errorId} className={ERROR_CLASS}>
          {error}
        </p>
      )}
    </div>
  );
});
PhoneInput.displayName = "PhoneInput";
