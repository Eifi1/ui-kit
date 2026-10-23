import { useState } from "react";
import { createPortal } from "react-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TourProvider, useTour, useTourGate, type TourStep } from "../tour";
import { FullBleedDialog } from "../../components/full-bleed-dialog";
import { Modal } from "../../components/modal";
import { useDismissLayer } from "../../hooks/use-dismiss";

/**
 * Layer order (docs/tours-harmonization.md §11.6, contract round 054 §6A, keksdose B1): a
 * field step's card and ring join the layer stack directly above the kit layer holding the
 * field, a layer opened later stacks above the card, a full-screen host gets no scrim and
 * no shields, and the tour is a layer on the Escape stack.
 */

const VIEW = { width: 390, height: 844 };
const FIELD = { top: 300, left: 20, width: 350, height: 44 };

function rect(b: { top: number; left: number; width: number; height: number }) {
  const r = { ...b, right: b.left + b.width, bottom: b.top + b.height, x: b.left, y: b.top };
  return { ...r, toJSON: () => r } as DOMRect;
}

/** A list the field opens AFTER the step arrived: a kit-style layer at the end of <body>. */
function LaterList({ onClose }: { onClose: () => void }) {
  useDismissLayer(true, onClose);
  return createPortal(
    <div data-kit-layer="" data-testid="later-list" className="fixed z-50">
      list
    </div>,
    document.body,
  );
}

function Form({ onDialogClose, fullScreen = true }: { onDialogClose: () => void; fullScreen?: boolean }) {
  const [amount, setAmount] = useState("");
  const [list, setList] = useState(false);
  useTourGate("txn.amount", amount !== "");
  const field = (
    <>
      <div data-tour="amount">
        <input aria-label="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <button type="button" onClick={() => setList(true)}>
        Open list
      </button>
      {list && <LaterList onClose={() => setList(false)} />}
    </>
  );
  return fullScreen ? (
    <FullBleedDialog open onClose={onDialogClose} title="Add transaction" closeLabel="Close" data-testid="sheet">
      {field}
    </FullBleedDialog>
  ) : (
    <Modal open onClose={onDialogClose} title="Add transaction">
      {field}
    </Modal>
  );
}

function Launcher({ steps }: { steps: TourStep[] }) {
  const tour = useTour();
  return (
    <>
      <button type="button" onClick={() => tour.start(steps)}>
        Take the tour
      </button>
      <output data-testid="state">{tour.active ? `step ${tour.index}` : "idle"}</output>
    </>
  );
}

const STEP: TourStep = { title: "Amount", body: "Type it.", target: '[data-tour="amount"]', gate: "txn.amount" };
const END: TourStep = { title: "End", body: "e" };

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
const state = () => screen.getByTestId("state").textContent;
const overlay = () => document.querySelector<HTMLElement>("[data-tour-overlay]")!;
const card = () => document.querySelector<HTMLElement>("[data-tour-card]")!;

let panelFullScreen = true;
beforeEach(() => {
  panelFullScreen = true;
  const original = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (this.getAttribute("data-tour") === "amount") return rect(FIELD);
    // The panel inside a backdrop host: full-screen on a phone, a centred box on a desktop.
    const parent = this.parentElement;
    if (parent?.getAttribute("data-kit-layer") === "backdrop") {
      return rect(panelFullScreen ? { top: 0, left: 0, ...VIEW } : { top: 200, left: 40, width: 300, height: 400 });
    }
    return original.call(this);
  });
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("innerWidth", VIEW.width);
  vi.stubGlobal("innerHeight", VIEW.height);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function startIn(fullScreen = true, steps: TourStep[] = [STEP, END]) {
  panelFullScreen = fullScreen;
  const onDialogClose = vi.fn();
  render(
    <TourProvider>
      <Launcher steps={steps} />
      <Form onDialogClose={onDialogClose} fullScreen={fullScreen} />
    </TourProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Take the tour" }));
  await flush();
  return { onDialogClose };
}

describe("Tour layer order", () => {
  it("a field step's overlay is the host's next sibling, at z-50", async () => {
    await startIn();
    const host = document.querySelector("[data-kit-layer]")!;
    expect(host.nextElementSibling).toBe(overlay().parentElement);
    expect(overlay().parentElement).toHaveAttribute("data-tour-layer");
    expect(overlay()).toHaveClass("z-50");
  });

  it("a layer the field opens afterwards comes after the overlay, so it paints above the card", async () => {
    await startIn();
    fireEvent.click(screen.getByRole("button", { name: "Open list" }));
    await flush();
    const list = screen.getByTestId("later-list");
    const order = overlay().parentElement!.compareDocumentPosition(list);
    expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("inside a full-screen host: no scrim and no shields, only the ring", async () => {
    await startIn(true);
    expect(overlay()).toHaveAttribute("data-tour-bare", "");
    expect(document.querySelectorAll("[data-tour-shield]")).toHaveLength(0);
    const ring = overlay().querySelector<HTMLElement>(".rounded-lg")!;
    expect(ring.style.boxShadow).not.toContain("9999px");
  });

  it("in a host that does not fill the screen (a desktop Modal) the scrim and shields stay", async () => {
    await startIn(false);
    expect(overlay()).not.toHaveAttribute("data-tour-bare");
    expect(document.querySelectorAll("[data-tour-shield]")).toHaveLength(4);
  });

  it("a plain step stays at z-[60] at the end of <body>, over everything", async () => {
    await startIn(true, [{ title: "Look", body: "l", target: '[data-tour="amount"]' }, END]);
    expect(overlay()).toHaveClass("z-[60]");
    expect(overlay().parentElement).toBe(document.body);
  });

  it("the step's container leaves with the step", async () => {
    await startIn();
    expect(document.querySelectorAll("[data-tour-layer]")).toHaveLength(1);
    fireEvent.change(screen.getByRole("textbox", { name: "Amount" }), { target: { value: "5" } });
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await flush();
    expect(document.querySelectorAll("[data-tour-layer]")).toHaveLength(0);
  });
});

describe("Tour Escape layer", () => {
  it("Escape from the card skips the tour and the sheet stays open", async () => {
    const { onDialogClose } = await startIn();
    act(() => card().focus());
    fireEvent.keyDown(card(), { key: "Escape" });
    await flush();
    expect(state()).toBe("idle");
    expect(onDialogClose).not.toHaveBeenCalled();
  });

  it("Escape in the open list closes only the list; the next one from the card skips the tour", async () => {
    const { onDialogClose } = await startIn();
    fireEvent.click(screen.getByRole("button", { name: "Open list" }));
    await flush();
    fireEvent.keyDown(document.body, { key: "Escape" });
    await flush();
    expect(screen.queryByTestId("later-list")).toBeNull();
    expect(state()).toBe("step 0");
    expect(onDialogClose).not.toHaveBeenCalled();
    fireEvent.keyDown(card(), { key: "Escape" });
    await flush();
    expect(state()).toBe("idle");
    expect(onDialogClose).not.toHaveBeenCalled();
  });

  it("Escape in the field belongs to the field: it neither skips the tour nor closes the sheet", async () => {
    const { onDialogClose } = await startIn();
    const input = screen.getByRole("textbox", { name: "Amount" });
    fireEvent.keyDown(input, { key: "Escape" });
    await flush();
    expect(state()).toBe("step 0");
    expect(onDialogClose).not.toHaveBeenCalled();
  });
});
