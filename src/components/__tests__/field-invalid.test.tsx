import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { AmountInput } from "../amount-input";
import { Combobox, InlineEntityCombobox } from "../combobox";
import { CurrencySelect } from "../currency-select";
import { DatePicker } from "../date-picker";
import { EntityCombobox } from "../entity-combobox";
import { MultiEntityCombobox } from "../multi-entity-combobox";
import { MultiSelect } from "../multi-select";
import { NumberInput } from "../number-input";
import { FIELD_INVALID, Input, Select, Textarea } from "../ui";

/**
 * One `invalid`, on every control that is shaped like a field.
 *
 * ## What this is for
 *
 * {@link FIELD_INVALID} — the rose border and the ring that survives display
 * scaling — was added for feedback #235 and reached exactly two controls: the native
 * `Select`, which had it, and Keksdose's `AccountCombobox`, which got it by
 * TRANSCRIBING the class string into `[&_input]:…` variants on a wrapper, with a
 * test holding the copy to the original token by token, because the combobox
 * underneath had no `invalid` of its own.
 *
 * It had none because nine of this package's twelve field controls had none.
 * `Input` included — which is how three Keksdose privacy dialogs came to write
 * `aria-invalid` by hand on a passphrase-confirmation field and paint NOTHING: the
 * attribute spreads onto the element, no rule in this package or either consumer's
 * stylesheet selects on it, so on the one screen in that app where a silent typo
 * costs the data, "these do not match" was legible to a screen reader and invisible
 * to everybody else.
 *
 * So the contract is both halves at once, asserted here for every control: the flag
 * PAINTS and it ANNOUNCES. Setting one without the other is the bug this replaced,
 * in either direction.
 *
 * ## The sweep at the bottom
 *
 * A per-control list is only as good as whoever remembers to add to it. The last
 * case reads the directory instead: any module exporting something that renders
 * `FIELD_BASE` or `FIELD_TRIGGER` is a field, and a field has to take `invalid`.
 * A thirteenth control written next year fails there, on its own commit.
 */

/** Every control, with the props it needs to render at all. */
const CONTROLS: { name: string; render: (invalid: boolean) => ReactElement }[] = [
  { name: "Input", render: (invalid) => <Input label="F" value="" onChange={vi.fn()} invalid={invalid} /> },
  {
    name: "Input (unlabelled)",
    render: (invalid) => <Input aria-label="F" value="" onChange={vi.fn()} invalid={invalid} />,
  },
  {
    name: "Textarea",
    render: (invalid) => <Textarea label="F" value="" onChange={vi.fn()} invalid={invalid} />,
  },
  {
    name: "Select",
    render: (invalid) => (
      <Select label="F" value="" onChange={vi.fn()} invalid={invalid}>
        <option value="">—</option>
      </Select>
    ),
  },
  {
    name: "NumberInput",
    render: (invalid) => <NumberInput label="F" value="" onChange={vi.fn()} invalid={invalid} />,
  },
  {
    name: "AmountInput",
    render: (invalid) => <AmountInput label="F" value="" onChange={vi.fn()} invalid={invalid} />,
  },
  {
    name: "Combobox",
    render: (invalid) => (
      <Combobox label="F" value="" onChange={vi.fn()} options={["a"]} invalid={invalid} />
    ),
  },
  {
    name: "InlineEntityCombobox",
    render: (invalid) => (
      <InlineEntityCombobox<string>
        label="F"
        value={null}
        onChange={vi.fn()}
        options={[{ value: "a", label: "A" }]}
        invalid={invalid}
      />
    ),
  },
  {
    name: "EntityCombobox",
    render: (invalid) => (
      <EntityCombobox<string>
        label="F"
        value={null}
        onChange={vi.fn()}
        options={[{ value: "a", label: "A" }]}
        invalid={invalid}
      />
    ),
  },
  {
    name: "MultiEntityCombobox",
    render: (invalid) => (
      <MultiEntityCombobox<string>
        label="F"
        value={[]}
        onChange={vi.fn()}
        options={[{ value: "a", label: "A" }]}
        invalid={invalid}
      />
    ),
  },
  {
    name: "MultiSelect",
    render: (invalid) => (
      <MultiSelect
        label="F"
        values={[]}
        onChange={vi.fn()}
        options={[{ value: "a", label: "A" }]}
        invalid={invalid}
      />
    ),
  },
  {
    name: "CurrencySelect",
    render: (invalid) => <CurrencySelect label="F" value="EUR" onChange={vi.fn()} invalid={invalid} />,
  },
  {
    name: "DatePicker",
    render: (invalid) => (
      <DatePicker label="F" value="" onChange={vi.fn()} locale="en" invalid={invalid} />
    ),
  },
];

/** The element carrying the field look — an `<input>`/`<select>`/`<textarea>`, or
 *  the `<button>` the trigger-shaped controls use instead. */
function fieldElement(container: HTMLElement): HTMLElement {
  const el = container.querySelector("input, select, textarea, button[aria-invalid], button");
  if (!el) throw new Error("no field element rendered");
  return el as HTMLElement;
}

describe("the required-and-empty highlight, on every field control", () => {
  for (const { name, render: renderControl } of CONTROLS) {
    it(`${name} paints and announces it together`, () => {
      const { container, rerender } = render(renderControl(false));
      const before = fieldElement(container);
      expect(before.className).not.toContain("border-rose");
      expect(before.getAttribute("aria-invalid")).toBeNull();

      rerender(renderControl(true));
      const after = fieldElement(container);
      // Against FIELD_INVALID itself, not a spelling of it: there is one definition
      // now, so a test can name it rather than transcribe it.
      for (const token of FIELD_INVALID.split(/\s+/)) {
        expect(after.className).toContain(token);
      }
      expect(after.getAttribute("aria-invalid")).toBe("true");
    });
  }

  /**
   * Every component module's SOURCE, keyed by path. `import.meta.glob` rather than
   * `readFileSync`: this package has no `@types/node` on purpose (it ships browser
   * code), so the filesystem guards the consumer app writes cannot be spelled that
   * way here. Vite inlines these at build time, so the sweep costs nothing at run.
   */
  const SOURCES = import.meta.glob<string>("../*.tsx", {
    query: "?raw",
    import: "default",
    eager: true,
  });

  /** A module that paints the field look is a field, whatever it is called. */
  const isField = (src: string) => /\bFIELD_BASE\b|\bFIELD_TRIGGER\b/.test(src);

  it("would notice a control that forgot the prop", () => {
    // The list above is hand-written, so it can go stale. This reads the directory
    // instead: a module that renders the field look takes `invalid`. Excluded by
    // name rather than by cleverness, and the one exclusion has a reason.
    const EXEMPT = [
      // A field-styled SHELL for a filter box: it narrows a list that is already on
      // screen, it cannot be left unanswered, and nothing submits it. There is no
      // state for "invalid" to describe.
      "search-field.tsx",
    ];
    const offenders = Object.entries(SOURCES)
      .filter(([path]) => !EXEMPT.some((name) => path.endsWith(name)))
      .filter(([, src]) => isField(src) && !/\binvalid\b/.test(src))
      .map(([path]) => path.split("/").pop());
    expect(offenders).toEqual([]);
  });

  it("is not vacuous: the sweep can actually see the field look", () => {
    // If the constants were renamed, the scan above would match nothing and pass
    // while every control had quietly lost the highlight.
    const fields = Object.values(SOURCES).filter(isField);
    expect(fields.length).toBeGreaterThan(6);
  });
});

describe("an unset invalid leaves the attribute off entirely", () => {
  it("does not write aria-invalid=\"false\"", () => {
    // `aria-invalid="false"` is a claim ("checked, and fine") where absence is
    // silence. Every control above writes `invalid || undefined` for that reason;
    // this pins it on the one a form has most of.
    render(<Input label="Memo" value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Memo").hasAttribute("aria-invalid")).toBe(false);
  });
});
