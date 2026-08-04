import { useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { useAnchoredPanel } from "../hooks/use-anchored-panel";
import { useEscapeKey, useOutsideClick } from "../hooks/use-dismiss";

interface PopoverProps {
  trigger: (state: { open: boolean; toggle: () => void; ref: RefObject<HTMLButtonElement | null> }) => ReactNode;
  children: (close: () => void) => ReactNode;
  width?: number;
}

const POPOVER_WIDTH = 288;

/**
 * Portal-rendered popover anchored under its trigger button. The panel is fixed
 * to the viewport (so table/overflow ancestors can't clip it) and re-aligns on
 * scroll/resize; it closes on outside-click and Escape.
 */
export function Popover({ trigger, children, width = POPOVER_WIDTH }: PopoverProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const toggle = () => setOpen((v) => !v);

  // Align the panel's right edge to the trigger's and clamp it horizontally; the
  // hook owns the vertical half — below by default, flipped above (and height-capped)
  // when that is where the room is, e.g. once a mobile keyboard has eaten the bottom
  // of the screen (feedback #135). It re-measures on scroll/resize.
  const placement = useAnchoredPanel(triggerRef, open);
  const rect = placement.rect;
  const pos = rect
    ? {
        top: placement.top,
        left: Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8),
      }
    : null;

  useOutsideClick([triggerRef, panelRef], close, open);
  useEscapeKey(close, open);

  return (
    <>
      {trigger({ open, toggle, ref: triggerRef })}
      {open && pos &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width,
              maxHeight: placement.maxHeight,
            }}
            className="z-50 overflow-y-auto rounded-md border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            {children(close)}
          </div>,
          document.body,
        )}
    </>
  );
}
