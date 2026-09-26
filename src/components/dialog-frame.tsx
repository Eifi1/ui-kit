import { useContext, useId } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "../lib/cn";
import { Modal, ModalCloseContext } from "./modal";
import type { ModalProps } from "./modal";
import { useKitLabels } from "../i18n/kit-labels";

export interface DialogFrameLabels {
  /** Accessible name of the header's X, when {@link DialogFrameProps.closeButton} shows it. */
  close: string;
}

export const DEFAULT_DIALOG_FRAME_LABELS: DialogFrameLabels = { close: "Close" };

/**
 * `ModalProps` minus the three this component owns: the NAME (`labelledBy` — the
 * heading's id is generated inside and never reaches the caller), the content
 * (`children` is the body here, not the whole panel) and `title`, which is the dialog's
 * HEADING and a ReactNode rather than the browser's tooltip string — the collision
 * `PickerSheet` met first. Everything else, `size`, `draggable`, `fullBleed`,
 * `onKeyDown`, a `data-tour` anchor, still reaches the `Modal`.
 */
export interface DialogFrameProps extends Omit<ModalProps, "labelledBy" | "children" | "title"> {
  /** The heading, and therefore the dialog's accessible name (`aria-labelledby`). */
  title: ReactNode;
  /** The smaller line under the heading; wired to `aria-describedby`. */
  description?: ReactNode;
  /**
   * The heading's level. `h2` by default, which is what every dialog in both apps
   * writes; a prop for a page that nests its demos under a real heading.
   */
  headingAs?: "h1" | "h2" | "h3" | "h4";
  /**
   * The row under the body — buttons, in the caller's own order and variants (the two
   * apps disagree about the cancel button's variant, so the frame has no opinion on
   * it). Stays put while the body scrolls.
   *
   * A FUNCTION receives the panel's animated close: `(close) => <Button
   * onClick={close}>Cancel</Button>` lowers the panel the way Escape does, where
   * calling `onClose` directly unmounts it at once.
   */
  actions?: ReactNode | ((close: () => void) => ReactNode);
  /**
   * Controls that belong to the HEADER rather than to the actions row — an "Edit"
   * toggle, a status badge with a menu, a "Copy link" (kastlan). Rendered beside the
   * title, before the optional X; on a phone, where title and controls do not fit on
   * one line, they wrap under the title and the X keeps its corner.
   *
   * A function receives the animated close, as `actions` does.
   */
  headerActions?: ReactNode | ((close: () => void) => ReactNode);
  /**
   * Show an X in the header. Off by default: a centred dialog has a backdrop and
   * Escape, and a form dialog has a Cancel. On for a dialog that commits as it goes
   * and has no actions row, where the X is the only visible way out.
   */
  closeButton?: boolean;
  /** Default: `dialogFrame.close` from the {@link UiKitProvider}, else "Close". */
  closeLabel?: string;
  /** Extra classes for the scrolling body (default spacing `space-y-3`). */
  bodyClassName?: string;
  /**
   * Extra classes for the header row (default padding `px-4 pt-4 pb-3`), merged last —
   * `px-3` for a phone sheet whose body runs at `px-3`, so heading and fields share
   * one gutter.
   */
  headerClassName?: string;
  /**
   * A rule under the header, the twin of the one over the actions row — for a tall or
   * full-screen body that scrolls under a header which stays. The body then starts a
   * step below the rule instead of flush against it.
   */
  headerDivider?: boolean;
  /**
   * The body. Optional: a dialog whose title, description and actions are the whole
   * of it (a "you have unsynced changes" question) leaves it out, and the frame then
   * renders no body at all rather than an empty padded one.
   */
  children?: ReactNode;
}

/**
 * A {@link Modal} with the frame every caller was writing by hand: a heading, an
 * optional description, an optional X, a body that scrolls, and an actions row that
 * does not.
 *
 * 34 dialogs across the two apps framed themselves — a heading with an id invented per
 * file (and spelt three ways), four visible type sizes for one thing, ten spellings of
 * one right-aligned button row — and the package's own feedback dialog shipped with no
 * accessible name at all. This makes the name unforgettable: the heading's id comes
 * from `useId()` and goes straight to `Modal`'s `labelledBy`, so a framed dialog cannot
 * announce as just "dialog", and two open instances cannot share an id.
 *
 * ## It wraps, it does not change `Modal`
 *
 * `Modal` keeps `labelledBy` and every existing caller compiles untouched. What the
 * frame changes is inside the panel: the panel becomes a flex column with no padding
 * of its own, and only the BODY scrolls. The panel's `max-h-full` is still the outer
 * bound, so a tall form keeps its heading and its Save button on screen instead of
 * scrolling them away with the fields. A caller's own `className` still wins (it is
 * tailwind-merged last), which is how a full-screen phone sheet is spelt:
 * `fullBleed className="h-[100dvh] max-w-full rounded-none md:h-auto md:rounded-lg"`.
 *
 * ## Kept mounted
 *
 * `open` reaches the `Modal` like every other prop, so `<DialogFrame open={open} …>`
 * replaces the `{open && <DialogFrame …/>}` gate (kastlan's `FormModal` was only
 * that gate) and gains the exit a caller-driven close otherwise skips. See
 * {@link ModalProps.open}.
 *
 * ## What it is not
 *
 * Not `FullBleedDialog`: that is the phone's full-screen editor with its own `open`,
 * Back handling and a required X, and it already draws a frame of its own. And not a
 * form: submit handling, a pending label and close-on-success stay the caller's.
 * Focus lands on the panel, as `Modal` decides — not on the first field, so opening
 * does not pop a phone's keyboard; an `autoFocus` in the body overrides that from the
 * caller's side, and should be a decision rather than a habit.
 */
export function DialogFrame({
  title,
  description,
  headingAs: Heading = "h2",
  actions,
  headerActions,
  closeButton = false,
  closeLabel,
  bodyClassName,
  headerClassName,
  headerDivider = false,
  className,
  children,
  "aria-describedby": describedBy,
  ...modal
}: DialogFrameProps) {
  const titleId = useId();
  const descriptionId = useId();
  const hasDescription = description !== undefined && description !== null;
  // `false` too, so `{cond && <Body/>}` with a false `cond` means "no body".
  const hasBody = children !== undefined && children !== null && children !== false;

  return (
    <Modal
      {...modal}
      labelledBy={titleId}
      // The caller's own description (a warning inside the body, say) is ADDED to the
      // frame's, not traded for it: both are the dialog's.
      aria-describedby={[hasDescription ? descriptionId : undefined, describedBy].filter(Boolean).join(" ") || undefined}
      // `overflow-hidden` replaces the panel's own `overflow-y-auto` (tailwind-merge
      // treats them as one group), `p-0` its `p-4`: the scroller and the padding move
      // to the body, which is the only part that should move.
      className={cn("flex flex-col overflow-hidden p-0", className)}
    >
      <div
        className={cn(
          // `last:pb-4`: a frame with neither body nor actions closes on its header.
          "flex shrink-0 items-start justify-between gap-2 px-4 pt-4 pb-3 last:pb-4",
          headerDivider && "border-b border-[var(--border)]",
          headerClassName,
        )}
      >
        {/* Title and header actions share a wrapping row of their own, so it is THEY
            that wrap on a phone — the actions drop under a title that needs its 12rem —
            while the X stays outside it, pinned to the top-end corner. */}
        <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0 grow basis-48">
            <Heading id={titleId} className="text-lg font-semibold leading-snug text-[var(--text-primary)]">
              {title}
            </Heading>
            {hasDescription && (
              <p id={descriptionId} className="mt-0.5 text-sm text-[var(--text-muted)]">
                {description}
              </p>
            )}
          </div>
          {headerActions !== undefined && headerActions !== null && headerActions !== false && (
            <FrameHeaderActions actions={headerActions} onClose={modal.onClose} />
          )}
        </div>
        {closeButton && <FrameClose label={closeLabel} onClose={modal.onClose} />}
      </div>
      {hasBody && (
        <div
          className={cn(
            // `min-h-0` is what lets a flex child shrink below its content and scroll;
            // `last:pb-4` closes a frame that has no actions row under it.
            "min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-3 last:pb-4",
            headerDivider && "pt-3",
            bodyClassName,
          )}
        >
          {children}
        </div>
      )}
      {actions !== undefined && actions !== null && (
        <FrameActions actions={actions} onClose={modal.onClose} divider={hasBody} />
      )}
    </Modal>
  );
}

/** The X. A component of its own so it can read the panel's animated close, which
 *  only exists INSIDE the `Modal` (the frame's own body runs outside it). */
function FrameClose({ label, onClose }: { label?: string; onClose: () => void }) {
  const close = useContext(ModalCloseContext) ?? onClose;
  const labels = useKitLabels("dialogFrame", DEFAULT_DIALOG_FRAME_LABELS, label === undefined ? undefined : { close: label });
  return (
    <button
      type="button"
      onClick={close}
      aria-label={labels.close}
      className="-me-1.5 -mt-1 shrink-0 rounded p-1.5 text-[var(--text-muted)] outline-none hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
    >
      <X aria-hidden className="size-5" />
    </button>
  );
}

/** The header's own controls; a component for the same reason as {@link FrameClose}. */
function FrameHeaderActions({
  actions,
  onClose,
}: {
  actions: NonNullable<DialogFrameProps["headerActions"]>;
  onClose: () => void;
}) {
  const close = useContext(ModalCloseContext) ?? onClose;
  return (
    <div data-dialog-header-actions="" className="flex shrink-0 flex-wrap items-center gap-2">
      {typeof actions === "function" ? actions(close) : actions}
    </div>
  );
}

function FrameActions({
  actions,
  onClose,
  divider,
}: {
  actions: NonNullable<DialogFrameProps["actions"]>;
  onClose: () => void;
  /** Off when there is no body: nothing scrolls, so there is no edge to mark, and a
   *  rule straight under the description would cut the question from its answers. */
  divider: boolean;
}) {
  const close = useContext(ModalCloseContext) ?? onClose;
  return (
    // The border marks where the scrolling stops; `flex-wrap` keeps three long
    // translated labels on a phone from pushing the row wider than the sheet.
    <div
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-end gap-2 px-4 py-3",
        divider && "border-t border-[var(--border)]",
      )}
    >
      {typeof actions === "function" ? actions(close) : actions}
    </div>
  );
}
