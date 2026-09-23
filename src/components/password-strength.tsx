import { useEffect, useRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../lib/cn";
import { useAnnounce } from "../hooks/use-announce";
import { useKitLabels } from "../i18n/kit-labels";

/**
 * The bar, the word and the advisory checklist under a field where someone is
 * CHOOSING a secret.
 *
 * Ported from Keksdose (`features/auth/password-strength-meter.tsx`), where one meter
 * sits under the sign-in password and the encryption passphrase alike — a copy per
 * form is what had let the passphrase dialogs ship with no meter at all. Three things
 * changed on the way in:
 *
 *  1. **Tokens, not palette.** The four fills were red/amber/lime/emerald utilities;
 *     they are `--danger` → `--warning` → `--success` now, so a consumer re-pointing
 *     those families re-skins the meter with them.
 *  2. **Not colour alone.** The level is always written out beside the bar, and each
 *     checklist item says "met" / "not met" to a screen reader — the ✓/○ glyphs are
 *     decoration and hidden.
 *  3. **Announced.** A level change is spoken through a polite live region
 *     ({@link useAnnounce}); the bar itself is `aria-hidden`, because four coloured
 *     strips read out as four empty groups.
 *
 * Advisory only, as in Keksdose: nothing here blocks a submit. The caller decides what
 * is required — {@link passwordRules} marks `length` as the one rule that usually is,
 * so a form can gate on it with the same function the checklist draws from.
 *
 * Dependency-free on purpose. zxcvbn is ~400 kB of dictionaries, and neither consumer
 * ships it; a host that does can pass its scorer as `score` and keep the rest.
 */

/* ── The scorer ──────────────────────────────────────────────────────────── */

/** 0 = too short (or empty), 4 = strong. */
export type PasswordStrengthScore = 0 | 1 | 2 | 3 | 4;

export type PasswordRuleId = "length" | "case" | "digit" | "symbol";

export interface PasswordRule {
  id: PasswordRuleId;
  met: boolean;
  /** Only `length` is required; the rest are suggestions. */
  required: boolean;
}

export interface PasswordScoreOptions {
  /** The length below which a secret is "too short", whatever else it has. Keep it
   *  in step with the server's own minimum. Default 8. */
  minLength?: number;
}

const DEFAULT_MIN_LENGTH = 8;

/** The checklist's rules, evaluated. Pure; the order is the order they are shown in. */
export function passwordRules(value: string, { minLength = DEFAULT_MIN_LENGTH }: PasswordScoreOptions = {}): PasswordRule[] {
  return [
    // Code points, not UTF-16 units: an emoji is one character to the person typing it.
    { id: "length", met: [...value].length >= minLength, required: true },
    { id: "case", met: /\p{Ll}/u.test(value) && /\p{Lu}/u.test(value), required: false },
    { id: "digit", met: /\p{Nd}/u.test(value), required: false },
    { id: "symbol", met: /[^\p{L}\p{N}\s]/u.test(value), required: false },
  ];
}

/**
 * A 0–4 strength bucket. Length dominates, because it genuinely dominates real-world
 * guessing cost: one step each at `minLength`, `minLength + 4` and `minLength + 8`,
 * and one more for at least two of the three variety rules.
 *
 * One addition over Keksdose's curve: a secret with fewer than four DISTINCT
 * characters caps at 1. Sixteen `a`s are long, and nothing about them is strong.
 */
export function scorePassword(value: string, options: PasswordScoreOptions = {}): PasswordStrengthScore {
  const minLength = options.minLength ?? DEFAULT_MIN_LENGTH;
  const chars = [...value];
  // Under the minimum is never anything but "too short", however varied.
  if (chars.length === 0 || chars.length < minLength) return 0;
  let score = 1;
  if (chars.length >= minLength + 4) score += 1;
  if (chars.length >= minLength + 8) score += 1;
  const variety = passwordRules(value, { minLength }).filter((r) => !r.required && r.met).length;
  if (variety >= 2) score += 1;
  if (new Set(chars).size < 4) score = 1;
  return Math.min(score, 4) as PasswordStrengthScore;
}

/** UTF-8 byte length — what a bcrypt-style ceiling counts. "ü" is two, an emoji four. */
export function passwordByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/* ── Labels ──────────────────────────────────────────────────────────────── */

/** Every string the meter renders or speaks. */
export interface PasswordStrengthLabels {
  /** The five level names, shown beside the bar. Score 0 … 4. */
  tooShort: string;
  weak: string;
  fair: string;
  good: string;
  strong: string;
  /** What the live region says when the level changes, given the level's name. */
  announcement: (level: string) => string;
  /** The length rule, given the minimum. */
  ruleLength: (minLength: number) => string;
  ruleCase: string;
  ruleDigit: string;
  ruleSymbol: string;
  /** A suggestion rather than a requirement, given the rule's text. */
  optional: (rule: string) => string;
  /** Screen-reader-only state before each checklist item — the ✓/○ are hidden. */
  met: string;
  notMet: string;
  /** Shown when the value is over `maxBytes`, given that ceiling. */
  tooLong: (maxBytes: number) => string;
}

export const DEFAULT_PASSWORD_STRENGTH_LABELS: PasswordStrengthLabels = {
  tooShort: "Too short",
  weak: "Weak",
  fair: "Fair",
  good: "Good",
  strong: "Strong",
  announcement: (level) => `Password strength: ${level}`,
  ruleLength: (minLength) => `At least ${minLength} characters`,
  ruleCase: "Upper and lower case",
  ruleDigit: "A number",
  ruleSymbol: "A symbol",
  optional: (rule) => `${rule} (optional)`,
  met: "Met:",
  notMet: "Not met:",
  tooLong: (maxBytes) =>
    `At most ${maxBytes} characters (accents and emoji count for more than one).`,
};

const LEVEL_KEYS = ["tooShort", "weak", "fair", "good", "strong"] as const;

/* ── The meter ───────────────────────────────────────────────────────────── */

// The filled segments' colour per score. "Good" sits between the warning and the
// success hue rather than borrowing either, so 3 and 4 differ in colour as well as in
// segment count. Index 0 is never drawn — a too-short secret fills no segment.
const FILL: Record<PasswordStrengthScore, string> = {
  0: "",
  1: "bg-[var(--danger)]",
  2: "bg-[var(--warning)]",
  3: "bg-[color-mix(in_oklab,var(--success)_60%,var(--warning))]",
  4: "bg-[var(--success)]",
};

export interface PasswordStrengthMeterProps extends ComponentPropsWithoutRef<"div"> {
  /** The secret being chosen. Nothing visible renders while it is empty. */
  value: string;
  /** Replace the built-in scorer (e.g. with zxcvbn's `score`). Must be pure. */
  score?: (value: string) => PasswordStrengthScore;
  /** See {@link PasswordScoreOptions.minLength}. Drives the built-in scorer and the
   *  length rule's text. */
  minLength?: number;
  /** Show the checklist under the bar. Default `true`. */
  showRequirements?: boolean;
  /**
   * A byte ceiling to warn about, if the secret has one — bcrypt reads at most 72
   * BYTES. Leave it unset for a secret that has none (a passphrase stretched in the
   * browser): inventing one talks people out of the long passphrase they chose.
   */
  maxBytes?: number;
  /** User-facing strings; see {@link PasswordStrengthLabels}. */
  labels?: Partial<PasswordStrengthLabels>;
}

/**
 * Render directly under the password field. To have the field itself describe its
 * strength, give this an `id` and point the input's `aria-describedby` at it.
 */
export function PasswordStrengthMeter({
  value,
  score: scoreProp,
  minLength = DEFAULT_MIN_LENGTH,
  showRequirements = true,
  maxBytes,
  labels: labelsProp,
  className,
  ...rest
}: PasswordStrengthMeterProps) {
  // Prop > <UiKitProvider> > English, like every labelled component in the kit.
  const labels = useKitLabels("passwordStrength", DEFAULT_PASSWORD_STRENGTH_LABELS, labelsProp);
  const { announce, regionProps } = useAnnounce();

  const empty = value.length === 0;
  const score = empty ? 0 : scoreProp ? scoreProp(value) : scorePassword(value, { minLength });
  const level = labels[LEVEL_KEYS[score]];

  // Speak on a CHANGE of level only — not on every keystroke, and not on mount (a
  // prefilled field has not changed anything). Clearing the field says nothing: the
  // user did that on purpose and the meter disappearing is the whole news.
  const previous = useRef(score);
  useEffect(() => {
    if (previous.current === score) return;
    previous.current = score;
    if (!empty) announce(labels.announcement(level));
  }, [score, empty, level, labels, announce]);

  const rules = passwordRules(value, { minLength });
  const ruleText: Record<PasswordRuleId, string> = {
    length: labels.ruleLength(minLength),
    case: labels.ruleCase,
    digit: labels.ruleDigit,
    symbol: labels.ruleSymbol,
  };
  const tooLong = maxBytes !== undefined && passwordByteLength(value) > maxBytes;

  return (
    <div {...rest} className={cn("mt-1.5 space-y-1", className)}>
      {/* Rendered from the start and never unmounted — see useAnnounce. */}
      <div {...regionProps} />
      {!empty && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-1" aria-hidden="true" data-score={score}>
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={cn(
                    "h-1 flex-1 rounded-full",
                    step <= score ? FILL[score] : "bg-[var(--border)]",
                  )}
                />
              ))}
            </div>
            <p className="min-w-[4.5rem] text-end text-xs text-[var(--text-secondary)]">{level}</p>
          </div>
          {showRequirements && (
            <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
              {rules.map((r) => (
                <li
                  key={r.id}
                  // `relative`: the sr-only state needs a local containing block.
                  className={cn(
                    "relative",
                    r.met ? "text-[var(--success)]" : "text-[var(--text-muted)]",
                  )}
                  data-met={r.met}
                >
                  <span className="sr-only">{r.met ? labels.met : labels.notMet} </span>
                  <span aria-hidden="true">{r.met ? "✓" : "○"}</span>{" "}
                  {r.required ? ruleText[r.id] : labels.optional(ruleText[r.id])}
                </li>
              ))}
            </ul>
          )}
          {tooLong && <p className="text-xs text-[var(--danger)]">{labels.tooLong(maxBytes)}</p>}
        </>
      )}
    </div>
  );
}
