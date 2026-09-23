import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, Check, Loader2, Pencil, PencilLine } from "lucide-react";
import { cn } from "../lib/cn";
import { Tooltip } from "./tooltip";
import { useKitLabels } from "../i18n/kit-labels";

/**
 * Sync state for a field backed by a database row.
 *
 * The four states a value can be in between the keyboard and the server:
 *
 *   synced   the draft equals what was last persisted
 *   edited   the draft differs and nothing has been sent yet
 *   pending  a save is in flight
 *   error    the last save was rejected; `error` carries why
 *
 * `useFieldSync` is the engine and holds no opinion about markup;
 * `FieldSyncIndicator` is the affordance and holds no state. They are separate
 * because the state is useful without the dot — a form can disable its submit
 * button while any field is `pending`, and a router can block navigation while
 * any field is `edited`.
 */
export type FieldSyncState = "synced" | "edited" | "pending" | "error";

export interface FieldSyncLabels {
  synced: string;
  edited: string;
  pending: string;
  /** Shown when the failure carries no message of its own. */
  error: string;
  retry: string;
}

export const DEFAULT_FIELD_SYNC_LABELS: FieldSyncLabels = {
  synced: "Saved",
  edited: "Unsaved changes",
  pending: "Saving…",
  error: "Could not save",
  retry: "Retry",
};

export function resolveFieldSyncLabels(labels?: Partial<FieldSyncLabels>): FieldSyncLabels {
  return labels ? { ...DEFAULT_FIELD_SYNC_LABELS, ...labels } : DEFAULT_FIELD_SYNC_LABELS;
}

export interface UseFieldSyncOptions<T> {
  /** What the database currently holds. Changing it re-seeds a CLEAN field. */
  value: T;
  /** Persist `next`. Reject — or throw — to put the field in `error`. */
  onSave: (next: T) => Promise<void> | void;
  /**
   * Quiet period before an edit saves itself, in ms. Default `0`: no auto-save at
   * all, so `save()` is the only way to persist — called on blur by `FieldSyncRow`,
   * and on Enter by the caller. Saving after a pause in typing wrote half-finished
   * values to the database whenever somebody stopped to think; pass a positive
   * number only for a field where that is genuinely wanted.
   */
  debounceMs?: number;
  /** How to tell two values apart. Defaults to `Object.is`. */
  equals?: (a: T, b: T) => boolean;
  /** Called once per rejected save, with whatever `onSave` threw. */
  onError?: (error: Error) => void;
}

export interface UseFieldSyncReturn<T> {
  /** The draft — bind this to the input, not the `value` option. */
  value: T;
  setValue: (next: T) => void;
  state: FieldSyncState;
  /** Non-null exactly when `state === "error"`. */
  error: Error | null;
  /** True whenever the draft differs from the last persisted value. */
  dirty: boolean;
  /** Persist now, cancelling any pending debounce. A no-op on a clean field. */
  save: () => void;
  /** Send the current draft again after a failure. */
  retry: () => void;
  /** Throw the draft away and go back to the last persisted value. */
  reset: () => void;
}

function toError(cause: unknown): Error {
  if (cause instanceof Error) return cause;
  // An EMPTY message for a rejection that carried none, not an English one: the
  // indicator shows `error.message` when there is one and the translated
  // `fieldSync.error` otherwise, so a fallback message here was an English sentence
  // that outranked the app's own translation. The original value stays on `cause`
  // for whoever logs it from `onError`.
  return new Error(typeof cause === "string" ? cause : "", { cause });
}

/**
 * Track one database-backed field: a local draft, a debounced save, and the state
 * of the round trip.
 *
 * Four things this handles that a `useState` + `useEffect` in a page does not:
 *
 *   1. **An edit during a save is never lost.** A save in flight is not cancelled
 *      and not raced — when it settles, the draft is compared again and sent once
 *      more if it moved. Cancelling instead would drop a keystroke that arrived
 *      mid-flight; firing immediately would let two writes land out of order.
 *   2. **The server value is only adopted when the field is clean.** An external
 *      refresh that overwrote what somebody was typing would be a data-loss bug, so
 *      a dirty draft wins and keeps winning until it is saved or reset.
 *   3. **Nothing is set after unmount.** The save resolves into a component that
 *      may be gone — a row scrolled out of a virtualised table, a closed dialog.
 *   4. **`onSave` is read through a ref**, so an inline arrow — which every call
 *      site will pass — does not restart the debounce on every render.
 */
export function useFieldSync<T>({
  value,
  onSave,
  debounceMs = 0,
  equals = Object.is,
  onError,
}: UseFieldSyncOptions<T>): UseFieldSyncReturn<T> {
  const [draft, setDraft] = useState<T>(value);
  const [state, setState] = useState<FieldSyncState>("synced");
  const [error, setError] = useState<Error | null>(null);

  // The last value known to be on the server. Not state: it changes together with
  // `state` inside the save, and a second render for it would be a wasted one.
  const savedRef = useRef<T>(value);
  const draftRef = useRef<T>(value);
  const inFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Latest-ref for the callbacks and comparators, so a caller passing inline
  // functions (all of them) does not invalidate the timer on every render.
  const onSaveRef = useRef(onSave);
  const onErrorRef = useRef(onError);
  const equalsRef = useRef(equals);
  useEffect(() => {
    onSaveRef.current = onSave;
    onErrorRef.current = onError;
    equalsRef.current = equals;
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const flush = useCallback(async () => {
    if (inFlightRef.current) return; // the settle path below picks the new draft up
    const next = draftRef.current;
    if (equalsRef.current(next, savedRef.current)) return;

    inFlightRef.current = true;
    setState("pending");
    setError(null);
    try {
      await onSaveRef.current(next);
      savedRef.current = next;
      inFlightRef.current = false;
      if (!mountedRef.current) return;
      // The draft may have moved while this was in the air. Compare against what is
      // on screen NOW, not against what was sent.
      if (equalsRef.current(draftRef.current, next)) {
        setState("synced");
      } else {
        setState("edited");
        void flush();
      }
    } catch (cause) {
      inFlightRef.current = false;
      const err = toError(cause);
      onErrorRef.current?.(err);
      if (!mountedRef.current) return;
      setState("error");
      setError(err);
    }
  }, []);

  const setValue = useCallback(
    (next: T) => {
      draftRef.current = next;
      setDraft(next);
      if (timerRef.current) clearTimeout(timerRef.current);

      if (equalsRef.current(next, savedRef.current)) {
        // Typed back to what the server already has. Nothing to send, and an error
        // from the previous attempt no longer describes anything.
        setState(inFlightRef.current ? "pending" : "synced");
        setError(null);
        return;
      }

      setState("edited");
      setError(null);
      if (debounceMs > 0) timerRef.current = setTimeout(() => void flush(), debounceMs);
    },
    [debounceMs, flush],
  );

  const save = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    void flush();
  }, [flush]);

  const retry = save;

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    draftRef.current = savedRef.current;
    setDraft(savedRef.current);
    setState(inFlightRef.current ? "pending" : "synced");
    setError(null);
  }, []);

  // Anything that is not `synced` has something not yet on the server: `edited` and
  // `error` obviously, and `pending` too — the write is in the air, not landed.
  // Derived from state rather than by comparing against `savedRef` during render,
  // because a ref read here would not re-render when the comparison's answer changes.
  const dirty = state !== "synced";

  // Adopt a new server value ONLY when there is nothing local to lose.
  useEffect(() => {
    if (inFlightRef.current) return;
    if (!equalsRef.current(draftRef.current, savedRef.current)) return; // dirty: keep it
    if (equalsRef.current(value, savedRef.current)) return; // unchanged
    savedRef.current = value;
    draftRef.current = value;
    setDraft(value);
    setState("synced");
    setError(null);
  }, [value]);

  return { value: draft, setValue, state, error, dirty, save, retry, reset };
}

const STATE_STYLE: Record<FieldSyncState, { color: string; Icon: typeof Check }> = {
  synced: { color: "var(--status-synced)", Icon: Check },
  edited: { color: "var(--status-edited)", Icon: Pencil },
  pending: { color: "var(--status-pending)", Icon: Loader2 },
  error: { color: "var(--status-error)", Icon: AlertCircle },
};

export interface FieldSyncIndicatorProps {
  state: FieldSyncState;
  /** The failure. Its message becomes the tooltip when `state === "error"`. */
  error?: Error | null;
  /** Override any of the five English defaults. */
  labels?: Partial<FieldSyncLabels>;
  /** Render the label beside the icon instead of only in the tooltip. */
  showLabel?: boolean;
  /** When given, the error state renders a retry button after the icon. */
  onRetry?: () => void;
  className?: string;
}

/**
 * The affordance for {@link useFieldSync}: a coloured icon, and the reason on hover.
 *
 * **Every state has its own icon, and that is not decoration.** The four colours
 * include the green/red pair, which is the one combination this package's palette
 * otherwise refuses (see the note in `tokens.css`) because red-green colour blindness
 * affects roughly one man in twelve. The icon is what carries the meaning for them,
 * and what carries it into a greyscale print or a screenshot. WCAG 1.4.1 is the same
 * requirement stated formally.
 *
 * The state is also announced: the wrapper is a polite live region, so a screen
 * reader hears "Saving…" then "Saved" without the user going looking. `error` is
 * assertive instead — a failed write is worth interrupting for.
 */
export function FieldSyncIndicator({
  state,
  error,
  labels,
  showLabel = false,
  onRetry,
  className,
}: FieldSyncIndicatorProps) {
  const l = useKitLabels("fieldSync", DEFAULT_FIELD_SYNC_LABELS, labels);
  const { color, Icon } = STATE_STYLE[state];
  const text =
    state === "error" ? (error?.message?.trim() ? error.message : l.error) : l[state];

  return (
    <span
      // The ICON carries the status colour; the words are `--text-secondary`, because
      // the amber of `edited` is a graphic colour (3:1), not a text colour (4.5:1).
      className={cn("inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]", className)}
      // Polite for the three ordinary states so save chatter does not interrupt
      // typing; assertive for a failure, which the user has to know about now.
      role={state === "error" ? "alert" : "status"}
      aria-live={state === "error" ? "assertive" : "polite"}
    >
      <Tooltip label={showLabel ? undefined : text} redact={state === "error"}>
        <span className="inline-flex items-center gap-1.5">
          <Icon
            aria-hidden
            style={{ color }}
            className={cn("size-3.5 shrink-0", state === "pending" && "animate-spin")}
          />
          {/* Always in the DOM, so the live region has something to announce even
              when the label is visually a tooltip. */}
          <span className={showLabel ? undefined : "sr-only"}>{text}</span>
        </span>
      </Tooltip>
      {state === "error" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color }}
        >
          {l.retry}
        </button>
      )}
    </span>
  );
}

/**
 * The field's own frame, coloured by state — applied from the WRAPPER to whatever
 * native control sits inside it, so {@link FieldSyncRow} works with any of the kit's
 * inputs (and a caller's own) without each one growing a `syncState` prop.
 *
 * Border AND a 1px ring, for the reason {@link FIELD_INVALID} gives: a lone 1px
 * border loses a vertical edge to sub-pixel spread at 125% display scaling. The
 * `:focus` twins are what keep the state visible while the reader is typing —
 * the base field class's `focus:` brand colour is `(0,2,0)` and would otherwise win
 * over a descendant selector exactly when the field is in use.
 *
 * `synced` is green, but {@link FieldSyncRow} paints it only for a moment after a
 * save lands — a form of eight permanently green boxes says nothing the absence of
 * colour does not.
 *
 * Every class is a literal so Tailwind's scanner can see it.
 */
export const FIELD_SYNC_FRAME: Record<FieldSyncState, string> = {
  synced:
    "[&_:is(input,select,textarea)]:border-[var(--status-synced)] [&_:is(input,select,textarea)]:ring-1 [&_:is(input,select,textarea)]:ring-[var(--status-synced)] [&_:is(input,select,textarea):focus]:border-[var(--status-synced)] [&_:is(input,select,textarea):focus]:ring-[var(--status-synced)]",
  edited:
    "[&_:is(input,select,textarea)]:border-[var(--status-edited)] [&_:is(input,select,textarea)]:ring-1 [&_:is(input,select,textarea)]:ring-[var(--status-edited)] [&_:is(input,select,textarea):focus]:border-[var(--status-edited)] [&_:is(input,select,textarea):focus]:ring-[var(--status-edited)]",
  pending:
    "[&_:is(input,select,textarea)]:border-[var(--status-pending)] [&_:is(input,select,textarea)]:ring-1 [&_:is(input,select,textarea)]:ring-[var(--status-pending)] [&_:is(input,select,textarea):focus]:border-[var(--status-pending)] [&_:is(input,select,textarea):focus]:ring-[var(--status-pending)]",
  error:
    "[&_:is(input,select,textarea)]:border-[var(--status-error)] [&_:is(input,select,textarea)]:ring-1 [&_:is(input,select,textarea)]:ring-[var(--status-error)] [&_:is(input,select,textarea):focus]:border-[var(--status-error)] [&_:is(input,select,textarea):focus]:ring-[var(--status-error)]",
};

/** How long the green "saved" frame and check stay after a save lands, in ms. */
export const FIELD_SYNC_SAVED_MS = 1500;

export interface FieldSyncRowProps<T> extends Omit<FieldSyncIndicatorProps, "state" | "error" | "showLabel"> {
  sync: UseFieldSyncReturn<T>;
  children: ReactNode;
  /** Call `sync.save()` when focus leaves the field. Default true — together with the
   *  hook's default `debounceMs: 0` this is "save on blur": nothing is written while
   *  the reader is still typing, however long they pause. */
  saveOnBlur?: boolean;
  /** How long the saved confirmation shows. Default {@link FIELD_SYNC_SAVED_MS}. */
  savedMs?: number;
}

/**
 * A field wearing its sync state — as its FRAME COLOUR and an ICON AT THE END OF THE
 * FIELD, so the field never changes size (a helper line appearing under it moved
 * everything below it on every save):
 *
 *   edited   amber frame, pencil          — changed, not yet saved
 *   pending  blue frame, spinning circle  — for as long as the save is in flight
 *   synced   green frame, check           — for {@link FIELD_SYNC_SAVED_MS} after a
 *                                            save lands, then an ordinary field again
 *   error    red frame, alert mark        — hover or focus the mark for the reason;
 *                                            click it to retry
 *
 * It saves when focus LEAVES the field (`saveOnBlur`), not after a pause in typing: a
 * database write in the middle of a word is a write nobody asked for. Enter in a
 * single-line field is the caller's to wire to `sync.save`.
 *
 * Colour is never the only signal: every state has its own icon, and the state text is
 * always in the DOM as a live region — polite for the ordinary states, assertive for
 * a failure. The input gets end padding for the icon whether or not one is showing,
 * so the text never reflows when the state changes.
 */
export function FieldSyncRow<T>({
  sync,
  children,
  className,
  labels,
  onRetry,
  saveOnBlur = true,
  savedMs = FIELD_SYNC_SAVED_MS,
}: FieldSyncRowProps<T>) {
  const l = useKitLabels("fieldSync", DEFAULT_FIELD_SYNC_LABELS, labels);
  const { state, error } = sync;
  const isError = state === "error";
  const text = isError ? (error?.message?.trim() ? error.message : l.error) : l[state];
  const retry = onRetry ?? sync.retry;

  // The saved confirmation: on only for the moment after a save lands. Keyed on the
  // TRANSITION pending → synced, so a field that starts synced shows nothing.
  const previous = useRef(state);
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => {
    const was = previous.current;
    previous.current = state;
    if (state === "synced" && was === "pending") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reacts to the save landing
      setJustSaved(true);
      const t = setTimeout(() => setJustSaved(false), savedMs);
      return () => clearTimeout(t);
    }
    if (state !== "synced") setJustSaved(false);
  }, [state, savedMs]);
  const shown: FieldSyncState | null = state === "synced" ? (justSaved ? "synced" : null) : state;

  return (
    <div
      data-field-sync={state}
      className={cn(
        // `relative` for the icon and for the sr-only live region's containing block.
        "relative [&_:is(input,select,textarea)]:pe-9",
        shown && FIELD_SYNC_FRAME[shown],
        className,
      )}
      onBlur={
        saveOnBlur
          ? (e) => {
              // Focus moving between two controls INSIDE the row is not leaving it.
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) sync.save();
            }
          : undefined
      }
    >
      {children}
      <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3">
        {state === "edited" && (
          <PencilLine aria-hidden className="size-4 text-[var(--status-edited)]" />
        )}
        {state === "pending" && (
          <Loader2 aria-hidden className="size-4 animate-spin text-[var(--status-pending)] motion-reduce:animate-none" />
        )}
        {state === "synced" && (
          <Check
            aria-hidden
            className={cn(
              "size-4 text-[var(--status-synced)] transition-opacity duration-500 motion-reduce:transition-none",
              justSaved ? "opacity-100" : "opacity-0",
            )}
          />
        )}
        {isError && (
          <Tooltip label={text} portal redact>
            <button
              type="button"
              onClick={retry}
              aria-label={l.retry}
              className="pointer-events-auto flex rounded-full text-[var(--status-error)] focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <AlertCircle aria-hidden className="size-4" />
            </button>
          </Tooltip>
        )}
      </span>
      <span
        role={isError ? "alert" : "status"}
        aria-live={isError ? "assertive" : "polite"}
        className="sr-only"
      >
        {shown === null ? "" : text}
      </span>
    </div>
  );
}
