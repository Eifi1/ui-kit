import { isValidElement } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import { useMediaQuery } from "../hooks/use-media-query";
import { Button, Spinner, type ButtonProps, type ButtonVariant } from "./ui";

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

/**
 * A placement per breakpoint, mobile first — `{ base: "sticky", md: "inline" }` is a
 * Save row stuck to the bottom of a phone's long form and in the flow under the last
 * field from 768px up, where the form fits. The breakpoints are Tailwind's (sm 640,
 * md 768, lg 1024, xl 1280px), as `BulkActionBar`'s `variant` breakpoints are, and
 * resolved the same way, in JS: the sticky row is positioned by inline style, which a
 * `md:` class cannot reach. keksdose switched `placement` on its own media query at
 * every long form for want of this. The breakpoints are the VIEWPORT's, not the
 * container's: a form in a narrow pane on a wide screen resolves to `md`.
 */
export interface ResponsiveFormActionsPlacement {
  base: FormActionsPlacement;
  sm?: FormActionsPlacement;
  md?: FormActionsPlacement;
  lg?: FormActionsPlacement;
  xl?: FormActionsPlacement;
}

const BREAKPOINTS = [
  ["xl", "(min-width: 1280px)"],
  ["lg", "(min-width: 1024px)"],
  ["md", "(min-width: 768px)"],
  ["sm", "(min-width: 640px)"],
] as const;

/** The placement in force: the widest breakpoint that matches AND names one, else
 *  `base`. The queries are subscribed unconditionally (hooks cannot be skipped); a
 *  plain string ignores them. Without `matchMedia` (SSR, tests) none match, so the row
 *  renders its `base`, the phone's. The same resolution as BulkActionBar's variant. */
function useResolvedPlacement(
  placement: FormActionsPlacement | ResponsiveFormActionsPlacement,
): FormActionsPlacement {
  const matches = {
    xl: useMediaQuery(BREAKPOINTS[0][1], false),
    lg: useMediaQuery(BREAKPOINTS[1][1], false),
    md: useMediaQuery(BREAKPOINTS[2][1], false),
    sm: useMediaQuery(BREAKPOINTS[3][1], false),
  };
  if (typeof placement === "string") return placement;
  for (const [key] of BREAKPOINTS) {
    const p = placement[key];
    if (matches[key] && p !== undefined) return p;
  }
  return placement.base;
}

/** A CSS length: a number is pixels. */
function cssLength(value: string | number): string {
  return typeof value === "number" ? `${value}px` : value;
}

/**
 * What a `sticky` row sticks to — see {@link FormActionsProps.stickyWithin}.
 *  - `viewport` (default): the page's (or AppShell pane's) bottom edge, lifted onto
 *    the phone's bottom nav by `--app-nav-h`.
 *  - `container`: the bottom of whatever scroll container it is in — a dialog body, a
 *    side pane, a panel with `overflow-y-auto` — at `bottom: 0`, with no nav offset.
 */
export type FormActionsStickyWithin = "viewport" | "container";

/**
 * Extra attributes for the save button — an `id`, `data-*` hooks for tests or
 * analytics, an `aria-describedby`. The props FormActions drives itself (type, click,
 * disabled, variant, form, children, the busy state) are not among them.
 */
export type FormActionsSubmitProps = Omit<
  ButtonProps,
  "type" | "onClick" | "disabled" | "disabledReason" | "variant" | "form" | "children" | "aria-busy" | "commit"
> & { [key: `data-${string}`]: string | number | boolean | undefined };

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
   * A Lucide icon before the save button's text. While `pending` the spinner takes
   * ITS place rather than being added in front of it — an icon written into
   * `submitLabel` itself stays, so the button would show the spinner AND the glyph,
   * two statuses side by side (keksdose's crop Apply needed a `pendingLabel` copy of
   * its text only to drop the check mark).
   */
  submitIcon?: LucideIcon;
  /** Attributes passed through to the save button: `id`, `data-*`, `aria-*`, a
   *  `className`. See {@link FormActionsSubmitProps}. */
  submitProps?: FormActionsSubmitProps;
  /**
   * The save is running: a spinner in the save button, `aria-busy` on it, and the
   * button disabled, so a second click cannot send the form twice. Cancel stays
   * usable. The spinner goes in front of the text, or in place of {@link submitIcon}.
   */
  pending?: boolean;
  /** Disable save for a reason of the form's own (an unbalanced entry). */
  submitDisabled?: boolean;
  /** Why save is disabled — see Button's `disabledReason`. Keeps it focusable. */
  submitDisabledReason?: ReactNode;
  /**
   * Save is a commit: under a locked {@link WriteLockProvider} it is disabled with the
   * lock's reason (over `submitDisabledReason`), focusable, the reason in its tooltip —
   * Button's `commit`. The `{ label, onClick }` form of {@link destructive} is a
   * commit too and is locked with it; Cancel and `children` are not (closing a form
   * writes nothing). No provider, or an unlocked one: no effect. Default `false`.
   *
   * keksdose wrote `submitDisabled={lock.locked || …}` and
   * `submitDisabledReason={lock.locked ? lock.reason : undefined}` at each form; this is
   * that pair, read from the provider.
   */
  commit?: boolean;
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
  /**
   * Something neutral at the START of the row — a caption ("Last saved 2 min ago",
   * "Drag the corners to crop"), a "View activity" link. After {@link destructive}
   * when both are given; like it, makes the row `between`-aligned unless `align` says
   * otherwise. `children` are for further ACTIONS, beside Cancel.
   */
  start?: ReactNode;
  /** Horizontal alignment. Default `end` (`between` with a `destructive` action). */
  align?: FormActionsAlign;
  /** See {@link FormActionsPlacement}, or one per breakpoint — see
   *  {@link ResponsiveFormActionsPlacement}. Default `inline`. */
  placement?: FormActionsPlacement | ResponsiveFormActionsPlacement;
  /**
   * While the row is `sticky`: pull it out over its container's inline padding by this
   * much (a CSS length, a number in px) and give the same back as padding — so the
   * rule above it and its surface run edge to edge, while the buttons stay on the
   * content's line. Without it a sticky row in a padded card or pane is a strip inset
   * from both sides, with the content scrolling past it in the gutters (keksdose wrote
   * `@max-md:-mx-3 @max-md:px-3` by hand). Pass the container's padding (`"0.75rem"`,
   * `12`, `"var(--pane-px)"`). Applied only while the resolved placement is sticky, so
   * `placement={{ base: "sticky", md: "inline" }}` bleeds on the phone alone. The margin
   * is `calc(-1 * X)`; jsdom folds that to `calc(-X)`, so match it loosely in tests.
   */
  bleed?: string | number;
  /**
   * With `placement="sticky"`: what the row sticks to. Default `viewport`.
   *
   * CSS sticky always sticks to the NEAREST scroll container, so the default row
   * already holds inside a scrolling pane — but it offsets itself by `--app-nav-h`,
   * which AppShell publishes on the document: inside a pane or a portalled dialog
   * body on a phone it then floats a nav's height above that container's bottom,
   * with the content scrolling through the gap. `container` drops that offset.
   *
   * What neither value can fix, because it is the layout, not the row:
   *  - sticky moves only within its PARENT box. Inside a DataTable expansion row the
   *    parent is the expansion cell, so the row pins to the table's own scroller
   *    (`overflow-auto`, bounded by `maxBodyHeight`) and only while the cell spans
   *    that scroller's bottom edge — not to the page.
   *  - any `overflow` other than `visible`/`clip` between the row and the scroller
   *    you mean (an `overflow-x-auto` wrapper, an `overflow-hidden` card) becomes the
   *    scroll container; if THAT box does not scroll, the row never sticks.
   *  - the offset is resolved against the scroller's content box, so a scroller with
   *    bottom padding leaves that strip uncovered; give the row a negative `bottom`
   *    through `style` and the same amount back as padding.
   */
  stickyWithin?: FormActionsStickyWithin;
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
  submitIcon: SubmitIcon,
  submitProps,
  pending = false,
  submitDisabled = false,
  submitDisabledReason,
  commit = false,
  submitVariant = "brand",
  destructive,
  start: startSlot,
  align,
  placement: placementProp = "inline",
  stickyWithin = "viewport",
  bleed,
  form,
  children,
  className,
  style,
  ...rest
}: FormActionsProps) {
  const labels = useKitLabels("form", DEFAULT_FORM_ACTIONS_LABELS);
  const placement = useResolvedPlacement(placementProp);
  const bleedLength = bleed === undefined || bleed === "" ? undefined : cssLength(bleed);
  const hasDestructive = destructive !== undefined && destructive !== null && destructive !== false;
  const hasStart = startSlot !== undefined && startSlot !== null && startSlot !== false;
  const justify = align ?? (hasDestructive || hasStart ? "between" : "end");
  const destructiveNode = !hasDestructive ? null : isDestructiveData(destructive) ? (
    <Button
      type="button"
      variant="ghost"
      tone="danger"
      onClick={destructive.onClick}
      disabled={destructive.disabled}
      disabledReason={destructive.disabledReason}
      commit={commit}
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
      data-sticky-within={placement === "sticky" ? stickyWithin : undefined}
      {...rest}
      style={
        placement === "sticky"
          ? {
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
              // On the phone's bottom nav, not behind it (keksdose live #361): `bottom-0`
              // pinned the row under AppShell's nav, which covers the page's last ~56px.
              // `--app-nav-h` is the nav's measured height (0px from md up, and outside an
              // AppShell); the 1px overlaps the two top borders into one line. In a
              // container the nav is not underneath: `--app-nav-h` is the document's,
              // and would hold the row that far above the container's own edge.
              bottom: stickyWithin === "container" ? 0 : "max(0px, calc(var(--app-nav-h, 0px) - 1px))",
              ...(bleedLength !== undefined && {
                marginInline: `calc(-1 * ${bleedLength})`,
                paddingInline: bleedLength,
              }),
              ...style,
            }
          : style
      }
      className={cn("flex flex-wrap items-center gap-2", ALIGN_CLASS[justify], PLACEMENT_CLASS[placement], className)}
    >
      {(hasDestructive || hasStart) && (
        <div className="me-auto flex min-w-0 flex-wrap items-center gap-2">
          {destructiveNode}
          {hasStart && startSlot}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            {cancelLabel ?? labels.cancel}
          </Button>
        )}
        <Button
          {...submitProps}
          type={onSubmit ? "button" : "submit"}
          form={form}
          onClick={onSubmit}
          variant={submitVariant}
          disabled={pending || submitDisabled}
          disabledReason={pending ? undefined : submitDisabledReason}
          // Not while pending: the save already left, and the lock's look over the
          // spinner would say it had not.
          commit={commit && !pending}
          aria-busy={pending || undefined}
        >
          {pending ? (
            <Spinner label={null} className="size-4" />
          ) : (
            SubmitIcon && <SubmitIcon aria-hidden className="size-4 shrink-0" />
          )}
          {pending && pendingLabel !== undefined ? pendingLabel : saveLabel}
        </Button>
      </div>
    </div>
  );
}
