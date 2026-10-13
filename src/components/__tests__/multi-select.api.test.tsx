import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MultiSelect, type MultiSelectOption } from "../multi-select";
import { WriteLockProvider } from "../write-lock";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * API-4 (refactor audit 2026-10, round 0.34): MultiSelect broke the select family's rules four ways —
 * `values` where every other field has `value`; `(string | number)[]` in and out, so all
 * five production call sites cast (keksdose `next.map(String)`, `as string[]`;
 * Kurvenschmiede `as number[]` ×3); per-string chrome props where the kit takes `labels`;
 * and no `disabledReason` / `commit`. Now generic over the option value, with `value`,
 * `labels` and the lock; `values` and the four string props were deprecated in 0.34 and
 * removed in 0.35 (round 0.35 R1).
 */

describe("MultiSelect is generic over its option value", () => {
  it("hands number options back as numbers, no cast at the call site", () => {
    const seen: number[][] = [];
    function Host() {
      const [picked, setPicked] = useState<number[]>([]);
      return (
        <MultiSelect
          label="Sets"
          options={[
            { value: 1, label: "One" },
            { value: 2, label: "Two" },
          ]}
          value={picked}
          onChange={(next) => {
            // `next` is number[] here: pushing it into a number[][] is the type test.
            seen.push(next);
            setPicked(next);
          }}
        />
      );
    }
    render(<Host />);
    fireEvent.click(screen.getByRole("combobox", { name: /Sets/ }));
    fireEvent.mouseDown(screen.getByRole("option", { name: /Two/ }));
    expect(seen).toEqual([[2]]);
  });

  it("and string options as strings", () => {
    const options: MultiSelectOption<string>[] = [
      { value: "acc-1", label: "Checking" },
      { value: "acc-2", label: "Savings" },
    ];
    const update = (ids: string[]) => ids;
    const onChange = vi.fn((next: string[]) => update(next));
    render(<MultiSelect label="Accounts" options={options} value={["acc-1"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Accounts/ }));
    fireEvent.mouseDown(screen.getByRole("option", { name: /Savings/ }));
    expect(onChange).toHaveBeenCalledWith(["acc-1", "acc-2"]);
  });

  it("still takes an untyped option list, as (string | number)[]", () => {
    const loose: MultiSelectOption[] = [
      { value: 1, label: "One" },
      { value: "two", label: "Two" },
    ];
    const onChange = vi.fn((next: (string | number)[]) => next);
    render(<MultiSelect label="Mixed" options={loose} value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Mixed/ }));
    fireEvent.mouseDown(screen.getByRole("option", { name: /Two/ }));
    expect(onChange).toHaveBeenCalledWith(["two"]);
  });
});

describe("MultiSelect: value and labels, the family's names", () => {
  it("reads `value`", () => {
    render(
      <MultiSelect label="Tags" options={[{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }]} value={["a"]} onChange={vi.fn()} />,
    );
    expect(screen.getByRole("combobox", { name: "Tags: 1" })).toBeInTheDocument();
  });

  it("takes `labels` over the provider's multiSelect namespace", () => {
    render(
      <UiKitProvider labels={{ multiSelect: { selectAll: "Alle", clear: "Leeren" } }}>
        <MultiSelect
          label="Sets"
          options={[{ value: 1, label: "One" }]}
          value={[]}
          onChange={vi.fn()}
          labels={{ search: "Find sets", all: "None picked", clear: "Select none" }}
        />
      </UiKitProvider>,
    );
    expect(screen.getByRole("combobox", { name: "Sets: None picked" })).toHaveTextContent("None picked");
    fireEvent.click(screen.getByRole("combobox", { name: /Sets/ }));
    expect(screen.getByRole("textbox", { name: "Find sets" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select none" })).toBeInTheDocument();
  });

  it("takes no other names: `values` and the four string props went in 0.35 (round 0.35 R1)", () => {
    const noop = vi.fn();
    // Compile-time: `tsc --noEmit` fails if a directive below goes unused.
    const gone = [
      // @ts-expect-error — `values` is gone: pass `value`.
      <MultiSelect key="1" options={[]} values={[]} onChange={noop} />,
      // @ts-expect-error — `allLabel` is gone: pass `labels.all`.
      <MultiSelect key="2" options={[]} onChange={noop} allLabel="All" />,
      // @ts-expect-error — `searchLabel` is gone: pass `labels.search`.
      <MultiSelect key="3" options={[]} onChange={noop} searchLabel="Search" />,
      // @ts-expect-error — `selectAllLabel` is gone: pass `labels.selectAll`.
      <MultiSelect key="4" options={[]} onChange={noop} selectAllLabel="All" />,
      // @ts-expect-error — `clearLabel` is gone: pass `labels.clear`.
      <MultiSelect key="5" options={[]} onChange={noop} clearLabel="None" />,
    ];
    expect(gone).toHaveLength(5);
  });
});

describe("MultiSelect locks like the rest of the select family", () => {
  const OPTIONS = [{ value: "a", label: "Alpha" }];

  it("disabledReason: focusable, aria-disabled, no list, the reason on the trigger", () => {
    const onChange = vi.fn();
    render(
      <MultiSelect label="Tags" options={OPTIONS} value={[]} onChange={onChange} disabledReason="Archived budgets are read-only." />,
    );
    const trigger = screen.getByRole("combobox", { name: /Tags/ });
    expect(trigger).not.toBeDisabled();
    expect(trigger).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(trigger);
    expect(screen.queryByRole("listbox")).toBeNull();
    const ids = (trigger.getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toContain("Archived budgets are read-only.");
  });

  it("commit: locked under a locked WriteLockProvider, with the lock's reason", () => {
    render(
      <WriteLockProvider locked reason="Shared with you to read.">
        <MultiSelect label="Tags" options={OPTIONS} value={[]} onChange={vi.fn()} commit />
      </WriteLockProvider>,
    );
    const trigger = screen.getByRole("combobox", { name: /Tags/ });
    expect(trigger).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(trigger);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("without commit it stays editable under the lock", () => {
    render(
      <WriteLockProvider locked reason="Shared with you to read.">
        <MultiSelect label="Tags" options={OPTIONS} value={[]} onChange={vi.fn()} />
      </WriteLockProvider>,
    );
    fireEvent.click(screen.getByRole("combobox", { name: /Tags/ }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });
});
