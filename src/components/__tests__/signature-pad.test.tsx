import { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignaturePad } from "../signature-pad";
import type { SignaturePadHandle } from "../signature-pad";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * jsdom has no canvas: `getContext` logs "not implemented" and returns null, and
 * `toDataURL` does the same. Both are stubbed on the prototype — the pad's own
 * canvas and the off-screen one it exports through — with a context that records
 * what was asked of it, which is enough to see that ink was drawn in which colour.
 */
const PNG = "data:image/png;base64,STUB";

function fakeContext() {
  const calls: string[] = [];
  const ctx = {
    calls,
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
    font: "",
    textAlign: "start",
    textBaseline: "alphabetic",
    setTransform: () => calls.push("setTransform"),
    clearRect: () => calls.push("clearRect"),
    fillRect: () => calls.push("fillRect"),
    beginPath: () => calls.push("beginPath"),
    moveTo: () => calls.push("moveTo"),
    lineTo: () => calls.push("lineTo"),
    quadraticCurveTo: () => calls.push("quadraticCurveTo"),
    arc: () => calls.push("arc"),
    stroke: () => calls.push("stroke"),
    fill: () => calls.push("fill"),
    fillText: (text: string) => calls.push(`fillText:${text}`),
    measureText: (text: string) => ({ width: text.length * 10 }),
  };
  return ctx;
}

type FakeCtx = ReturnType<typeof fakeContext>;
let contexts: Map<HTMLCanvasElement, FakeCtx>;

beforeEach(() => {
  contexts = new Map();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    let ctx = contexts.get(this);
    if (!ctx) {
      ctx = fakeContext();
      contexts.set(this, ctx);
    }
    return ctx as unknown as CanvasRenderingContext2D;
  } as unknown as HTMLCanvasElement["getContext"]);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(PNG);
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: 300, bottom: 160, width: 300, height: 160, toJSON: () => ({}),
  } as DOMRect);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const canvas = () => screen.getByRole("img", { name: "Signature" }) as HTMLCanvasElement;

function drawStroke(el: HTMLElement, pointerId = 1, pointerType = "mouse") {
  fireEvent.pointerDown(el, { pointerId, pointerType, button: 0, clientX: 10, clientY: 10 });
  fireEvent.pointerMove(el, { pointerId, pointerType, clientX: 40, clientY: 30 });
  fireEvent.pointerMove(el, { pointerId, pointerType, clientX: 80, clientY: 20 });
  fireEvent.pointerUp(el, { pointerId, pointerType });
}

describe("SignaturePad", () => {
  it("is a labelled, described image that says it is empty", () => {
    render(<SignaturePad />);
    const el = canvas();
    const description = el.getAttribute("aria-describedby")!.split(" ").map((id) => document.getElementById(id)?.textContent);
    expect(description).toContain("Sign in the box with a mouse, your finger or a pen.");
    expect(description).toContain("Nothing drawn yet");
  });

  it("draws a stroke, reports a PNG, and then says it is signed", () => {
    const onChange = vi.fn();
    render(<SignaturePad onChange={onChange} />);
    drawStroke(canvas());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(PNG, { method: "drawn" });
    expect(screen.getByText("Signature drawn")).toBeInTheDocument();
    expect(contexts.get(canvas())!.calls).toContain("quadraticCurveTo");
  });

  it("exports in the export ink, not the on-screen one", () => {
    const onChange = vi.fn();
    render(<SignaturePad onChange={onChange} exportInk="#123456" />);
    drawStroke(canvas());
    const offscreen = [...contexts.entries()].find(([el]) => el !== canvas())![1];
    expect(offscreen.strokeStyle).toBe("#123456");
  });

  it("ignores a second pointer while one stroke is in progress", () => {
    const onChange = vi.fn();
    render(<SignaturePad onChange={onChange} />);
    const el = canvas();
    fireEvent.pointerDown(el, { pointerId: 1, pointerType: "pen", button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerDown(el, { pointerId: 2, pointerType: "touch", button: 0, clientX: 90, clientY: 90 });
    fireEvent.pointerUp(el, { pointerId: 2, pointerType: "touch" });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(el, { pointerId: 1, pointerType: "pen" });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("undoes the last stroke and clears to null", () => {
    const onChange = vi.fn();
    render(<SignaturePad onChange={onChange} />);
    const undo = screen.getByRole("button", { name: "Undo last stroke" });
    const clear = screen.getByRole("button", { name: "Clear" });
    expect(undo).toHaveAttribute("aria-disabled", "true");
    expect(clear).toHaveAttribute("aria-disabled", "true");

    drawStroke(canvas());
    drawStroke(canvas());
    expect(undo).not.toHaveAttribute("aria-disabled");
    fireEvent.click(undo);
    expect(onChange).toHaveBeenLastCalledWith(PNG, { method: "drawn" });
    fireEvent.click(clear);
    expect(onChange).toHaveBeenLastCalledWith(null, { method: "drawn" });
    expect(screen.getByText("Nothing drawn yet")).toBeInTheDocument();
    // Still focusable after disabling itself — aria-disabled, not disabled.
    expect(clear).not.toBeDisabled();
  });

  it("announces a clear through the live region", async () => {
    vi.useFakeTimers();
    try {
      render(<SignaturePad />);
      drawStroke(canvas());
      fireEvent.click(screen.getByRole("button", { name: "Clear" }));
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(screen.getByRole("status")).toHaveTextContent("Signature cleared");
    } finally {
      vi.useRealTimers();
    }
  });

  it("exposes clear / toDataURL / isEmpty on its ref", () => {
    const ref = createRef<SignaturePadHandle>();
    const onChange = vi.fn();
    render(<SignaturePad ref={ref} onChange={onChange} />);
    expect(ref.current!.isEmpty()).toBe(true);
    expect(ref.current!.toDataURL()).toBeNull();
    drawStroke(canvas());
    expect(ref.current!.isEmpty()).toBe(false);
    expect(ref.current!.toDataURL()).toBe(PNG);
    act(() => ref.current!.clear());
    expect(ref.current!.isEmpty()).toBe(true);
    expect(onChange).toHaveBeenLastCalledWith(null, { method: "drawn" });
  });

  it("draws nothing while disabled", () => {
    const onChange = vi.fn();
    const onSave = vi.fn();
    render(<SignaturePad disabled onChange={onChange} onSave={onSave} />);
    drawStroke(canvas());
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save signature" })).toBeDisabled();
  });

  it("saves through onSave once something is drawn", () => {
    const onSave = vi.fn();
    render(<SignaturePad onSave={onSave} />);
    const save = screen.getByRole("button", { name: "Save signature" });
    expect(save).toBeDisabled();
    drawStroke(canvas());
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledWith(PNG, { method: "drawn" });
  });

  it("attaches an error message and marks the pad invalid", () => {
    render(<SignaturePad error="Please sign" />);
    const el = canvas();
    const ids = el.getAttribute("aria-describedby")!.split(" ");
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toContain("Please sign");
    expect(el).toHaveAttribute("data-invalid", "true");
  });

  it("offers a typed name that is rendered into the PNG and reported as text", () => {
    const onChange = vi.fn();
    render(<SignaturePad allowTypedName onChange={onChange} />);
    expect(screen.getByText(/If you cannot draw, type your name instead\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Type name instead" }));
    expect(onChange).toHaveBeenLastCalledWith(null, { method: "typed", typedName: "" });
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Ada Lovelace " } });
    expect(onChange).toHaveBeenLastCalledWith(PNG, { method: "typed", typedName: "Ada Lovelace" });
    expect(contexts.get(canvas())!.calls).toContain("fillText:Ada Lovelace");
    // Pointer input is ignored in typed mode.
    onChange.mockClear();
    drawStroke(canvas());
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Draw instead" })).toBeInTheDocument();
  });

  it("takes its strings from the provider, and the prop over the provider", () => {
    render(
      <UiKitProvider labels={{ signaturePad: { label: "Unterschrift", clear: "Löschen" } }}>
        <SignaturePad labels={{ clear: "Leeren" }} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("img", { name: "Unterschrift" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leeren" })).toBeInTheDocument();
  });
});
