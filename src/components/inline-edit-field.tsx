import { useEffect, useId, useRef, useState } from "react";
import type { FocusEvent, InputHTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { cn } from "../lib/cn";
import { useAnnounce } from "../hooks/use-announce";
import { useKitLabels } from "../i18n/kit-labels";
import { Input, Spinner } from "./ui";
import { FOCUS_RING } from "./focus-ring";
import { Tooltip } from "./tooltip";
import { useCommitReason, type CommitScope } from "./write-lock";

/**
 * Every string {@link InlineEditField} says on its own behalf — the `inlineEdit`
 * namespace of `<UiKitProvider labels>`, overridable per instance through `labels`.
 */
export interface InlineEditLabels {
  /** The display button's tooltip and description — what pressing it does. Receives
   *  the field's `label` ("Budget name" → "Edit Budget name"). */
  edit: (label: string) => string;
  /** Shown (and spoken) when `onCommit` rejects and no `formatError` says better. */
  failed: string;
  /** What the display shows for an empty value, when no `placeholder` is given. */
  empty: string;
}

export const DEFAULT_INLINE_EDIT_LABELS: InlineEditLabels = {
  edit: (label) => `Edit ${label}`,
  failed: "The change could not be saved.",
  empty: "Empty",
};

/** What an `editor` render prop is handed: the draft and the means to end the edit. */
export interface InlineEditorProps<T> {
  /** The draft — seeded from `value` each time the editor opens. */
  value: T;
  /** Replace the draft (every keystroke). */
  onChange: (next: T) => void;
  /**
   * End the edit and save. Without an argument it saves the draft; WITH one it saves
   * that — for an editor whose own commit hands over a resolved value (`NumberInput`'s
   * `onCommit` gives "1050" for a typed "1100-50"). Called twice (the editor's own
   * Enter, then the field's), the second call does nothing.
   */
  commit: (next?: T) => void;
  /** End the edit and drop the draft — what Escape does. */
  cancel: () => void;
  /** The save is in flight: make the control read-only (not disabled — it has focus). */
  pending: boolean;
  /** The field's `label`, for the control's accessible name. */
  label: string;
  /** The last save failed and the draft has not been touched since. */
  invalid: boolean;
  /** The id of the failure message while there is one, for `aria-describedby`. */
  describedBy: string | undefined;
  /** The four above as attributes — spread them on a kit field that takes the DOM
   *  spelling: `<AmountInput {...p.inputProps} … />`. */
  inputProps: {
    "aria-label": string;
    "aria-invalid": true | undefined;
    "aria-describedby": string | undefined;
    readOnly: boolean;
  };
}

interface InlineEditFieldBaseProps<T> {
  /** The saved value — what the display shows, and what the editor opens on. */
  value: T;
  /**
   * Save `next`. Return a promise and the field waits: the editor stays open and
   * read-only with a spinner until it settles, closes when it resolves, and STAYS OPEN
   * with the failure under it when it rejects (or throws) — the typed value is kept for
   * a retry. Not called when the draft equals `value` (see `isEqual`): opening the
   * editor and leaving it unchanged is not a write.
   */
  onCommit: (next: T) => void | Promise<unknown>;
  /** What the value is ("Budget name", "Assigned") — the editor's accessible name and
   *  the subject of the display's "Edit …" description. Not drawn: inline, the row or
   *  the column header is the visible label. */
  label: string;
  /** The value as the display shows it — a formatted amount, a date. Default: the
   *  value as text. */
  display?: (value: T) => ReactNode;
  /** Whether the draft is unchanged, so leaving the editor is not a write. Default
   *  `Object.is`. keksdose compares assigned amounts as NUMBERS — "1100" is the
   *  server's "1100.0000". */
  isEqual?: (a: T, b: T) => boolean;
  /** What the display shows for an empty value (`""`, `null`, an empty `display`).
   *  Default `labels.empty`. */
  placeholder?: ReactNode;
  /** `"end"` for a figure in a right-aligned money column. Default `"start"`. */
  align?: "start" | "end";
  /** Look, do not touch — a guest's view: the value as plain text, no button. */
  readOnly?: boolean;
  /**
   * Why it cannot be edited now — the write lock's sentence, a closed period. The
   * value stays a BUTTON (focusable, `aria-disabled`) with the reason in the kit
   * Tooltip and its description; it opens no editor. An editor that is open when the
   * reason arrives closes, its draft dropped: a field you can type into must be one
   * whose value can be saved (keksdose dev#496).
   */
  disabledReason?: ReactNode;
  /** This field COMMITS — under a locked {@link WriteLockProvider} it takes the
   *  `disabledReason` path with the lock's reason (which wins over its own). No
   *  provider, or an unlocked one: no effect. */
  commit?: CommitScope;
  /** The value is the user's own data: `data-private` on the display and the editor,
   *  so the app's demo-mode blur covers both. */
  redact?: boolean;
  /** Turns a rejection into words. Default `labels.failed`. */
  formatError?: (error: unknown) => ReactNode;
  /** Controlled open state — a row's swipe action that opens the editor from outside
   *  (keksdose's assigned cell). Left out, the field keeps its own. */
  editing?: boolean;
  /** Called with the next open state: on open, on a save that resolved, on cancel. */
  onEditingChange?: (editing: boolean) => void;
  /** Attributes for the DEFAULT text editor's `<input>` — `maxLength`, `inputMode`,
   *  `autoComplete`. Ignored with `editor`. */
  inputProps?: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type">;
  /** Classes for the root. */
  className?: string;
  labels?: Partial<InlineEditLabels>;
}

type EditorRender<T> = (props: InlineEditorProps<T>) => ReactNode;

/**
 * The editor. Optional for a string value — the kit's `Input`, compact — and
 * REQUIRED for anything else, since only the caller knows how to edit a number or an
 * amount. Render a kit field from the props it is handed:
 *
 * ```tsx
 * editor={(p) => (
 *   <NumberInput calculator={false} ariaLabel={p.label} value={p.value} onChange={p.onChange}
 *     onCommit={p.commit} aria-invalid={p.invalid || undefined} aria-describedby={p.describedBy} />
 * )}
 * ```
 *
 * The field itself handles Enter (save), Escape (cancel) and focus leaving the editor
 * (save) around whatever is rendered — a key the editor has already handled
 * (`preventDefault`, as a listbox does for its Enter) is left to it. Focus counts as
 * "inside" across a portal, so a picker or a phone keypad the editor opens does not
 * end the edit.
 */
export type InlineEditFieldProps<T = string> = InlineEditFieldBaseProps<T> &
  ([T] extends [string] ? { editor?: EditorRender<T> } : { editor: EditorRender<T> });

function hasContent(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== "";
}

/** Calls the `editor` render prop as a component of its own: the props it is handed
 *  close over the field's refs, and a render prop called in the field's own render
 *  would read like a ref read during render. Module-level, so the type is stable and
 *  the editor never remounts. */
function RenderEditor<T>({ render, ...props }: InlineEditorProps<T> & { render: EditorRender<T> }) {
  return render(props);
}

/**
 * The value at Large and Extra large (0.32.1, keksdose's 0.32 report;
 * docs/text-size-harmonization.md §4 "nothing truncates"): the display button, the
 * locked one and the read-only text wrap instead of ending in "…", and break a word too
 * long for the cell, so an IBAN or an e-mail address shows to its last character. The
 * value IS the button's accessible name and the thing being edited: a reader who needs
 * big type cannot recover a cut-off end by squinting. A `large:` class, so a table of
 * these keeps its one-line cells at Normal.
 *
 * 0.33 (§10.17): the kit's one `truncate-until-large` (tokens.css) in place of this
 * file's own `truncate` + `large:whitespace-normal large:break-words`. The utility
 * breaks with `overflow-wrap: anywhere`, which lowers the value's min-content width: in
 * an auto-sized table column (keksdose's budget and invoice lines) give the column a
 * width, or an amount can be squeezed to a digit per line.
 */
const VALUE_TRUNCATE = "truncate-until-large";

/** `onCommit`'s result, if it is a promise. */
function asPromise(result: unknown): Promise<unknown> | null {
  return result && typeof (result as Promise<unknown>).then === "function" ? (result as Promise<unknown>) : null;
}

/**
 * A value that edits in place: a quiet button showing the value; click it (or Enter
 * on it) and it becomes a field; Enter or leaving the field saves, Escape cancels
 * (keksdose K9).
 *
 * keksdose has three of them by hand — the budget's assigned cell (budget-cells.tsx),
 * the invoice line's value cells (invoice-lines-table.tsx `EditableCell`) and the
 * budget rename (budgets-page.tsx, an `Input` + Save + Cancel with no Escape) — and
 * each had to learn the same rules:
 *
 *  - **The display's accessible name is the VALUE.** A cell named "Edit" reads a table
 *    of "edit, edit, edit"; the action is the description instead ("Edit Assigned"),
 *    in the kit Tooltip on hover and focus.
 *  - **An unchanged draft is not a write.** Opening the editor and leaving it was a PUT
 *    in keksdose until `isEqual` compared numbers, and on a sealed budget an outbox row
 *    for a change nobody made.
 *  - **A failed save keeps the editor.** The typed value is the user's work; the
 *    failure is shown under it (attached with `aria-describedby`, and spoken), and the
 *    next keystroke clears it. Escape still drops the draft.
 *  - **Locked means a disabled BUTTON, not a disabled field** (keksdose dev#496): at
 *    rest a real row shows this button, so a locked page shows the same, with the
 *    reason — never a field that takes keys it cannot save.
 *
 * Inside a {@link DataTable} cell it needs nothing extra: the table already leaves a
 * click or a key on a control of the cell to that control. Focus returns to the value
 * after Enter or Escape; after a save that came from focus leaving, it stays where the
 * user put it.
 *
 * ```tsx
 * <InlineEditField label={t("budgets.name")} value={budget.name}
 *   onCommit={(name) => rename.mutateAsync({ id: budget.id, name })} inputProps={{ maxLength: 120 }} />
 * ```
 */
export function InlineEditField<T = string>(props: InlineEditFieldProps<T>) {
  const {
    value,
    onCommit,
    label,
    display,
    isEqual = Object.is,
    placeholder,
    align = "start",
    readOnly = false,
    disabledReason: ownDisabledReason,
    commit,
    redact = false,
    formatError,
    editing: editingProp,
    onEditingChange,
    inputProps,
    className,
    labels: labelsProp,
  } = props;
  const editor = props.editor as EditorRender<T> | undefined;
  const labels = useKitLabels("inlineEdit", DEFAULT_INLINE_EDIT_LABELS, labelsProp);
  const disabledReason = useCommitReason(commit, ownDisabledReason);
  const locked = hasContent(disabledReason);

  const [openState, setOpenState] = useState(false);
  const open = editingProp ?? openState;
  // Locked (or read-only) wins over an open flag: a stale `editing` must never bring a
  // live commit-on-blur field back on a page that cannot save it.
  const editing = open && !locked && !readOnly;
  const [draft, setDraft] = useState<T>(value);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<ReactNode>(null);
  const failed = hasContent(failure);

  const errorId = useId();
  const reasonId = useId();
  const displayRef = useRef<HTMLButtonElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const alert = useAnnounce({ politeness: "assertive" });

  // One edit ends once: Enter in a NumberInput commits through its own `onCommit` and
  // then reaches the field's Enter; a save that closes the editor unmounts the focused
  // control, which some browsers answer with a blur. The second ending is a no-op.
  const ended = useRef(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  // The latest draft for the deferred blur check, which runs after a render.
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  // Seed the draft when the editor opens — from wherever the open came (the button, a
  // controlled `editing`). During render, like DangerConfirm's wipe, so no frame shows
  // the editor holding the previous edit's text.
  const [wasEditing, setWasEditing] = useState(editing);
  if (wasEditing !== editing) {
    setWasEditing(editing);
    if (editing) {
      setDraft(value);
      setFailure(null);
      setPending(false);
    }
  }
  // An open editor that a lock (or `readOnly`) took away is closed for good, not
  // merely hidden until the lock lifts.
  if (openState && !editing && editingProp === undefined) setOpenState(false);

  // Focus follows the edit: into the editor when it opens, back to the value when it
  // closes — but only if focus went down with the editor (Enter, Escape, a save that
  // resolved under it). A save that came from focus LEAVING keeps focus where it went.
  const prevEditing = useRef(editing);
  useEffect(() => {
    const changed = prevEditing.current !== editing;
    prevEditing.current = editing;
    if (!changed) return;
    if (editing) {
      // A fresh edit, which may end once. Here rather than in the seed above: a ref is
      // not written during render, and no event can end the edit before this runs.
      ended.current = false;
      const control = editorRef.current?.querySelector<HTMLElement>(
        "input:not([type=hidden]), textarea, select, [contenteditable='true'], [tabindex]:not([tabindex='-1']), button",
      );
      control?.focus();
      if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) control.select();
      return;
    }
    // However it closed — a save, Escape, a lock taking it away — a blur check still
    // queued from the editor has nothing left to save.
    ended.current = true;
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = null;
    const lost = document.activeElement === null || document.activeElement === document.body;
    if (lost) displayRef.current?.focus();
  }, [editing]);

  const setOpen = (next: boolean) => {
    if (editingProp === undefined) setOpenState(next);
    onEditingChange?.(next);
  };

  const fail = (caught: unknown) => {
    ended.current = false;
    const message = formatError ? formatError(caught) : labels.failed;
    setFailure(hasContent(message) ? message : labels.failed);
    alert.announce(typeof message === "string" && message !== "" ? message : labels.failed);
    // Focus back into the editor if the failure left it nowhere (a pending field that
    // the browser let go of); never pulled back from somewhere the user went.
    const active = document.activeElement;
    if (active === null || active === document.body) {
      editorRef.current?.querySelector<HTMLElement>("input, textarea, select, [tabindex]")?.focus();
    }
  };

  const save = (next: T = draftRef.current) => {
    if (!editing || ended.current || pending) return;
    ended.current = true;
    if (next !== draftRef.current) setDraft(next);
    if (isEqual(next, value)) {
      setOpen(false);
      return;
    }
    let result: unknown;
    try {
      result = onCommit(next);
    } catch (caught) {
      fail(caught);
      return;
    }
    const promise = asPromise(result);
    if (!promise) {
      setOpen(false);
      return;
    }
    setPending(true);
    setFailure(null);
    promise.then(
      () => {
        if (!mounted.current) return;
        setPending(false);
        setOpen(false);
      },
      (caught: unknown) => {
        if (!mounted.current) return;
        setPending(false);
        fail(caught);
      },
    );
  };

  const cancel = () => {
    // A request that has left cannot be called back; Escape waits for it.
    if (!editing || pending) return;
    ended.current = true;
    setOpen(false);
  };

  const change = (next: T) => {
    if (pending) return;
    setDraft(next);
    // Now, not after the render: a blur check scheduled before that render reads it.
    draftRef.current = next;
    // The failure described the draft that was sent; once edited it describes nothing
    // on screen, and the next save (or blur) is a fresh attempt.
    setFailure(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.defaultPrevented) return;
    if (e.key === "Escape") {
      // Ours, not the dialog's or the popover's around the field.
      e.preventDefault();
      e.stopPropagation();
      cancel();
      return;
    }
    // Not mid-composition: Enter there picks the IME's candidate (Japanese, Chinese).
    if (e.key === "Enter" && !e.nativeEvent.isComposing && !e.shiftKey) {
      e.preventDefault();
      save();
    }
  };

  // Leaving the editor saves. Deferred one task, and cancelled by any focus that lands
  // back inside: React reports focus moves through PORTALS to the component tree, so a
  // calculator popover or a phone keypad the editor opened counts as inside, which a
  // DOM `contains` check would get wrong. A failure on screen holds the editor: the
  // user is looking at why, and moving away is not a retry.
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => {
      blurTimer.current = null;
      if (!mounted.current || failed) return;
      save();
    }, 0);
  };
  const onFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = null;
  };

  const private_ = redact ? { "data-private": true } : undefined;
  const shown = display ? display(value) : value === null || value === undefined ? "" : String(value);
  const content = hasContent(shown) ? (
    shown
  ) : (
    <span className="text-[var(--text-muted)]">{placeholder ?? labels.empty}</span>
  );
  const alignClass = align === "end" ? "text-end" : "text-start";

  let body: ReactNode;
  if (readOnly) {
    body = (
      <span {...private_} className={cn("block min-w-0", VALUE_TRUNCATE, alignClass)}>
        {content}
      </span>
    );
  } else if (editing) {
    const describedBy = failed ? errorId : undefined;
    const editorProps: InlineEditorProps<T> = {
      value: draft,
      onChange: change,
      commit: save,
      cancel,
      pending,
      label,
      invalid: failed,
      describedBy,
      inputProps: {
        "aria-label": label,
        "aria-invalid": failed || undefined,
        "aria-describedby": describedBy,
        readOnly: pending,
      },
    };
    body = (
      // A wrapper for the keys and the focus, not a control: the keys belong to the
      // field inside it, which is what has focus.
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- see above
      <div
        ref={editorRef}
        {...private_}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        onFocus={onFocus}
        aria-busy={pending || undefined}
        className="min-w-0"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="min-w-0 flex-1">
            {editor ? (
              <RenderEditor render={editor} {...editorProps} />
            ) : (
              <Input
                {...inputProps}
                {...editorProps.inputProps}
                value={String(draft ?? "")}
                onChange={(e) => change(e.target.value as unknown as T)}
                className={cn("px-2 py-1", alignClass, inputProps?.className)}
              />
            )}
          </div>
          {/* Decorative: `aria-busy` on the wrapper says it. */}
          {pending && <Spinner label={null} className="size-4 shrink-0" />}
        </div>
        {failed && (
          <p id={errorId} className="mt-1 text-caption leading-tight text-[var(--danger)]">
            {failure}
          </p>
        )}
      </div>
    );
  } else if (locked) {
    // Button's `disabledReason` path, spelled out for a button that must look like
    // the value rather than like a Button: focusable, `aria-disabled`, every
    // activation swallowed, the reason in the kit Tooltip and in a `hidden` copy that
    // describes it. The button in a FRAGMENT so the Tooltip does not add the bubble as
    // a second description of the same sentence.
    body = (
      <Tooltip label={disabledReason} className="flex w-full min-w-0">
        <>
          <button
            ref={displayRef}
            type="button"
            {...private_}
            aria-disabled
            aria-describedby={reasonId}
            onClick={(e) => e.preventDefault()}
            className={cn(
              "block w-full min-w-0 cursor-not-allowed rounded-sm focus:outline-none",
              VALUE_TRUNCATE,
              FOCUS_RING,
              alignClass,
            )}
          >
            {content}
          </button>
          <span id={reasonId} hidden>
            {disabledReason}
          </span>
        </>
      </Tooltip>
    );
  } else {
    body = (
      // Lazy: a table of these mounts no bubble until one is hovered or focused, and
      // the closed bubble's text is in no ancestor's accessible name.
      <Tooltip label={labels.edit(label)} lazy className="flex w-full min-w-0">
        <button
          ref={displayRef}
          type="button"
          {...private_}
          onClick={() => setOpen(true)}
          className={cn(
            "block w-full min-w-0 rounded-sm underline-offset-2 hover:underline focus:outline-none",
            VALUE_TRUNCATE,
            FOCUS_RING,
            alignClass,
          )}
        >
          {content}
        </button>
      </Tooltip>
    );
  }

  return (
    <div className={cn("min-w-0", className)} data-editing={editing || undefined}>
      {body}
      {/* Always mounted: a live region that mounts with its message is usually missed. */}
      <span {...alert.regionProps} />
    </div>
  );
}
