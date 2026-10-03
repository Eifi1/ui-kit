import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FieldHint, Input, Select, Textarea } from "../ui";

/**
 * 0.24, Kurvenschmiede: the floated label of a labelled Textarea sat ON the first
 * visible line once a long paste made the field scroll (ColumnMapper's "Paste a table",
 * desktop and phone). The fix is a strip behind the label that keeps the field's own
 * surface — the top padding, made to stay put while the text scrolls under it.
 *
 * jsdom paints nothing, so this holds the STRUCTURE that carries the fix: where the
 * strip sits in the DOM (paint order and the `peer` link both hang on it), the classes
 * that give it the field's surface in every state, the cases that must not change, and
 * the scrollbar measurement with the layout numbers stubbed. The pixels were checked in
 * Chromium, light and dark, 390px and 1280px, LTR and RTL.
 */

const strip = (root: ParentNode = document) => root.querySelector<HTMLElement>("[data-slot='label-strip']");
const classes = (el: Element) => (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);

describe("Textarea label strip (Kurvenschmiede, 0.24)", () => {
  it("sits between the textarea and its label: the textarea's peer, painted under the label", () => {
    render(<Textarea label="Paste a table" defaultValue={"a;b\n1;2"} />);
    const field = screen.getByRole("textbox", { name: "Paste a table" });
    const layer = strip();
    expect(layer).not.toBeNull();
    // A LATER sibling of the textarea: `peer-*` compiles to `.peer ~ *`, and a
    // positioned box after the textarea paints over its text.
    expect(field.nextElementSibling).toBe(layer);
    // …and an EARLIER sibling of the label, which therefore paints over the strip.
    const label = document.querySelector(`label[for="${field.id}"]`);
    expect(label).not.toBeNull();
    expect(layer!.nextElementSibling).toBe(label);
    // Decoration: nothing to announce, nothing to click (a click falls through to the field).
    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer!.textContent).toBe("");
    expect(classes(layer!)).toContain("pointer-events-none");
  });

  it("covers exactly the top padding, inside the border and the rounded corners", () => {
    render(<Textarea label="Notes" defaultValue="x" />);
    const field = screen.getByRole("textbox", { name: "Notes" });
    const c = classes(strip()!);
    // The strip IS the textarea's top padding (FIELD_FLOATING_PAD's pt-4): same token,
    // so at rest it covers padding and never a pixel of an unscrolled line.
    expect(classes(field)).toContain("pt-4");
    expect(c).toContain("h-4");
    // Inside the 1px border on three sides, so the border and the focus / invalid
    // ring are never painted over.
    expect(c).toEqual(expect.arrayContaining(["absolute", "top-px", "inset-x-px"]));
    // The field's radius less its border, so the rounded corner is not cut into.
    expect(classes(field)).toContain("rounded-md");
    expect(c).toContain("rounded-t-[5px]");
  });

  it("wears the field's own surface in every state the field paints one", () => {
    render(<Textarea label="Notes" defaultValue="x" />);
    const field = screen.getByRole("textbox", { name: "Notes" });
    const c = classes(strip()!);
    // Read off the textarea rather than restated: each background FIELD_BASE gives
    // the field (plain, disabled, [readonly]) must have its peer twin on the strip,
    // so a change to the field's surface cannot leave the strip on the old one.
    const surfaces = classes(field).filter((k) => /^(?:[^:]+:)?bg-/.test(k));
    expect(surfaces).toEqual(
      expect.arrayContaining([
        "bg-[var(--bg-surface)]",
        "disabled:bg-[var(--bg-surface-2)]",
        "[&[readonly]]:bg-[var(--bg-surface-2)]",
      ]),
    );
    const twin = (k: string) =>
      k.startsWith("disabled:")
        ? `peer-disabled:${k.slice("disabled:".length)}`
        : k.startsWith("[&[readonly]]:")
          ? `peer-[[readonly]]:${k.slice("[&[readonly]]:".length)}`
          : k;
    for (const k of surfaces) expect(c).toContain(twin(k));
  });

  it("shows only once the label has floated — an empty, unfocused field is as before", () => {
    render(<Textarea label="Notes" />);
    const c = classes(strip()!);
    // `hidden` by default; shown on exactly the two conditions that float the label.
    expect(c).toContain("hidden");
    expect(c).toEqual(expect.arrayContaining(["peer-focus:block", "peer-[:not(:placeholder-shown)]:block"]));
    // The float trick still has its single-space placeholder to key off.
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveAttribute("placeholder", " ");
  });

  it("keeps the hint '?' on the label line, painted over the strip", () => {
    render(<Textarea label="Paste a table" hint={<FieldHint label="Semicolon or tab separated." />} defaultValue="x" />);
    const field = screen.getByRole("textbox", { name: "Paste a table" });
    const hint = screen.getByRole("button", { name: "Semicolon or tab separated." });
    expect(field.nextElementSibling).toBe(strip());
    // The row that carries label and "?" comes after the strip.
    expect(strip()!.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("leaves an unlabelled Textarea, and every labelled Input and Select, without one", () => {
    render(
      <>
        <Textarea aria-label="Plain" defaultValue="x" />
        <Textarea aria-label="Plain with hint" hint={<FieldHint label="Why" />} defaultValue="x" />
        <Input label="Name" defaultValue="x" />
        <Select label="Kind" defaultValue="a">
          <option value="a">A</option>
        </Select>
      </>,
    );
    expect(strip()).toBeNull();
    // The unlabelled field still gets the caller's class on the textarea itself.
    expect(screen.getByRole("textbox", { name: "Plain" })).not.toHaveClass("pt-4");
  });

  it("keeps showCount, rows and the caller's class where they were", () => {
    render(
      <Textarea label="Notes" rows={7} maxLength={80} showCount className="font-mono" defaultValue="abc" />,
    );
    const field = screen.getByRole("textbox", { name: "Notes" });
    expect(field).toHaveAttribute("rows", "7");
    // className on the wrapper (as before), which is the strip's containing block.
    expect(strip()!.parentElement).toHaveClass("relative", "font-mono");
    expect(screen.getByText("3/80")).toBeInTheDocument();
  });
});

describe("Textarea label strip — clearing a classic scrollbar", () => {
  type Metrics = { offsetWidth: number; clientWidth: number; clientLeft: number };
  const STUBBED = ["offsetWidth", "clientWidth", "clientLeft"] as const;
  let metrics: Metrics = { offsetWidth: 0, clientWidth: 0, clientLeft: 0 };
  const observers: Array<{ cb: ResizeObserverCallback; disconnect: ReturnType<typeof vi.fn> }> = [];

  /** jsdom lays nothing out: every width is 0. Stub the three the strip reads. */
  const stubLayout = (m: Metrics) => {
    metrics = m;
    // Own properties on the textarea prototype, shadowing the inherited ones; deleting
    // them in afterEach puts jsdom's back.
    for (const key of STUBBED) {
      Object.defineProperty(HTMLTextAreaElement.prototype, key, { configurable: true, get: () => metrics[key] });
    }
  };
  const stubObserver = () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        cb: ResizeObserverCallback;
        disconnect = vi.fn();
        constructor(cb: ResizeObserverCallback) {
          this.cb = cb;
          observers.push(this);
        }
        observe() {}
        unobserve() {}
      },
    );
  };

  afterEach(() => {
    for (const key of STUBBED) delete (HTMLTextAreaElement.prototype as unknown as Record<string, unknown>)[key];
    observers.length = 0;
    vi.unstubAllGlobals();
  });

  // The border is FIELD_BASE's 1px; jsdom has no stylesheet, so it rides inline here
  // (with a style: a border whose style is `none` computes to a width of 0).
  const border = { borderStyle: "solid", borderWidth: "1px" } as const;

  it("ends the strip where a 15px scrollbar at the inline end begins, and squares that corner", () => {
    stubLayout({ offsetWidth: 324, clientWidth: 307, clientLeft: 1 });
    render(<Textarea label="Notes" defaultValue="x" style={border} />);
    const s = strip()!.style;
    expect(s.insetInlineEnd).toBe("16px");
    expect(s.insetInlineStart).toBe("");
    expect(s.borderStartEndRadius).toBe("0px");
    expect(s.borderStartStartRadius).toBe("");
  });

  it("finds the scrollbar on the left of a right-to-left field — its inline end", () => {
    stubLayout({ offsetWidth: 324, clientWidth: 307, clientLeft: 16 });
    render(<Textarea label="Notes" defaultValue="x" style={{ ...border, direction: "rtl" }} />);
    const s = strip()!.style;
    expect(s.insetInlineEnd).toBe("16px");
    expect(s.insetInlineStart).toBe("");
    expect(s.borderStartEndRadius).toBe("0px");
  });

  it("spans the field when there is no gutter (no overflow, or overlay scrollbars)", () => {
    // 324 - 321 - 2 = 1: whole-pixel rounding, not a scrollbar — none is that thin.
    stubLayout({ offsetWidth: 324, clientWidth: 321, clientLeft: 1 });
    render(<Textarea label="Notes" defaultValue="x" style={border} />);
    const s = strip()!.style;
    expect(s.insetInlineEnd).toBe("");
    expect(s.insetInlineStart).toBe("");
    expect(s.borderStartEndRadius).toBe("");
  });

  it("keeps the CSS insets while the field is not laid out", () => {
    stubLayout({ offsetWidth: 0, clientWidth: 0, clientLeft: 0 });
    render(<Textarea label="Notes" defaultValue="x" />);
    expect(strip()!.getAttribute("style")).toBeNull();
  });

  it("re-measures when the textarea resizes — the scrollbar coming or going — and lets go on unmount", () => {
    stubObserver();
    stubLayout({ offsetWidth: 324, clientWidth: 322, clientLeft: 1 });
    const { unmount } = render(<Textarea label="Notes" defaultValue="x" style={border} />);
    expect(strip()!.style.insetInlineEnd).toBe("");
    expect(observers).toHaveLength(1);
    // A long paste: the scrollbar appears and takes 15px from the content box.
    metrics = { offsetWidth: 324, clientWidth: 307, clientLeft: 1 };
    observers[0].cb([], observers[0] as unknown as ResizeObserver);
    expect(strip()!.style.insetInlineEnd).toBe("16px");
    // Cleared again: back to the full width.
    metrics = { offsetWidth: 324, clientWidth: 322, clientLeft: 1 };
    observers[0].cb([], observers[0] as unknown as ResizeObserver);
    expect(strip()!.style.insetInlineEnd).toBe("");
    unmount();
    expect(observers[0].disconnect).toHaveBeenCalled();
  });
});
