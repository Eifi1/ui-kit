import { useRef, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AlertBanner } from "../alert-banner";

/**
 * AlertBanner's × calls `onDismiss` and the caller removes the banner — and with it the
 * × that held the focus, which fell to `<body>` (refactor audit 2026-10-30, DSP-15;
 * keksdose 2, kastlan 1, KS 1 sites). It now moves on to the next control after the
 * banner, where Tab from the × would have gone, or to `dismissFocusRef`.
 */

function Page({ target = false, keep = false, last = false }: { target?: boolean; keep?: boolean; last?: boolean }) {
  const [shown, setShown] = useState(true);
  const heading = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button" ref={heading}>
        Before
      </button>
      {shown && (
        <AlertBanner
          tone="info"
          onDismiss={() => setShown(keep)}
          dismissFocusRef={target ? heading : undefined}
          action={<button type="button">Banner action</button>}
        >
          Beta build
        </AlertBanner>
      )}
      {!last && <button type="button">After</button>}
    </>
  );
}

function dismiss() {
  const x = screen.getByRole("button", { name: "Dismiss" });
  act(() => x.focus());
  fireEvent.click(x);
}

describe("AlertBanner's × keeps the focus on the page (audit 2026-10-30 DSP-15)", () => {
  it("moves on to the next control after the banner", () => {
    render(<Page />);
    dismiss();
    expect(screen.queryByText("Beta build")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "After" }));
  });

  it("at the end of the page, to the control before it", () => {
    render(<Page last />);
    dismiss();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Before" }));
  });

  it("dismissFocusRef wins", () => {
    render(<Page target />);
    dismiss();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Before" }));
  });

  it("a banner the caller keeps keeps its ×'s focus", () => {
    render(<Page keep />);
    dismiss();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Dismiss" }));
  });
});
