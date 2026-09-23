import { forwardRef, useRef } from "react";
import type { InputHTMLAttributes } from "react";
import { Search, X } from "lucide-react";
import { cn } from "../lib/cn";
import { FIELD_BASE } from "./ui";

interface SearchFieldOwnProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type" | "aria-label"
  > {
  value: string;
  /** The typed text. Emitted as a plain string, not an event: every caller of the
   *  four this replaced wanted the string, and one of them held it in a URL param
   *  rather than in state. */
  onChange: (value: string) => void;
  /**
   * The field's accessible name.
   *
   * @deprecated Pass `aria-label` instead — the DOM spelling this kit standardised on
   * when it found three names for one idea (`ariaLabel`, `aria-label`, and this).
   * Unchanged and still supported; it names the field only when `aria-label` is
   * absent, so a consumer can migrate one call site at a time.
   */
  label?: string;
  /** Names the clear button. Omit it and no clear button is rendered — which is a
   *  decision, not a default: a filter you can type into and not untype is the
   *  complaint that produced the button on three of these four screens. */
  clearLabel?: string;
}

/**
 * One of the two spellings is REQUIRED, and the union is how that survives the
 * deprecation. Making `label` merely optional would have been the easy change and the
 * wrong one: the whole reason this component exists is that two of the four boxes it
 * replaced were named by nothing but their placeholder — which disappears the moment
 * someone types, i.e. exactly when a screen-reader user is working in the field. A
 * caller now has a choice of spelling; it still has no option to pass neither.
 */
export type SearchFieldProps = SearchFieldOwnProps &
  ({ "aria-label": string; label?: string } | { label: string; "aria-label"?: string });

/**
 * The page-level filter box: a search icon, a `type="search"` input, and a clear
 * "×" that appears once there is something to clear.
 *
 * ## Why it is a component
 *
 * Keksdose had four of these and no two agreed. Two were character-identical
 * twenty-line copies (the settings catalogue filter and the tour list filter) —
 * the same absolute icon at `left-3`, the same `pl-9 pr-9`, the same
 * `[&::-webkit-search-cancel-button]:appearance-none`, the same conditional clear
 * button at `right-2` — differing only in which state setter they called. The
 * third (the admin support queue) was the same idea at `left-2`/`size-3.5`/`pl-7`
 * with no clear button and no `type="search"`, so it had neither the `searchbox`
 * role nor a way to empty itself. The fourth (the bank picker) was a bare `<Input
 * placeholder="Search">`: no icon, no clear, and no accessible name at all once
 * the placeholder went away.
 *
 * None of that is a design decision anyone made; it is four people solving the
 * same problem on four days. A shared component is how the fourth screen gets the
 * clear button the first one earned.
 *
 * ## The two X's
 *
 * `type="search"` is what gives the field its `searchbox` role — and, in Chrome, a
 * NATIVE clear cross that paints right next to ours, so a non-empty box shows two
 * X's an inch apart. Ours is the one that survives: it carries an accessible name
 * and matches the app's other icon buttons, and it returns focus to the input so
 * the next query can be typed straight away.
 */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { value, onChange, label, clearLabel, className, placeholder, "aria-label": ariaLabel, ...rest },
  ref,
) {
  const innerRef = useRef<HTMLInputElement>(null);
  // Whichever spelling the caller used. It is the accessible name AND the placeholder
  // fallback, so a box named only by `aria-label` still says what it is before anyone
  // has typed in it — the same deal `label` has always had.
  const name = ariaLabel ?? label;
  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-placeholder)]"
      />
      <input
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={name}
        placeholder={placeholder ?? name}
        // Keksdose live #333: *"Entering the search here — is that set as password?
        // … I got prompted for remembering my name or mail address"*, typed into the
        // settings filter on a phone.
        //
        // A `type="search"` input with no `name` and no `autocomplete` is a field
        // Chrome's autofill classifies by GUESSWORK, from the labels around it and
        // the other fields on the page — and a settings page has an email and a
        // password on it. Naming the field and declaring the intent is what takes it
        // out of that guess: `autocomplete="off"` says it is not part of any profile,
        // and a `name` of "search" is the strongest hint the heuristics take.
        //
        // The three that follow are not about autofill but about the same keyboard:
        // a filter box that capitalises the first letter and autocorrects "2fa" to
        // "2FA" is fighting the person typing into it. Declared BEFORE `{...rest}` so
        // a caller with a reason can still override any of them.
        name="search"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        {...rest}
        className={cn(
          FIELD_BASE,
          "pl-9",
          // Room for our own "×" only when there is one; a field that can't be
          // cleared has no reason to reserve the space.
          clearLabel === undefined ? "pr-3" : "pr-9",
          "[&::-webkit-search-cancel-button]:appearance-none",
        )}
      />
      {clearLabel !== undefined && value !== "" && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            // Clearing is the start of the next query far more often than it is the
            // end of this one, so the caret stays where it can be typed into.
            innerRef.current?.focus();
          }}
          aria-label={clearLabel}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-placeholder)] hover:text-[var(--text-secondary)]"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
});
SearchField.displayName = "SearchField";
