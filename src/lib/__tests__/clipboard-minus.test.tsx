import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { asciiMinusInNumbers, installClipboardMinus } from "../clipboard-minus";
import { UiKitProvider } from "../../i18n/kit-labels";

/** 0.49 KIT-1b: the screen keeps "−", the clipboard gets "-" before a number. */

const M = "−";

describe("asciiMinusInNumbers", () => {
  it("turns U+2212 before a number into a hyphen, after a currency code or symbol too", () => {
    expect(asciiMinusInNumbers(`${M}1,250.50`)).toBe("-1,250.50");
    expect(asciiMinusInNumbers(`${M}CHF 1,250.50`)).toBe("-CHF 1,250.50");
    expect(asciiMinusInNumbers(`${M}€2,000.00`)).toBe("-€2,000.00");
    expect(asciiMinusInNumbers(`CHF ${M}5.00 and ${M}12%`)).toBe("CHF -5.00 and -12%");
    expect(asciiMinusInNumbers(`${M}CHF\u00a01’250.50`)).toBe("-CHF\u00a01’250.50");
    expect(asciiMinusInNumbers(`(${M}€100.00)`)).toBe("(-€100.00)");
  });

  it("leaves a minus that is not before a number alone", () => {
    expect(asciiMinusInNumbers(`a ${M} b`)).toBe(`a ${M} b`);
    expect(asciiMinusInNumbers(`x${M}y`)).toBe(`x${M}y`);
    expect(asciiMinusInNumbers("no minus here -3")).toBe("no minus here -3");
  });
});

/** A copy event as a browser fires it, with a DataTransfer stub jsdom does not have. */
function copy(target: Node = document.body) {
  const data = new Map<string, string>();
  const event = new Event("copy", { bubbles: true, cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, "clipboardData", {
    value: { setData: (t: string, v: string) => data.set(t, v), getData: (t: string) => data.get(t) ?? "" },
  });
  target.dispatchEvent(event);
  return { event, data };
}

function select(node: Node) {
  const range = document.createRange();
  range.selectNodeContents(node);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

describe("the copy handler", () => {
  let uninstall: (() => void) | undefined;
  afterEach(() => {
    uninstall?.();
    uninstall = undefined;
    window.getSelection()?.removeAllRanges();
    document.body.innerHTML = "";
  });

  it("writes text/plain and text/html with a hyphen; the page keeps U+2212", () => {
    uninstall = installClipboardMinus();
    document.body.innerHTML = `<table><tbody><tr><td id="c">${M}CHF 1,250.50</td><td>Rent</td></tr></tbody></table>`;
    const cell = document.getElementById("c")!;
    select(cell);
    const { event, data } = copy(cell);
    expect(event.defaultPrevented).toBe(true);
    expect(data.get("text/plain")).toBe("-CHF 1,250.50");
    expect(data.get("text/html")).toContain("-CHF 1,250.50");
    expect(data.get("text/html")).not.toContain(M);
    expect(cell.textContent).toBe(`${M}CHF 1,250.50`);
  });

  it("keeps a table's rows as table HTML, which Excel pastes as cells", () => {
    uninstall = installClipboardMinus();
    document.body.innerHTML = `<table><tbody id="b"><tr><td>Rent</td><td>${M}1,200.00</td></tr><tr><td>Pay</td><td>3,000.00</td></tr></tbody></table>`;
    select(document.getElementById("b")!);
    const { data } = copy(document.getElementById("b")!);
    expect(data.get("text/html")).toMatch(/^<table>.*<td>-1,200.00<\/td>.*<\/table>$/s);
  });

  it("lets a copy without a minus before a number go through untouched", () => {
    uninstall = installClipboardMinus();
    document.body.innerHTML = `<p id="p">Rent ${M} a dash, not a number</p>`;
    select(document.getElementById("p")!);
    const { event, data } = copy(document.getElementById("p")!);
    expect(event.defaultPrevented).toBe(false);
    expect(data.size).toBe(0);
  });

  it("leaves inputs and textareas alone", () => {
    uninstall = installClipboardMinus();
    document.body.innerHTML = `<p id="p">${M}5.00</p><textarea id="t">${M}5.00</textarea>`;
    select(document.getElementById("p")!);
    const textarea = document.getElementById("t") as HTMLTextAreaElement;
    textarea.focus();
    const { event } = copy(textarea);
    expect(event.defaultPrevented).toBe(false);
  });

  it("is installed once however many times it is asked, and removed with the last", () => {
    const a = installClipboardMinus();
    const b = installClipboardMinus();
    document.body.innerHTML = `<p id="p">${M}5.00</p>`;
    select(document.getElementById("p")!);
    a();
    expect(copy(document.getElementById("p")!).data.get("text/plain")).toBe("-5.00");
    b();
    expect(copy(document.getElementById("p")!).event.defaultPrevented).toBe(false);
  });
});

describe("UiKitProvider installs it (copyAsciiMinus)", () => {
  afterEach(() => {
    window.getSelection()?.removeAllRanges();
  });

  it("by default, and not with copyAsciiMinus={false}", async () => {
    const { unmount } = render(
      <UiKitProvider>
        <p>{`${M}CHF 1,250.50`}</p>
      </UiKitProvider>,
    );
    const p = screen.getByText(`${M}CHF 1,250.50`);
    select(p);
    // The provider loads the handler with a dynamic import: wait for it.
    await expect.poll(() => copy(p).data.get("text/plain")).toBe("-CHF 1,250.50");
    unmount();
    render(
      <UiKitProvider copyAsciiMinus={false}>
        <p>{`${M}7.00`}</p>
      </UiKitProvider>,
    );
    const q = screen.getByText(`${M}7.00`);
    select(q);
    await new Promise((r) => setTimeout(r, 20));
    expect(copy(q).event.defaultPrevented).toBe(false);
  });
});
