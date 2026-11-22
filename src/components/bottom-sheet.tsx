import { useRef } from "react";
import type { CSSProperties, HTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../lib/cn";
import { useBodyScrollLock } from "../hooks/use-body-scroll-lock";
import { takeEscape, useDismissLayer } from "../hooks/use-dismiss";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { useOverlayHistory } from "../hooks/use-overlay-history";
import { IconButton } from "./icon-button";

/**
 * @internal The kit's bottom sheet frame: what {@link NumberPadSheet} and
 * {@link AttachButton}'s phone sheet share (0.66, the AttachButton draft's §2). Not
 * exported: two users is not yet a component, and a third one is when it earns a name.
 *
 * Both are pinned to the bottom of the screen, portalled to `<body>` (out of whatever
 * transformed or clipped box opened them), a kit layer (`data-kit-layer`, the tours'
 * layer order) and the bottom layer a docked tour card stays clear of
 * (`data-tour-obstruction`, docs/tours-harmonization.md §11.6), a layer on the Escape
 * stack, and padded for a phone's home indicator. What tells them apart is `modal`:
 *
 * - **`modal` (the default)** — a dialog over a scrim: `aria-modal`, a focus trap that
 *   gives the focus back to the opener, no scrolling behind it, the phone's Back closing
 *   it instead of leaving the page, a tap on the scrim closing it, and a header with a
 *   grab handle, the title and a ✕. AttachButton's chooser.
 * - **`modal={false}`** — a KEYBOARD, not a dialog: NumberPadSheet. No trap (moving the
 *   focus off the host field unmounts the pad — its own long note says why), no scroll
 *   lock (keksdose live #317), no Back entry, no header; only the Escape layer. The
 *   caller names it (`role`, `aria-label`) and keeps the host focused itself.
 *
 * A click inside stops at the frame: React carries a portal's events up its own tree, and
 * an AttachButton inside a `FileDropzone`'s `renderBody` (keksdose's scan page) would
 * read a tap on a tile as a tap on the zone and open the zone's picker too — the reason
 * `CameraCapture` stops its clicks.
 */
export interface BottomSheetProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Every way out: the ✕, the scrim, Escape and Back (the last two `modal` only, Escape
   *  always). None of them while `busy`. */
  onClose: () => void;
  /** See above. Default `true`. */
  modal?: boolean;
  /** `modal`: the heading, and the dialog's accessible name when it is a string. */
  title?: ReactNode;
  /** `modal`: the ✕'s accessible name. */
  closeLabel?: string;
  /** Hold every way out (an upload in flight): the layer stays on the stack, so an
   *  Escape does nothing rather than reaching what is behind. */
  busy?: boolean;
  /** `modal`: where the focus goes back to on close, when it is not what had it as the
   *  sheet opened (on Safari a click does not focus the button it lands on). */
  opener?: () => Element | null;
  /** The bottom padding's floor, under `env(safe-area-inset-bottom)`. Default `0.5rem`. */
  padBottom?: string;
  children: ReactNode;
}

export function BottomSheet({
  onClose,
  modal = true,
  title,
  closeLabel,
  busy = false,
  opener,
  padBottom = "0.5rem",
  className,
  style,
  children,
  ...rest
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const leave = () => {
    if (!busy) onClose();
  };
  // Escape for both kinds. A keyboard sheet never has the focus a keydown would bubble
  // from (the host field has it), so the stack's document fallback hands it the key.
  useDismissLayer(true, leave);
  useFocusTrap(sheetRef, { active: modal, opener });
  useBodyScrollLock(modal);
  useOverlayHistory(modal, leave);

  if (typeof document === "undefined") return null;

  const padding: CSSProperties = { paddingBottom: `max(${padBottom}, env(safe-area-inset-bottom))` };

  if (!modal) {
    return createPortal(
      <div
        {...rest}
        ref={sheetRef}
        data-kit-layer=""
        data-tour-obstruction=""
        className={cn("fixed inset-x-0 bottom-0 z-50 border-t border-subtle bg-surface", className)}
        style={{ ...style, ...padding }}
      >
        {children}
      </div>,
      document.body,
    );
  }

  return createPortal(
    <>
      {/* The scrim: a tap on the page behind closes the sheet, as a dialog's backdrop
          does. Hidden and not focusable on purpose: Escape, Back and the ✕ are the
          keyboard's and the screen reader's ways out. Its click is stopped too (above). */}
      <div
        aria-hidden
        data-bottom-sheet-scrim=""
        className="fixed inset-0 z-50 bg-black/40"
        onClick={(e) => {
          e.stopPropagation();
          leave();
        }}
      />
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the
          dialog container, per the APG dialog pattern: `onKeyDown` hands Escape to the
          layer stack for whatever inside holds focus, and `onClick` only keeps a tap
          inside from reaching the opener's React ancestors (see above). */}
      <div
        {...rest}
        ref={sheetRef}
        data-kit-layer=""
        data-tour-obstruction=""
        role="dialog"
        aria-modal="true"
        aria-label={rest["aria-label"] ?? (typeof title === "string" ? title : undefined)}
        // For the focus trap, which focuses the container: a tile under the thumb is
        // not pressed by the Enter that opened the sheet.
        tabIndex={-1}
        onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
          rest.onKeyDown?.(e);
          takeEscape(e);
        }}
        onClick={(e) => {
          rest.onClick?.(e);
          e.stopPropagation();
        }}
        // Never taller than the screen less a strip of the page, so it reads as a sheet
        // over the page; what does not fit scrolls inside it.
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-2xl border-t border-subtle bg-surface shadow-lg outline-none",
          className,
        )}
        style={{ ...style, ...padding }}
      >
        {/* The grab handle: decoration that says "sheet" — the ✕, the scrim, Escape and
            Back close it; there is no drag. */}
        <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-active" />
        <div className="flex items-center gap-2 px-4 pt-1 pb-2">
          <h2 className="min-w-0 flex-1 truncate-until-large text-base font-semibold text-primary">{title}</h2>
          {/* No native `disabled` while `busy`: it would drop a focused ✕'s focus to
              <body>; `leave` already holds. */}
          <IconButton size="sm" tone="muted" label={closeLabel} onClick={leave}>
            <X />
          </IconButton>
        </div>
        {children}
      </div>
    </>,
    document.body,
  );
}
