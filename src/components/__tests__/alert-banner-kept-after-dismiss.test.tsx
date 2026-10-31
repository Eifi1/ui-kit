import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AlertBanner } from "../alert-banner";
import { flushMicrotasks } from "../../test/tasks";

/**
 * 0.52 code review, alert-banner.tsx: the × notes the tab stops around the banner, so the
 * focus can go there once the caller removes it (refactor audit 2026-10-30, DSP-15). A
 * caller that KEEPS the banner — an async dismiss that failed, a snooze — left that note
 * standing: the banner's later unmount, a route change with the focus on <body>, sent the
 * focus to a stop noted at the press, over whatever the app does with focus on a new page.
 */

function App({ page = true }: { page?: boolean }) {
  return (
    <>
      <button type="button">Top bar</button>
      {page && (
        <main>
          <AlertBanner tone="info" onDismiss={() => {}} action={<button type="button">Banner action</button>}>
            Beta build
          </AlertBanner>
          <a href="/next">Next page</a>
        </main>
      )}
    </>
  );
}

function pressDismissAndKeep() {
  const x = screen.getByRole("button", { name: "Dismiss" });
  act(() => x.focus());
  fireEvent.click(x);
  expect(screen.getByText("Beta build")).toBeInTheDocument();
}

describe("a banner kept after its × forgets where the focus would have gone", () => {
  it("once the focus moved elsewhere, a later unmount leaves the focus alone", () => {
    const { rerender } = render(<App />);
    pressDismissAndKeep();
    // The reader moves on: into the page, then away from it (the link starts a navigation).
    act(() => screen.getByRole("link", { name: "Next page" }).focus());
    rerender(<App page={false} />);
    expect(document.activeElement).toBe(document.body);
  });

  it("once the focus left the banner for nothing (a click on the page), a later unmount leaves it alone", async () => {
    // No element took the focus, so no `focusin` said it left (0.52 code review).
    const { rerender } = render(<App />);
    pressDismissAndKeep();
    act(() => screen.getByRole("button", { name: "Dismiss" }).blur());
    await flushMicrotasks();
    rerender(<App page={false} />);
    expect(document.activeElement).toBe(document.body);
  });

  it("focus moving within the banner keeps the note: its removal still takes the focus on", () => {
    const { rerender } = render(<App />);
    pressDismissAndKeep();
    act(() => screen.getByRole("button", { name: "Banner action" }).focus());
    rerender(<App page={false} />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Top bar" }));
  });

  it("a late removal with the focus still on the × moves it on, as DSP-15 does", () => {
    const { rerender } = render(<App />);
    pressDismissAndKeep();
    rerender(<App page={false} />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Top bar" }));
  });
});
