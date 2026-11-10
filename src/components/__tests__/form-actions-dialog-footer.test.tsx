import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "../button";
import { DialogFrame } from "../dialog-frame";
import { FormActions } from "../form-actions";
import { FullBleedDialog } from "../full-bleed-dialog";
import { PickerSheet } from "../picker-sheet";
import { stubDesktop, stubPhone } from "../../test/viewport";

/**
 * A FormActions in a dialog's footer fills the footer (keksdose live #496). The footer is a
 * wrapping row aligned to its end, so its items took their own width: a STACKED FormActions —
 * the phone layout at Large, every dialog's footer there, or `stack="phone"` — stood as wide as
 * its widest button at the footer's end edge, and as a row a `start` action could not reach the
 * start. keksdose wrote `className="w-full"` on two dialogs' rows for it.
 *
 * jsdom lays nothing out, so "fills" is read off the classes, as the CSS reads them: the row's
 * own, or the footer's child selector that reaches it.
 */

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-text-size");
});

/** The FormActions row the footer holds, as its own item. */
function row(): HTMLElement {
  const el = document.querySelector<HTMLElement>("[data-slot=form-actions]");
  if (!el) throw new Error("no FormActions row");
  return el;
}

/** Stacked: the row takes a line of its own, the footer's whole width. */
function fillsFooterStacked(el: HTMLElement): boolean {
  if (el.classList.contains("w-full") || el.classList.contains("basis-full")) return true;
  const footer = el.parentElement!;
  return (
    el.hasAttribute("data-stacked") &&
    footer.classList.contains("[&>[data-slot=form-actions][data-stacked]]:basis-full")
  );
}

/** As a row: it takes what the footer's line has left, so `between` spreads across it. */
function growsInFooter(el: HTMLElement): boolean {
  if (el.classList.contains("w-full") || el.classList.contains("grow") || el.classList.contains("flex-1")) return true;
  return el.parentElement!.classList.contains("[&>[data-slot=form-actions]]:grow");
}

/** keksdose's suggestion dialog: two saves, no Cancel, the second save a child. */
function actions(props: { stack?: "auto" | "phone" } = {}) {
  return (
    <FormActions placement="dialog" onSubmit={() => {}} submitLabel="Save as list" {...props}>
      <Button variant="secondary" onClick={() => {}}>
        Save as template
      </Button>
    </FormActions>
  );
}

function frame(footer: ReactNode) {
  return (
    <DialogFrame onClose={() => {}} title="Suggestions" actions={footer}>
      <p>Body</p>
    </DialogFrame>
  );
}

describe("FormActions in DialogFrame's actions row", () => {
  it("stacked at Large on a phone (stack='auto', every dialog), it fills the footer", () => {
    document.documentElement.setAttribute("data-text-size", "large");
    stubPhone();
    render(frame(actions()));
    expect(row()).toHaveAttribute("data-stacked");
    expect(fillsFooterStacked(row()), "the stacked column fills the footer").toBe(true);
    // Each button fills the column, so each spans the dialog.
    expect(screen.getByRole("button", { name: "Save as list" })).toHaveClass("w-full");
  });

  it("stacked on a phone at Normal with stack='phone', it fills the footer", () => {
    stubPhone();
    render(frame(actions({ stack: "phone" })));
    expect(row()).toHaveAttribute("data-stacked");
    expect(fillsFooterStacked(row())).toBe(true);
  });

  it("without placement='dialog' too: the footer decides, not the prop", () => {
    stubPhone();
    render(
      frame(
        <FormActions stack="phone" onSubmit={() => {}} onCancel={() => {}}>
          {null}
        </FormActions>,
      ),
    );
    expect(fillsFooterStacked(row())).toBe(true);
  });

  it("as a row on a desktop it grows, so a start action reaches the footer's start", () => {
    stubDesktop();
    render(
      frame(
        <FormActions
          placement="dialog"
          onSubmit={() => {}}
          onCancel={() => {}}
          start={
            <Button variant="ghost" onClick={() => {}}>
              Not my balance
            </Button>
          }
        />,
      ),
    );
    expect(row()).not.toHaveAttribute("data-stacked");
    expect(row()).toHaveClass("justify-between");
    expect(growsInFooter(row()), "the row takes the footer's line").toBe(true);
    // A line of its own only when stacked: a row keeps the caller's other items beside it.
    expect(row().parentElement!.className).not.toMatch(/(^|\s)\[&>\[data-slot=form-actions\]\]:basis-full/);
  });

  it("reaches only the footer's OWN FormActions, not one inside the caller's wrapper", () => {
    document.documentElement.setAttribute("data-text-size", "large");
    stubPhone();
    render(frame(<div data-testid="own">{actions()}</div>));
    const own = screen.getByTestId("own");
    // The selector is a child one: the caller's wrapper is its layout, and stays it.
    expect(row().parentElement).toBe(own);
    expect(fillsFooterStacked(row())).toBe(false);
  });
});

describe("FormActions in the other footers", () => {
  it("fills FullBleedDialog's footer, stacked", () => {
    document.documentElement.setAttribute("data-text-size", "large");
    stubPhone();
    render(
      <FullBleedDialog open onClose={() => {}} title="Edit" closeLabel="Close" footer={actions()}>
        <p>Body</p>
      </FullBleedDialog>,
    );
    expect(row().parentElement).toHaveAttribute("data-full-bleed-footer");
    expect(fillsFooterStacked(row())).toBe(true);
  });

  it("fills PickerSheet's footer, stacked", () => {
    document.documentElement.setAttribute("data-text-size", "large");
    stubPhone();
    render(
      <PickerSheet open onClose={() => {}} title="Payees" query="" onQueryChange={() => {}} footer={actions()}>
        <ul />
      </PickerSheet>,
    );
    expect(row().parentElement).toHaveAttribute("data-picker-sheet-footer");
    expect(fillsFooterStacked(row())).toBe(true);
  });
});
