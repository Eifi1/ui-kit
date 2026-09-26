import { isValidElement } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import { Button, Spinner, type ButtonVariant } from "./ui";

/** The words {@link FormActions} renders on its own behalf — the `form` namespace. */
export interface FormActionsLabels {
  save: string;
  cancel: string;
}

export const DEFAULT_FORM_ACTIONS_LABELS: FormActionsLabels = {
  save: "Save",
  cancel: "Cancel",
};

export type FormActionsAlign = "start" | "center" | "end" | "between";

/**
 * Where the row sits:
 *  - `inline` (default): under the form's last field, `pt-4` above it.
 *  - `sticky`: stuck to the bottom of the scrolling page or pane, on the surface
 *    colour with a rule above, clear of the phone's home indicator — for a long form
 *    whose Save should not be a scroll away.
 *  - `dialog`: no spacing of its own, for a dialog's footer slot (DialogFrame,
 *    FullBleedDialog's `footer`), which already pads and rules it.
 */
export type FormActionsPlacement = "inline" | "sticky" | "dialog";

/** The start-side action of {@link FormActionsProps.destructive}, as data. */
export interface FormActionsDestructive {
  label: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** See Button's `disabledReason`. */
  disabledReason?: ReactNode;
}

const ALIGN_CLASS: Record<FormActionsAlign, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
};

const PLACEMENT_CLASS: Record<FormActionsPlacement, string> = {
  inline: "pt-4",
  sticky: "sticky bottom-0 z-10 border-t border-[var(--border)] bg-[var(--bg-surface)] pt-3",
  dialog: "",
};

export interface FormActionsProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** Called by Cancel. Omitted: no Cancel button (a form that only saves). */
  onCancel?: () => void;
  /**
   * Given: the save button is `type="button"` and calls this — for a dialog or a row
   * that saves from a handler. Omitted: it is `type="submit"` and submits the
   * enclosing `<form>` (or the one named by {@link form}).
   */
  onSubmit?: () => void;
  /** The save button's text. Default `form.save` from the provider, else "Save". */
  submitLabel?: ReactNode;
  /** The cancel button's text. Default `form.cancel` from the provider, else "Cancel". */
  cancelLabel?: ReactNode;
  /** The save button's text while `pending` ("Saving…"). Default: `submitLabel`. */
  pendingLabel?: ReactNode;
  /**
   * The save is running: a spinner in the save button, `aria-busy` on it, and the
   * button disabled, so a second click cannot send the form twice. Cancel stays
   * usable.
   */
  pending?: boolean;
  /** Disable save for a reason of the form's own (an unbalanced entry). */
  submitDisabled?: boolean;
  /** Why save is disabled — see Button's `disabledReason`. Keeps it focusable. */
  submitDisabledReason?: ReactNode;
  /** The save button's variant. Default `brand`; `danger` for a save that destroys
   *  (kastlan's `destructive` flag on its own FormActions). */
  submitVariant?: ButtonVariant;
  /**
   * A destructive action at the START of the row, apart from Save and Cancel — the
   * "Delete" of an edit dialog. Pass `{ label, onClick }` for the kit's quiet danger
   * button, or an element of your own (a {@link DangerConfirm}, say). With it the row
   * is `between`-aligned unless `align` says otherwise.
   */
  destructive?: ReactNode | FormActionsDestructive;
  /** Horizontal alignment. Default `end` (`between` with a `destructive` action). */
  align?: FormActionsAlign;
  /** See {@link FormActionsPlacement}. Default `inline`. */
  placement?: FormActionsPlacement;
  /** The `id` of the `<form>` the save button submits, when the row is rendered
   *  outside it (a dialog's footer slot). */
  form?: string;
  /** Extra actions, placed before Cancel. */
  children?: ReactNode;
}

function isDestructiveData(value: unknown): value is FormActionsDestructive {
  return typeof value === "object" && value !== null && !isValidElement(value) && "onClick" in value;
}

/**
 * The Save / Cancel row every form, wizard-step form and dialog ends in — kastlan's
 * `FormActions`, with the labels from the provider, a pending state and a place for
 * the destructive action.
 *
 * ```tsx
 * <form onSubmit={form.handleSubmit(save)}>
 *   …
 *   <FormActions onCancel={close} pending={mutation.isPending} />
 * </form>
 * ```
 *
 * The spinner is the kit's {@link Spinner}, drawn inside the button with `label={null}`
 * so the button's name stays its text; `aria-busy` is what says it is working.
 */
export function FormActions({
  onCancel,
  onSubmit,
  submitLabel,
  cancelLabel,
  pendingLabel,
  pending = false,
  submitDisabled = false,
  submitDisabledReason,
  submitVariant = "brand",
  destructive,
  align,
  placement = "inline",
  form,
  children,
  className,
  style,
  ...rest
}: FormActionsProps) {
  const labels = useKitLabels("form", DEFAULT_FORM_ACTIONS_LABELS);
  const hasDestructive = destructive !== undefined && destructive !== null && destructive !== false;
  const justify = align ?? (hasDestructive ? "between" : "end");
  const start = !hasDestructive ? null : isDestructiveData(destructive) ? (
    <Button
      type="button"
      variant="ghost"
      tone="danger"
      onClick={destructive.onClick}
      disabled={destructive.disabled}
      disabledReason={destructive.disabledReason}
    >
      {destructive.label}
    </Button>
  ) : (
    destructive
  );
  const saveLabel = submitLabel ?? labels.save;

  return (
    <div
      data-slot="form-actions"
      data-placement={placement}
      {...rest}
      style={
        placement === "sticky"
          ? { paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))", ...style }
          : style
      }
      className={cn("flex flex-wrap items-center gap-2", ALIGN_CLASS[justify], PLACEMENT_CLASS[placement], className)}
    >
      {start && <div className="me-auto flex items-center gap-2">{start}</div>}
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            {cancelLabel ?? labels.cancel}
          </Button>
        )}
        <Button
          type={onSubmit ? "button" : "submit"}
          form={form}
          onClick={onSubmit}
          variant={submitVariant}
          disabled={pending || submitDisabled}
          disabledReason={pending ? undefined : submitDisabledReason}
          aria-busy={pending || undefined}
        >
          {pending && <Spinner label={null} className="size-4" />}
          {pending && pendingLabel !== undefined ? pendingLabel : saveLabel}
        </Button>
      </div>
    </div>
  );
}
