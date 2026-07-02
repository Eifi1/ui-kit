import { forwardRef, useId, useState } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, MouseEvent, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "brand";

// Warm, palette-token-driven so buttons blend with the fields + cards in every theme.
// Actions default to a warm bordered look (primary = filled warm chip, secondary =
// outline); `brand` stays the solid accent for the rare strong CTA; danger stays red
// (destructive semantics). All focus rings use the brand accent.
const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] hover:bg-[var(--border)] focus:ring-[var(--brand)]",
  secondary:
    "border border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] focus:ring-[var(--brand)]",
  ghost:
    "bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] focus:ring-[var(--brand)]",
  danger: "bg-red-600 text-white hover:bg-red-500 focus:ring-red-300",
  brand:
    "bg-[var(--brand)] text-[var(--brand-contrast)] hover:bg-[var(--brand-hover)] focus:ring-[var(--brand)]",
};

export function Button({
  variant = "primary",
  stretch,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; stretch?: boolean }) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed",
        // In a flex row next to a taller labelled field, `stretch` makes the button
        // fill the field's height so the two line up (self-stretch overrides the row's
        // align-items). No effect outside a flex row / when it's already the tallest.
        stretch && "self-stretch",
        buttonVariantClasses[variant],
        className,
      )}
    />
  );
}

export const FIELD_BASE =
  "block w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-[var(--brand)] focus:ring-[var(--brand)] dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500";

// Extra top padding leaves room for a label that floats INSIDE the field (the
// "filled" pattern) — the label sits in the top strip, the value below it. Used by
// every labelled field (native + custom-dropdown triggers). twMerge lets pt/pb win
// over FIELD_BASE's py-2.
export const FIELD_FLOATING_PAD = "pt-4 pb-1";

// Error/required highlight for a field that is missing a value — a rose border
// and matching focus ring so the control itself shows what's wrong, not just a
// note beside it (feedback #235). Layered after FIELD_BASE so twMerge wins.
export const FIELD_INVALID =
  "border-rose-400 focus:border-rose-500 focus:ring-rose-500 dark:border-rose-500/80 dark:focus:border-rose-400";

export const FLOATING_INPUT_CLASS = cn(FIELD_BASE, FIELD_FLOATING_PAD, "peer placeholder:text-transparent");

// A field-styled button trigger for the custom dropdown controls (MultiSelect,
// CurrencySelect) — the field look (border/bg) as a flex row for the value + chevron,
// so they don't hand-copy the field classes. Add FIELD_FLOATING_PAD only when the
// trigger carries a label (unlabelled triggers stay normal height to match buttons /
// adjacent controls). Pair the labelled case with a static FieldLabel.
export const FIELD_TRIGGER = cn(
  FIELD_BASE,
  "flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800",
);

// Animated label that starts centred (as a placeholder) in an empty field and
// floats up INSIDE the top strip on focus or once the field has a value. Sits on
// the white field, so no background chip and nothing to mismatch the card.
export const FLOATING_LABEL_CLASS = cn(
  "pointer-events-none absolute left-3 top-2.5 text-sm text-slate-400 transition-all",
  "max-w-[calc(100%-1.5rem)] truncate",
  "peer-focus:top-1 peer-focus:text-[11px] peer-focus:leading-tight peer-focus:text-slate-600",
  "peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:leading-tight peer-[:not(:placeholder-shown)]:text-slate-600",
  "dark:text-slate-500 dark:peer-focus:text-slate-300 dark:peer-[:not(:placeholder-shown)]:text-slate-300",
  "peer-disabled:opacity-50",
);

// A field that always has a value (select / dropdown trigger) keeps the label
// permanently in the floated position — small, in the top strip, value below.
export const FLOATING_LABEL_STATIC = cn(
  "pointer-events-none absolute left-3 top-1 text-[11px] leading-tight text-slate-500 dark:text-slate-400 peer-disabled:opacity-50",
  "max-w-[calc(100%-1.5rem)] truncate",
);

/**
 * The one place that assembles a labelled field: a `relative` wrapper around the
 * control (`children`) plus a floating label inside the top strip. Pass `staticLabel`
 * for controls that always have a value (selects); omit it for free-text fields whose
 * label animates from centred→up. Used by Input/Select/Textarea/NumberInput; the
 * dropdown controls that need a ref + menu keep their own wrapper but the same label
 * (via {@link FieldLabel}) and trigger ({@link FIELD_TRIGGER}) styles.
 */
export function FloatingField({
  className,
  htmlFor,
  label,
  staticLabel,
  children,
}: {
  className?: string;
  htmlFor?: string;
  label?: ReactNode;
  staticLabel?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {label !== undefined && (
        <label htmlFor={htmlFor} className={staticLabel ? FLOATING_LABEL_STATIC : FLOATING_LABEL_CLASS}>
          {label}
        </label>
      )}
    </div>
  );
}

/**
 * The floating label for a custom-dropdown trigger (a `<span>`, since the trigger is a
 * button not a labelable input). Same placement as {@link FloatingField}'s static label,
 * so every labelled field lines up. Render inside a `relative` wrapper, before the trigger.
 */
export function FieldLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn(FLOATING_LABEL_STATIC, "z-10", className)}>
      {children}
    </span>
  );
}

// Native date/time inputs only reveal the calendar via the tiny trailing icon;
// open the picker on a click anywhere in the field instead (feedback #224).
const PICKER_TYPES = new Set(["date", "datetime-local", "month", "time", "week"]);

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode }
>(function Input({ className, label, id, placeholder, type, ...rest }, ref) {
  const generated = useId();
  const fieldId = id ?? generated;
  // Password fields get a reveal toggle so users can check what they typed.
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);
  const effectiveType = isPassword && revealed ? "text" : type;
  const handleClick = PICKER_TYPES.has(type ?? "")
    ? (e: MouseEvent<HTMLInputElement>) => {
        rest.onClick?.(e);
        try {
          // showPicker throws if unsupported or not user-activated — a click is
          // a valid activation, so this is safe; guard for older browsers.
          (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
        } catch {
          /* ignore */
        }
      }
    : rest.onClick;
  const revealToggle = isPassword ? (
    <button
      type="button"
      tabIndex={-1}
      onClick={() => setRevealed((v) => !v)}
      aria-label={revealed ? "Hide password" : "Show password"}
      aria-pressed={revealed}
      className="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
    >
      {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  ) : null;
  if (label === undefined) {
    if (!isPassword) {
      return (
        <input
          ref={ref}
          id={id}
          type={type}
          placeholder={placeholder}
          {...rest}
          onClick={handleClick}
          className={cn(FIELD_BASE, className)}
        />
      );
    }
    return (
      <div className={cn("relative", className)}>
        <input
          ref={ref}
          id={id}
          type={effectiveType}
          placeholder={placeholder}
          {...rest}
          className={cn(FIELD_BASE, "pr-9")}
        />
        {revealToggle}
      </div>
    );
  }
  return (
    <FloatingField className={className} htmlFor={fieldId} label={label}>
      <input
        ref={ref}
        id={fieldId}
        type={effectiveType}
        placeholder=" "
        {...rest}
        onClick={handleClick}
        className={cn(FLOATING_INPUT_CLASS, isPassword && "pr-9")}
      />
      {revealToggle}
    </FloatingField>
  );
});
Input.displayName = "Input";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { label?: ReactNode; invalid?: boolean }
>(function Select({ className, label, id, children, invalid, ...rest }, ref) {
  const generated = useId();
  const fieldId = id ?? generated;
  // Custom chevron (native arrow hidden via appearance-none) so it sits a touch
  // in from the right border and matches both themes — feedback #223.
  const chevron = (
    <ChevronDown
      aria-hidden
      className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
    />
  );
  if (label === undefined) {
    return (
      <div className={cn("relative", className)}>
        <select
          ref={ref}
          {...rest}
          aria-invalid={invalid || undefined}
          className={cn(FIELD_BASE, "appearance-none pr-9", invalid && FIELD_INVALID)}
        >
          {children}
        </select>
        {chevron}
      </div>
    );
  }
  return (
    <FloatingField className={className} htmlFor={fieldId} label={label} staticLabel>
      <select
        ref={ref}
        id={fieldId}
        {...rest}
        aria-invalid={invalid || undefined}
        className={cn(FIELD_BASE, FIELD_FLOATING_PAD, "peer appearance-none pr-9", invalid && FIELD_INVALID)}
      >
        {children}
      </select>
      {chevron}
    </FloatingField>
  );
});
Select.displayName = "Select";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: ReactNode }
>(function Textarea({ className, label, id, placeholder, ...rest }, ref) {
  const generated = useId();
  const fieldId = id ?? generated;
  if (label === undefined) {
    return (
      <textarea ref={ref} id={id} placeholder={placeholder} {...rest} className={cn(FIELD_BASE, className)} />
    );
  }
  return (
    <FloatingField className={className} htmlFor={fieldId} label={label}>
      <textarea ref={ref} id={fieldId} placeholder=" " {...rest} className={FLOATING_INPUT_CLASS} />
    </FloatingField>
  );
});
Textarea.displayName = "Textarea";

export function Card({
  className,
  children,
  flush,
}: {
  className?: string;
  children: ReactNode;
  /**
   * When true, drop the card chrome (border, rounded corners, shadow) on mobile so the
   * card spans edge-to-edge. Chrome reappears at the `md` breakpoint. Use for primary
   * content cards on data pages; leave off for centered dialog/panel cards.
   */
  flush?: boolean;
}) {
  return (
    <div
      className={cn(
        // Surface + border are theme tokens so the palette switcher (feedback
        // #307) can re-skin every card; a caller's own bg-*/border-* override
        // still wins via tailwind-merge.
        "bg-[var(--bg-surface)]",
        flush
          ? "border-y border-[var(--border)] md:rounded-lg md:border md:shadow-sm"
          : "rounded-lg border border-[var(--border)] shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-700 dark:border-t-slate-200",
        className,
      )}
    />
  );
}

export function EmptyState({
  title,
  hint,
  className,
}: {
  title: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400",
        className,
      )}
    >
      <div className="font-medium text-slate-700 dark:text-slate-200">{title}</div>
      {hint && <div className="mt-1 text-xs">{hint}</div>}
    </div>
  );
}

export interface TabsProps<T extends string> {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}

export function Tabs<T extends string>({ tabs, active, onChange, className }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex gap-1 overflow-x-auto overflow-y-hidden border-b border-slate-200 dark:border-slate-800",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none focus:ring-2 focus:ring-slate-300",
              isActive
                ? "border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
