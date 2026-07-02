import { useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { useAnchoredRect } from "../hooks/use-anchored-rect";
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

  // Align the panel's right edge to the trigger's, sitting just below it, and
  // clamp it into the viewport. The hook re-measures on scroll/resize.
  const rect = useAnchoredRect(triggerRef, open);
  const pos = rect
    ? {
        top: rect.bottom + 4,
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
            style={{ position: "fixed", top: pos.top, left: pos.left, width }}
            className="z-50 rounded-md border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            {children(close)}
          </div>,
          document.body,
        )}
    </>
  );
}
