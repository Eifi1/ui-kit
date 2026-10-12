import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { IconButton } from "../icon-button";
import { Input } from "../input";
import { Label } from "../field-base";
import { Select } from "../select";
import { Tabs } from "../tabs";
import type { TabItem } from "../tabs";
import { SearchField } from "../search-field";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * Field anatomy for 0.6.0: the pieces three apps hand-rolled around the kit's fields
 * because the kit's own could not be sized, labelled or extended to fit — kastlan's
 * label above a field and its toolbar select, lenkbank's row/chip icon actions and its
 * sheet tabs, keksdose's header search.
 */

describe("Label", () => {
  it("is a real label: a click on it focuses its control", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Label htmlFor="name">Name</Label>
        <Input id="name" />
      </>,
    );
    await user.click(screen.getByText("Name"));
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus();
  });

  it("draws the required mark but keeps it out of the control's name", () => {
    render(
      <>
        <Label htmlFor="iban" required>
          IBAN
        </Label>
        <Input id="iban" required />
      </>,
    );
    const field = screen.getByRole("textbox", { name: "IBAN" });
    // The mark is on screen…
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
    // …and "required" is what the control itself says.
    expect(field).toBeRequired();
  });

  it("has a compact size for a toolbar", () => {
    render(<Label size="sm">As of</Label>);
    expect(screen.getByText("As of")).toHaveClass("text-xs");
  });
});

describe("Select size", () => {
  it("sizes an unlabelled select down to the toolbar height", () => {
    render(
      <Select size="sm" aria-label="Period">
        <option>Month</option>
      </Select>,
    );
    const select = screen.getByRole("combobox", { name: "Period" });
    expect(select).toHaveClass("h-7", "text-xs", "py-0");
    // The word never reaches the DOM — `size="sm"` on a <select> is not a number.
    expect(select).not.toHaveAttribute("size");
  });

  it("still passes a NUMBER through as the native list-box rows", () => {
    render(
      <Select size={4} aria-label="Accounts">
        <option>A</option>
      </Select>,
    );
    expect(screen.getByRole("listbox", { name: "Accounts" })).toHaveAttribute("size", "4");
  });

  it("puts selectClassName on the <select>, className on the wrapper", () => {
    render(
      <Select aria-label="Sort" className="w-40" selectClassName="font-mono">
        <option>Name</option>
      </Select>,
    );
    const select = screen.getByRole("combobox", { name: "Sort" });
    expect(select).toHaveClass("font-mono");
    expect(select).not.toHaveClass("w-40");
    expect(select.parentElement!).toHaveClass("w-40");
  });

  it("ignores `sm` on a labelled select, which needs the tall box for its label", () => {
    render(
      <Select size="sm" label="Period">
        <option>Month</option>
      </Select>,
    );
    expect(screen.getByRole("combobox", { name: "Period" })).not.toHaveClass("h-7");
  });
});

describe("IconButton", () => {
  it("keeps the two existing sizes and adds the two small steps", () => {
    render(
      <>
        <IconButton aria-label="md" />
        <IconButton aria-label="sm" size="sm" />
        <IconButton aria-label="xs" size="xs" />
        <IconButton aria-label="2xs" size="2xs" />
      </>,
    );
    expect(screen.getByRole("button", { name: "md" })).toHaveClass("size-9");
    expect(screen.getByRole("button", { name: "sm" })).toHaveClass("size-8");
    expect(screen.getByRole("button", { name: "xs" })).toHaveClass("size-7");
    expect(screen.getByRole("button", { name: "2xs" })).toHaveClass("size-6");
  });

  it("turns red on hover with tone=danger, from the danger tokens", () => {
    render(<IconButton aria-label="Delete" tone="danger" />);
    const el = screen.getByRole("button", { name: "Delete" });
    expect(el).toHaveClass("hover:text-danger");
    expect(el).toHaveClass("hover:bg-danger-soft");
  });

  it("keeps a click and its Enter from reaching a clickable row", async () => {
    const user = userEvent.setup();
    const row = vi.fn();
    const remove = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div onClick={row} onKeyDown={row}>
        <IconButton aria-label="Delete" stopPropagation onClick={remove}>
          <Trash2 />
        </IconButton>
      </div>,
    );
    const button = screen.getByRole("button", { name: "Delete" });
    await user.click(button);
    button.focus();
    await user.keyboard("{Enter}");
    expect(remove).toHaveBeenCalledTimes(2);
    expect(row).not.toHaveBeenCalled();
  });
});

/* ── Tabs: add / remove / adornments ──────────────────────────────────────── */

type Sheet = "a" | "b" | "c" | "d";
const SHEETS: TabItem<Sheet>[] = [
  { id: "a", label: "40 km/h" },
  { id: "b", label: "80 km/h", detail: "loop 2" },
  { id: "c", label: "120 km/h", empty: true, icon: <span data-testid="swatch" /> },
];

function Workbook({
  onRemove: spy,
  busy,
  removeOn,
}: {
  onRemove?: (id: Sheet) => void;
  busy?: boolean;
  removeOn?: "every" | "active";
}) {
  const [tabs, setTabs] = useState(SHEETS);
  const [active, setActive] = useState<Sheet>("b");
  return (
    <>
      <Tabs
        aria-label="Sheets"
        tabs={tabs}
        active={active}
        onChange={setActive}
        busy={busy}
        removeOn={removeOn}
        onRemove={(id) => {
          spy?.(id);
          const index = tabs.findIndex((t) => t.id === id);
          const next = tabs.filter((t) => t.id !== id);
          setTabs(next);
          if (id === active) setActive((next[index - 1] ?? next[0]).id);
        }}
        onAdd={() => setTabs((t) => [...t, { id: "d", label: "160 km/h" }])}
        addLabel="Add loop"
      />
      <button type="button">elsewhere</button>
    </>
  );
}

describe("Tabs — add, remove, adornments", () => {
  it("names the × after its tab and shows it on the open tab only", () => {
    render(<Workbook />);
    expect(screen.getByRole("button", { name: "Remove 80 km/h" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove 40 km/h" })).toBeNull();
  });

  it("reserves the ×'s room on every removable tab, so opening one moves nothing", () => {
    render(<Workbook />);
    for (const t of screen.getAllByRole("tab")) expect(t).toHaveClass("pe-8");
  });

  it("removes through the × and puts focus on the caller's new selection", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Workbook onRemove={spy} />);
    await user.click(screen.getByRole("button", { name: "Remove 80 km/h" }));
    expect(spy).toHaveBeenCalledWith("b");
    expect(screen.queryByRole("tab", { name: /80 km\/h/ })).toBeNull();
    expect(screen.getByRole("tab", { name: "40 km/h" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "40 km/h" })).toHaveAttribute("aria-selected", "true");
  });

  it("removes the FOCUSED tab on Delete and focuses its neighbour", async () => {
    const user = userEvent.setup();
    render(<Workbook />);
    screen.getByRole("tab", { name: /80 km\/h/ }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "40 km/h" })).toHaveFocus();
    await user.keyboard("{Delete}");
    expect(screen.queryByRole("tab", { name: "40 km/h" })).toBeNull();
    expect(screen.getByRole("tab", { name: /80 km\/h/ })).toHaveFocus();
  });

  it("announces Delete as the tab's shortcut", () => {
    render(<Workbook />);
    expect(screen.getByRole("tab", { name: "40 km/h" })).toHaveAttribute(
      "aria-keyshortcuts",
      "Delete",
    );
  });

  describe('removeOn="active" (lenkbank: a remove deletes a sheet at once)', () => {
    it("ignores Delete on a focused tab that is not open", async () => {
      const user = userEvent.setup();
      const spy = vi.fn();
      render(<Workbook onRemove={spy} removeOn="active" />);
      screen.getByRole("tab", { name: /80 km\/h/ }).focus();
      await user.keyboard("{ArrowLeft}");
      expect(screen.getByRole("tab", { name: "40 km/h" })).toHaveFocus();
      await user.keyboard("{Delete}");
      expect(spy).not.toHaveBeenCalled();
      expect(screen.getByRole("tab", { name: "40 km/h" })).toBeInTheDocument();
    });

    it("still removes the open tab on Delete", async () => {
      const user = userEvent.setup();
      const spy = vi.fn();
      render(<Workbook onRemove={spy} removeOn="active" />);
      screen.getByRole("tab", { name: /80 km\/h/ }).focus();
      await user.keyboard("{Delete}");
      expect(spy).toHaveBeenCalledWith("b");
      expect(screen.getByRole("tab", { name: "40 km/h" })).toHaveFocus();
    });

    it("announces the shortcut on the open tab only, and keeps every tab's gutter", () => {
      render(<Workbook removeOn="active" />);
      expect(screen.getByRole("tab", { name: /80 km\/h/ })).toHaveAttribute(
        "aria-keyshortcuts",
        "Delete",
      );
      expect(screen.getByRole("tab", { name: "40 km/h" })).not.toHaveAttribute("aria-keyshortcuts");
      for (const t of screen.getAllByRole("tab")) expect(t).toHaveClass("pe-8");
      expect(screen.getAllByRole("button", { name: /^Remove / })).toHaveLength(1);
    });
  });

  it("does not remove anything while busy", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Workbook onRemove={spy} busy />);
    expect(screen.getByRole("button", { name: "Remove 80 km/h" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add loop" })).toBeDisabled();
    screen.getByRole("tab", { name: /80 km\/h/ }).focus();
    await user.keyboard("{Delete}");
    expect(spy).not.toHaveBeenCalled();
  });

  it("keeps the add button and the × out of the tab order's single stop", async () => {
    const user = userEvent.setup();
    render(<Workbook />);
    await user.tab();
    expect(screen.getByRole("tab", { name: /80 km\/h/ })).toHaveFocus();
    await user.tab();
    // Not the ×: the add button, which is an ordinary action after the strip.
    expect(screen.getByRole("button", { name: "Add loop" })).toHaveFocus();
  });

  // Round 0.34, the showcase's axe check: the × was a button inside the tablist, which
  // may own tabs only. The named remove button is after the strip now; the × drawn on
  // the open tab is the pointer's, hidden from assistive tech.
  it("keeps the remove button OUTSIDE the tablist too, and the drawn × still removes", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Workbook onRemove={spy} />);
    const list = screen.getByRole("tablist", { name: "Sheets" });
    expect(within(list).queryAllByRole("button")).toHaveLength(0);
    expect(list).not.toContainElement(screen.getByRole("button", { name: "Remove 80 km/h" }));
    const drawn = list.querySelector<HTMLButtonElement>("[data-tab-remove]")!;
    expect(drawn).toHaveAttribute("aria-hidden", "true");
    expect(drawn).toHaveAttribute("tabindex", "-1");
    await user.click(drawn);
    expect(spy).toHaveBeenCalledWith("b");
    expect(screen.getByRole("tab", { name: "40 km/h" })).toHaveFocus();
  });

  it("keeps the strip the root without an add button, the remove button right after it", () => {
    const { container } = render(
      <Tabs tabs={SHEETS} active="b" onChange={vi.fn()} onRemove={vi.fn()} className="mb-4" />,
    );
    const list = screen.getByRole("tablist");
    expect(container.firstElementChild).toBe(list);
    expect(list).toHaveClass("mb-4");
    expect(list.nextElementSibling).toBe(screen.getByRole("button", { name: "Remove 80 km/h" }));
  });

  it("adds through a button OUTSIDE the tablist, since a tablist owns only tabs", async () => {
    const user = userEvent.setup();
    render(<Workbook />);
    const list = screen.getByRole("tablist", { name: "Sheets" });
    const add = screen.getByRole("button", { name: "Add loop" });
    expect(list).not.toContainElement(add);
    await user.click(add);
    expect(within(list).getByRole("tab", { name: "160 km/h" })).toBeInTheDocument();
  });

  it("draws the detail line into the name, the icon out of it, and dashes an empty tab", () => {
    render(<Workbook />);
    expect(screen.getByRole("tab", { name: "80 km/h loop 2" })).toBeInTheDocument();
    const empty = screen.getByRole("tab", { name: "120 km/h" });
    expect(screen.getByTestId("swatch").parentElement).toHaveAttribute("aria-hidden", "true");
    expect(empty.firstElementChild!.className).toContain("border-dashed");
  });

  it("keeps a tab marked removable={false}", () => {
    render(
      <Tabs
        tabs={[{ id: "x", label: "Base", removable: false }]}
        active="x"
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("tab", { name: "Base" })).not.toHaveAttribute("aria-keyshortcuts");
  });

  it("speaks the provider's language for its own strings", () => {
    render(
      <UiKitProvider labels={{ tabs: { add: "Blatt hinzufügen", remove: (t) => `${t} entfernen` } }}>
        <Tabs
          tabs={[{ id: "x", label: <b>Eins</b>, name: "Eins" }]}
          active="x"
          onChange={vi.fn()}
          onRemove={vi.fn()}
          onAdd={vi.fn()}
        />
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Eins entfernen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Blatt hinzufügen" })).toBeInTheDocument();
  });

  it("renders exactly the old strip when none of the new props are set", () => {
    const { container } = render(
      <Tabs tabs={[{ id: "x", label: "X" }]} active="x" onChange={vi.fn()} className="mb-4" />,
    );
    const list = screen.getByRole("tablist");
    expect(container.firstElementChild).toBe(list);
    expect(list).toHaveClass("mb-4");
    expect(screen.getByRole("tab", { name: "X" }).parentElement).toBe(list);
  });
});

describe("SearchField — inline variant", () => {
  it("drops the field chrome and its type size, keeping the searchbox", () => {
    render(<SearchField variant="inline" value="" onChange={vi.fn()} aria-label="Search" />);
    const box = screen.getByRole("searchbox", { name: "Search" });
    expect(box).toHaveClass("border-0");
    expect(box).toHaveClass("bg-transparent");
    expect(box).not.toHaveClass("text-sm");
    expect(box).not.toHaveClass("shadow-sm");
  });

  it("puts inputClassName on the input, className on the wrapper", () => {
    render(
      <SearchField
        value=""
        onChange={vi.fn()}
        aria-label="Search"
        className="flex-1"
        inputClassName="text-base"
      />,
    );
    const box = screen.getByRole("searchbox", { name: "Search" });
    expect(box).toHaveClass("text-base");
    expect(box).not.toHaveClass("text-sm");
    expect(box.parentElement!).toHaveClass("flex-1");
  });

  it("keeps its clear button in the inline form", () => {
    const onChange = vi.fn();
    render(
      <SearchField variant="inline" value="rent" onChange={onChange} aria-label="Search" clearLabel="Clear" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenCalledWith("");
  });
});
