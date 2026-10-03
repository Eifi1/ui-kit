import { createRef, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { Combobox, InlineEntityCombobox } from "../combobox";
import { EntityCombobox } from "../entity-combobox";
import { MultiEntityCombobox } from "../multi-entity-combobox";
import { Autocomplete } from "../autocomplete";
import { FieldHint } from "../ui";

/**
 * The Combobox family in 0.24:
 *
 *   - kastlan: every member takes a `ref` to its FOCUSABLE control — the <input> on the
 *     typed ones, the trigger <button> on the panel pickers — so react-hook-form's
 *     focus-on-error has something to focus (the inline picker had none, so its
 *     `RhfField` render could not be focused by a failed submit);
 *   - the later list: Autocomplete keeps its <input> when a "?" hint on an unlabelled
 *     field comes and goes (the 0.22 rule the siblings got in 0.23);
 *   - `sheetTitle`, the phone sheet's heading for a field whose label is a form's.
 */

const OPTIONS = [
  { value: "a1", label: "Example Ltd" },
  { value: "a2", label: "Sample Cash" },
];

const noop = vi.fn();

// ── refs ─────────────────────────────────────────────────────────────────────

type Focusable = HTMLInputElement | HTMLButtonElement;

const REFS: Array<[string, "INPUT" | "BUTTON", (ref: ReturnType<typeof createRef<Focusable>>) => ReactElement]> = [
  ["Combobox", "INPUT", (ref) => <Combobox ref={ref as never} label="Payee" value="" onChange={noop} options={["A"]} />],
  [
    "InlineEntityCombobox",
    "INPUT",
    (ref) => <InlineEntityCombobox<string> ref={ref as never} label="Account" value="a1" onChange={noop} options={OPTIONS} />,
  ],
  [
    "EntityCombobox",
    "BUTTON",
    (ref) => <EntityCombobox<string> ref={ref as never} label="Account" value="a1" onChange={noop} options={OPTIONS} />,
  ],
  [
    "MultiEntityCombobox",
    "BUTTON",
    (ref) => <MultiEntityCombobox<string> ref={ref as never} label="Accounts" value={["a1"]} onChange={noop} options={OPTIONS} />,
  ],
  ["Autocomplete", "INPUT", (ref) => <Autocomplete ref={ref as never} label="Address" value="" onChange={noop} options={[]} />],
];

describe.each(REFS)("%s: ref", (_name, tag, field) => {
  it("reaches the focusable control — the combobox itself, not the wrapper", () => {
    const ref = createRef<Focusable>();
    render(field(ref));
    const control = screen.getByRole("combobox");
    expect(ref.current).toBe(control);
    expect(ref.current?.tagName).toBe(tag);
    act(() => ref.current!.focus());
    expect(control).toHaveFocus();
  });

  it("takes a callback ref too, and lets go on unmount", () => {
    const calls: Array<Element | null> = [];
    const { unmount } = render(field(((el: Focusable | null) => void calls.push(el)) as never));
    expect(calls[0]).toBe(screen.getByRole("combobox"));
    unmount();
    expect(calls.at(-1)).toBeNull();
  });
});

describe("the panel pickers: the caller's ref and the core's are the same trigger", () => {
  it("EntityCombobox still anchors its panel and hands focus back to the trigger after a pick", () => {
    const ref = createRef<HTMLButtonElement>();
    const onChange = vi.fn();
    render(<EntityCombobox<string> ref={ref} label="Account" value={null} onChange={onChange} options={OPTIONS} />);
    fireEvent.click(ref.current!);
    // The panel's rows commit on mousedown (see PickerSheet's note on dev#477).
    fireEvent.mouseDown(within(screen.getByRole("listbox")).getByRole("option", { name: "Sample Cash" }));
    expect(onChange).toHaveBeenCalledWith("a2");
    expect(ref.current).toHaveFocus();
  });

  it("MultiEntityCombobox: Escape closes the panel back onto the trigger", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<MultiEntityCombobox<string> ref={ref} label="Accounts" value={[]} onChange={noop} options={OPTIONS} />);
    fireEvent.click(ref.current!);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(ref.current).toHaveFocus();
  });
});

// ── Autocomplete: a hint coming and going keeps the <input> ─────────────────

/**
 * The 0.22 rule, which the rest of the family got in 0.23 (combobox-family-023): passed
 * at all, even as `undefined`, a hint keeps the field's box. On an UNLABELLED field the
 * "?" sits in an end-hint row of its own, which used to exist only while the "?" did —
 * so the <input> was re-parented, remounted, and lost focus and caret.
 */
const HINTED: Array<[string, (hint: ReactElement | string | undefined) => ReactElement]> = [
  ["labelled", (hint) => <Autocomplete label="Address" value="Example Street" onChange={noop} hint={hint} />],
  ["unlabelled", (hint) => <Autocomplete aria-label="Address" value="Example Street" onChange={noop} hint={hint} />],
  ["unlabelled, small", (hint) => <Autocomplete aria-label="Search" size="sm" value="" onChange={noop} hint={hint} />],
];

describe.each(HINTED)("Autocomplete, %s: a hint coming and going keeps the control", (_name, field) => {
  afterEach(() => {
    (document.activeElement as HTMLElement | null)?.blur();
  });

  it.each([
    ["a caption", "Shown under the field"],
    ["a FieldHint", <FieldHint key="h" label="Why this field" />],
  ] as const)("with %s", (_kind, hint) => {
    const { rerender } = render(field(undefined));
    const control = screen.getByRole("combobox");
    act(() => control.focus());
    expect(control).toHaveFocus();
    rerender(field(hint));
    expect(control.isConnected).toBe(true);
    expect(control).toHaveFocus();
    rerender(field(undefined));
    expect(control.isConnected).toBe(true);
    expect(control).toHaveFocus();
  });
});

describe("Autocomplete: the end-hint row", () => {
  it("unlabelled with a FieldHint: the '?' sits beside the field, outside the box", () => {
    render(<Autocomplete aria-label="Address" value="" onChange={noop} hint={<FieldHint label="Why this field" />} />);
    const input = screen.getByRole("combobox", { name: "Address" });
    const hint = screen.getByRole("button", { name: "Why this field" });
    // Not inside the field's own box…
    expect(input.parentElement).not.toContainElement(hint);
    // …but in the same row as it.
    expect(input.parentElement!.parentElement!.parentElement).toContainElement(hint);
  });

  it("never passed a hint: no row at all, exactly as before", () => {
    const { container } = render(<Autocomplete aria-label="Address" value="" onChange={noop} />);
    const input = screen.getByRole("combobox", { name: "Address" });
    // wrapper > field box > input: nothing between the wrapper and the field box.
    expect(input.parentElement!.parentElement).toBe(container.firstElementChild);
  });

  it("passed as undefined: the row is kept, its slot empty and its gap closed", () => {
    const { container } = render(<Autocomplete aria-label="Address" value="" onChange={noop} hint={undefined} />);
    const input = screen.getByRole("combobox", { name: "Address" });
    const row = input.parentElement!.parentElement!.parentElement!;
    expect(row.parentElement).toBe(container.firstElementChild);
    expect(row).toHaveClass("gap-0");
  });
});

// ── sheetTitle ───────────────────────────────────────────────────────────────

describe("sheetTitle: the phone sheet's heading for a field labelled by a form", () => {
  let original: typeof window.matchMedia;
  const asPhone = () => {
    original = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  };
  afterEach(() => {
    if (original) window.matchMedia = original;
  });

  it.each([
    [
      "InlineEntityCombobox",
      (title?: string) => (
        <InlineEntityCombobox<string> aria-label="Account" sheetTitle={title} value={null} onChange={noop} options={OPTIONS} />
      ),
    ],
    [
      "Combobox",
      (title?: string) => <Combobox aria-label="Account" sheetTitle={title} value="" onChange={noop} options={["A"]} />,
    ],
    [
      "EntityCombobox",
      (title?: string) => (
        <EntityCombobox<string> aria-label="Account" sheetTitle={title} value={null} onChange={noop} options={OPTIONS} />
      ),
    ],
  ])("%s titles and names the sheet with it", (_name, field) => {
    asPhone();
    render(field("Booking account"));
    const control = screen.getByRole("combobox", { name: "Account" });
    act(() => {
      control.focus();
      fireEvent.click(control);
    });
    const sheet = screen.getByRole("dialog", { name: "Booking account" });
    expect(sheet).toHaveTextContent("Booking account");
  });

  it("left out, the label still titles it", () => {
    asPhone();
    render(<InlineEntityCombobox<string> label="Account" value={null} onChange={noop} options={OPTIONS} />);
    act(() => screen.getByRole("combobox", { name: "Account" }).focus());
    expect(screen.getByRole("dialog", { name: "Account" })).toBeInTheDocument();
  });
});
