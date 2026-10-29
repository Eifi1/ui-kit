import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserRouter, Route, Routes, useSearchParams } from "react-router";
import { PickerSheet } from "../picker-sheet";
import { MultiSelect } from "../multi-select";
import { MultiEntityCombobox } from "../multi-entity-combobox";
import { EntityCombobox } from "../entity-combobox";
import { InlineEntityCombobox } from "../inline-entity-combobox";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { stubPhone } from "../../test/viewport";

/**
 * Round 0.40 (UO): the picker sheet's shared sticky "Done" (Marcel, keksdose #412; kk run
 * 79 gap 2), sticky group headings that are not searched (kk run 79 gap 3), and the
 * pickers' history entry keeping the address the page rewrote while they were open
 * (keksdose live #412).
 */

afterEach(() => vi.unstubAllGlobals());

const LETTERS = [
  { value: "a1", label: "Aldi", group: "A" },
  { value: "a2", label: "Apotheke", group: "A" },
  { value: "b1", label: "Bäckerei", group: "B" },
  { value: "c1", label: "Coop", group: "C" },
  { value: "m1", label: "Migros Bank", group: "M" },
];

describe("PickerSheet footer and Done", () => {
  it("pins the footer under the scrolling list, outside it", () => {
    render(
      <PickerSheet
        open
        onClose={() => {}}
        title="Payees"
        query=""
        onQueryChange={() => {}}
        footer={<span>3 picked</span>}
      >
        <ul>
          <li>row</li>
        </ul>
      </PickerSheet>,
    );
    const footer = document.querySelector("[data-picker-sheet-footer]") as HTMLElement;
    expect(footer).toHaveTextContent("3 picked");
    expect(footer.closest(".overflow-y-auto")).toBeNull();
    // No Done unless asked for.
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
  });

  it("renders no footer at all by default", () => {
    render(
      <PickerSheet open onClose={() => {}} title="Payees" query="" onQueryChange={() => {}}>
        <ul />
      </PickerSheet>,
    );
    expect(document.querySelector("[data-picker-sheet-footer]")).toBeNull();
  });

  it("`done` closes the sheet, in the provider's words", () => {
    const onClose = vi.fn();
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <PickerSheet open done onClose={onClose} title="Zahlungsempfänger" query="" onQueryChange={() => {}}>
          <ul />
        </PickerSheet>
      </UiKitProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Fertig" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("takes `doneLabel` over the provider's", () => {
    render(
      <PickerSheet open done doneLabel="Apply" onClose={() => {}} query="" onQueryChange={() => {}}>
        <ul />
      </PickerSheet>,
    );
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
  });
});

describe("the multi pickers' sheets carry the Done; single pickers do not", () => {
  it("MultiSelect: ticks stay open, Done closes", () => {
    stubPhone({ coarse: true, reducedMotion: true });
    function Host() {
      const [value, setValue] = useState<string[]>([]);
      return <MultiSelect label="Payees" options={LETTERS} value={value} onChange={setValue} />;
    }
    render(<Host />);
    fireEvent.click(screen.getByRole("combobox", { name: /Payees/ }));
    const sheet = screen.getByRole("dialog");
    // The panel's rows commit on mousedown.
    fireEvent.mouseDown(within(sheet).getByRole("option", { name: /Aldi/ }));
    fireEvent.mouseDown(within(sheet).getByRole("option", { name: /Coop/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(within(sheet).getAllByRole("option", { selected: true })).toHaveLength(2);
    fireEvent.click(within(sheet).getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("combobox", { name: /Payees/ })).toHaveAttribute("aria-label", "Payees: 2");
  });

  it("MultiEntityCombobox: the same Done", () => {
    stubPhone({ coarse: true, reducedMotion: true });
    render(<MultiEntityCombobox<string> label="Tags" value={[]} onChange={() => {}} options={LETTERS} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Tags/ }));
    const sheet = screen.getByRole("dialog");
    fireEvent.click(within(sheet).getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("EntityCombobox (single): no Done — the pick closes the sheet", () => {
    stubPhone({ coarse: true, reducedMotion: true });
    render(<EntityCombobox<string> label="Payee" value={null} onChange={() => {}} options={LETTERS} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Payee/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
    expect(document.querySelector("[data-picker-sheet-footer]")).toBeNull();
  });
});

describe("group headings", () => {
  const headingOf = (text: string) =>
    Array.from(document.querySelectorAll('li[role="presentation"]')).find((li) => li.textContent === text) as
      HTMLElement | undefined;

  it("stick to the top of the sheet's list while it scrolls", () => {
    stubPhone({ coarse: true, reducedMotion: true });
    render(<MultiEntityCombobox<string> label="Payees" options={LETTERS} value={[]} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Payees/ }));
    const a = headingOf("A");
    expect(a).toBeDefined();
    expect(a).toHaveClass("sticky", "top-0", "bg-surface");
  });

  it("stick in the desktop panel too", () => {
    render(<EntityCombobox<string> label="Payee" value={null} onChange={() => {}} options={LETTERS} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Payee/ }));
    expect(headingOf("B")).toHaveClass("sticky", "top-0");
  });

  it("a typed letter does not match its whole group (panel pickers)", () => {
    render(<EntityCombobox<string> label="Payee" value={null} onChange={() => {}} options={LETTERS} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Payee/ }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "m" } });
    const names = screen.getAllByRole("option").map((o) => o.textContent);
    // Only "Migros Bank", which has an "m" in its name — not the rest of group M.
    expect(names).toEqual(["Migros Bank"]);
  });

  it("a typed letter does not match its whole group (InlineEntityCombobox)", () => {
    render(<InlineEntityCombobox<string> label="Payee" value={null} onChange={() => {}} options={LETTERS} />);
    const field = screen.getByRole("combobox");
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "c" } });
    // "Coop" by its label and "Bäckerei" by its "c" — not the whole of group C, and
    // nothing because its group is named "C".
    const names = screen.getAllByRole("option").map((o) => o.textContent);
    expect(names).toEqual(["Coop", "Bäckerei"]);
    expect(headingOf("C")).toHaveClass("sticky");
  });
});

/** jsdom fires popstate in a task: drain the queue. */
async function settle() {
  await act(async () => {
    for (let turn = 0; turn < 10; turn += 1) await new Promise((r) => setTimeout(r, 0));
  });
}

describe("a picker keeps the address its page rewrote while it was open (#412)", () => {
  function Report() {
    const [params, setParams] = useSearchParams();
    const value = params.getAll("payee");
    return (
      <div>
        <p data-testid="ticks">{value.join(",") || "none"}</p>
        <MultiSelect
          label="Payees"
          options={LETTERS}
          value={value}
          onChange={(next) => {
            const p = new URLSearchParams(params);
            p.delete("payee");
            for (const v of next) p.append("payee", String(v));
            setParams(p, { replace: true });
          }}
        />
      </div>
    );
  }

  function renderReport() {
    window.history.replaceState(null, "", "/before");
    window.history.pushState(null, "", "/report");
    return render(
      <BrowserRouter>
        <Routes>
          <Route path="/report" element={<Report />} />
        </Routes>
      </BrowserRouter>,
    );
  }

  function press(el: HTMLElement) {
    fireEvent.pointerDown(el);
    fireEvent.mouseDown(el);
    fireEvent.click(el);
  }

  it("the phone sheet, closed by Done", async () => {
    stubPhone({ coarse: true, reducedMotion: true });
    const view = renderReport();
    await settle();
    press(screen.getByRole("combobox", { name: /Payees/ }));
    await settle();
    press(screen.getByRole("option", { name: /Aldi/ }));
    press(screen.getByRole("option", { name: /Coop/ }));
    await settle();
    press(screen.getByRole("button", { name: "Done" }));
    await settle();
    await settle();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(new URLSearchParams(window.location.search).getAll("payee")).toEqual(["a1", "c1"]);
    expect(screen.getByTestId("ticks")).toHaveTextContent("a1,c1");
    view.unmount();
    await settle();
  });

  it("the desktop panel, closed by Escape", async () => {
    const view = renderReport();
    await settle();
    press(screen.getByRole("combobox", { name: /Payees/ }));
    await settle();
    press(screen.getByRole("option", { name: /Bäckerei/ }));
    await settle();
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    await settle();
    await settle();
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(new URLSearchParams(window.location.search).getAll("payee")).toEqual(["b1"]);
    expect(screen.getByTestId("ticks")).toHaveTextContent("b1");
    view.unmount();
    await settle();
  });
});
