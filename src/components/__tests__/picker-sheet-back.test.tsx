import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { PickerSheet } from "../picker-sheet";
import { useOverlayHistory } from "../../hooks/use-overlay-history";

/**
 * Back closes the sheet, not the dialog under it (Keksdose live #309).
 *
 * *"Mouse Back does not only close the select but also the whole edit or create
 * dialog which is cumbersome."*
 *
 * The composition is the real one: a row editor that owns a history entry
 * (`data-table.tsx` pushes one for the mobile editor), with a picker sheet opened
 * from a field inside it. Before this the sheet had no entry at all, so one Back
 * press threw away an edit in progress in order to dismiss a list.
 *
 * ## The sheet has to be opened in a LATER commit, and that is not test ceremony
 *
 * React runs effects CHILD-FIRST, so a version of this that renders the editor and
 * an already-open sheet in ONE commit pushes the sheet's sentinel first and the
 * editor's on top of it — the exact inverse of what a person does, which is open a
 * dialog and then tap a field in it. Written that way the test fails against a
 * correct implementation, which is a good way to "fix" a bug that was never there.
 *
 * Asserted through the CLOSE HANDLERS rather than the history state, because what
 * the report is about is which thing goes away.
 */

/** jsdom fires popstate in a task, so every traversal needs a flush. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function back() {
  await act(async () => {
    const landed = new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(() => {
        window.removeEventListener("popstate", done);
        resolve();
      }, 2000);
      window.addEventListener("popstate", done, { once: true });
    });
    window.history.back();
    await landed;
  });
}

function Editor({
  onCloseEditor,
  onSheetClosed,
}: {
  onCloseEditor: () => void;
  onSheetClosed?: () => void;
}) {
  // What the mobile row editor does, which is why Back reached it at all.
  useOverlayHistory(true, onCloseEditor);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  return (
    <div>
      <span>editor</span>
      <button type="button" onClick={() => setSheetOpen(true)}>
        account
      </button>
      <PickerSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          onSheetClosed?.();
        }}
        query={query}
        onQueryChange={setQuery}
      >
        <button type="button">Giro</button>
      </PickerSheet>
    </div>
  );
}

beforeEach(async () => {
  window.history.replaceState(null, "");
  await settle();
});

describe("a picker sheet over a dialog", () => {
  it("takes the Back press itself and leaves the dialog open", async () => {
    const onCloseEditor = vi.fn();
    const onSheetClosed = vi.fn();
    render(<Editor onCloseEditor={onCloseEditor} onSheetClosed={onSheetClosed} />);

    fireEvent.click(screen.getByText("account"));
    await settle();
    expect(screen.getByText("Giro")).toBeInTheDocument();

    await back();

    expect(onSheetClosed).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Giro")).not.toBeInTheDocument();
    // The half the report is actually about: the edit survives.
    expect(onCloseEditor).not.toHaveBeenCalled();
    expect(screen.getByText("editor")).toBeInTheDocument();
  });

  it("hands the NEXT Back press to the dialog, with no dead entry in between", async () => {
    const onCloseEditor = vi.fn();
    render(<Editor onCloseEditor={onCloseEditor} />);

    fireEvent.click(screen.getByText("account"));
    await settle();
    await back();
    await settle();
    expect(onCloseEditor).not.toHaveBeenCalled();

    // Two overlays, two presses. A husk left behind by the first would swallow this
    // one silently — the failure the hook's own U-12 test is about.
    await back();
    expect(onCloseEditor).toHaveBeenCalledTimes(1);
  });
});
