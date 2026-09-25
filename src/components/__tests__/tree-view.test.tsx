import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { TreeRow, TreeView } from "../tree-view";
import type { TreeNode, TreeViewProps } from "../tree-view";

/**
 * kastlan's chart of accounts, as the WAI-ARIA tree pattern: roles and levels a reader
 * announces, one Tab stop, and the pattern's keys — ←/→ along the reading direction.
 */
const ACCOUNTS: TreeNode[] = [
  {
    id: "assets",
    label: "Assets",
    children: [
      {
        id: "current",
        label: "Current assets",
        children: [
          { id: "1020", label: "1020 Bank", trailing: "12,400.00" },
          { id: "1100", label: "1100 Receivables" },
        ],
      },
      { id: "fixed", label: "Fixed assets" },
    ],
  },
  { id: "liabilities", label: "Liabilities", children: [{ id: "2000", label: "2000 Payables" }] },
  { id: "equity", label: "Equity" },
];

function tree(props: Partial<TreeViewProps> = {}, dir?: "rtl" | "ltr") {
  return render(
    <div dir={dir}>
      <TreeView aria-label="Accounts" items={ACCOUNTS} {...props} />
    </div>,
  );
}

const item = (name: string | RegExp) => screen.getByRole("treeitem", { name });
const key = (k: string) => fireEvent.keyDown(document.activeElement!, { key: k });

describe("TreeView structure", () => {
  it("is a tree of treeitems with levels, expanded state and groups", () => {
    tree({ defaultExpanded: ["assets"] });
    expect(screen.getByRole("tree", { name: "Accounts" })).toBeInTheDocument();
    // Named by its own row, not by the open branch inside it.
    expect(screen.getByRole("treeitem", { name: "Assets" })).toBeInTheDocument();
    const assets = item(/^Assets/);
    expect(assets).toHaveAttribute("aria-level", "1");
    expect(assets).toHaveAttribute("aria-expanded", "true");
    expect(within(assets).getByRole("group")).toBeInTheDocument();
    expect(item(/^Current assets/)).toHaveAttribute("aria-level", "2");
    expect(item(/^Current assets/)).toHaveAttribute("aria-expanded", "false");
    // A leaf says nothing about expansion.
    expect(item(/^Fixed assets/)).not.toHaveAttribute("aria-expanded");
    // Collapsed children are not rendered.
    expect(screen.queryByRole("treeitem", { name: /1020/ })).toBeNull();
  });

  it("has exactly one Tab stop", () => {
    tree({ defaultExpanded: ["assets", "current"] });
    const tabbable = screen.getAllByRole("treeitem").filter((el) => el.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toBe(item(/^Assets/));
  });

  it("starts the Tab stop on the selected row when it is visible", () => {
    tree({ defaultExpanded: ["liabilities"], defaultSelected: "2000" });
    expect(item(/^2000/)).toHaveAttribute("tabindex", "0");
    expect(item(/^2000/)).toHaveAttribute("aria-selected", "true");
    expect(item(/^Assets/)).toHaveAttribute("aria-selected", "false");
  });

  it("renders the trailing slot and indent guides", () => {
    tree({ defaultExpanded: ["assets", "current"] });
    const bank = item(/^1020/);
    expect(bank).toHaveTextContent("12,400.00");
    // Level 3: two ancestor guides.
    expect(bank.querySelectorAll("[data-tree-guide]")).toHaveLength(2);
  });

  it("renderItem replaces the label and receives the row state", () => {
    tree({
      defaultExpanded: ["assets"],
      renderItem: (node, s) => (
        <span>
          {String(node.label)} L{s.level} {s.expanded ? "open" : "shut"}
        </span>
      ),
    });
    expect(item(/^Assets L1 open/)).toBeInTheDocument();
    expect(item(/^Current assets L2 shut/)).toBeInTheDocument();
  });
});

describe("TreeView keyboard (LTR)", () => {
  it("↓/↑ walk the visible rows; Home/End jump to the ends", () => {
    tree({ defaultExpanded: ["assets"] });
    item(/^Assets/).focus();
    key("ArrowDown");
    expect(item(/^Current assets/)).toHaveFocus();
    key("ArrowDown");
    expect(item(/^Fixed assets/)).toHaveFocus();
    key("ArrowDown");
    expect(item(/^Liabilities/)).toHaveFocus();
    key("ArrowUp");
    expect(item(/^Fixed assets/)).toHaveFocus();
    key("End");
    expect(item(/^Equity/)).toHaveFocus();
    key("Home");
    expect(item(/^Assets/)).toHaveFocus();
    // The Tab stop moved with focus.
    key("ArrowDown");
    expect(item(/^Current assets/)).toHaveAttribute("tabindex", "0");
    expect(item(/^Assets/)).toHaveAttribute("tabindex", "-1");
  });

  it("→ opens a closed parent, then steps into it; → on a leaf does nothing", () => {
    tree();
    item(/^Assets/).focus();
    key("ArrowRight");
    expect(item(/^Assets/)).toHaveAttribute("aria-expanded", "true");
    expect(item(/^Assets/)).toHaveFocus();
    key("ArrowRight");
    expect(item(/^Current assets/)).toHaveFocus();
    key("ArrowDown");
    expect(item(/^Fixed assets/)).toHaveFocus();
    key("ArrowRight");
    expect(item(/^Fixed assets/)).toHaveFocus();
  });

  it("← closes an open parent, then steps out to the parent", () => {
    tree({ defaultExpanded: ["assets", "current"] });
    item(/^1020/).focus();
    key("ArrowLeft");
    expect(item(/^Current assets/)).toHaveFocus();
    key("ArrowLeft");
    expect(item(/^Current assets/)).toHaveAttribute("aria-expanded", "false");
    key("ArrowLeft");
    expect(item(/^Assets/)).toHaveFocus();
  });

  it("Enter and Space select; onSelectedChange gets the id and node", () => {
    const onSelectedChange = vi.fn();
    tree({ onSelectedChange });
    item(/^Liabilities/).focus();
    key("Enter");
    expect(onSelectedChange).toHaveBeenCalledWith("liabilities", ACCOUNTS[1]);
    expect(item(/^Liabilities/)).toHaveAttribute("aria-selected", "true");
    key("ArrowDown");
    key(" ");
    expect(item(/^Equity/)).toHaveAttribute("aria-selected", "true");
    expect(item(/^Liabilities/)).toHaveAttribute("aria-selected", "false");
  });

  it("* opens every sibling at the level", () => {
    tree();
    item(/^Assets/).focus();
    key("*");
    expect(item(/^Assets/)).toHaveAttribute("aria-expanded", "true");
    expect(item(/^Liabilities/)).toHaveAttribute("aria-expanded", "true");
  });

  it("type-ahead jumps to the next visible row starting with the typed text", () => {
    tree({ defaultExpanded: ["assets", "current"] });
    item(/^Assets/).focus();
    key("e");
    expect(item(/^Equity/)).toHaveFocus();
    // A new run after the pause; "1" then "1" again cycles through the 1xxx accounts.
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(Date.now() + 1000);
      key("1");
      expect(item(/^1020/)).toHaveFocus();
      key("1");
      expect(item(/^1100/)).toHaveFocus();
      vi.setSystemTime(Date.now() + 1000);
      // A multi-letter prefix, space included, stays on a row that still matches.
      key("f");
      expect(item(/^Fixed assets/)).toHaveFocus();
      key("i");
      key("x");
      key(" ");
      expect(item(/^Fixed assets/)).toHaveFocus();
      expect(item(/^Fixed assets/)).toHaveAttribute("aria-selected", "false");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("TreeView keyboard (RTL)", () => {
  it("← opens and steps in, → closes and steps out — the reading direction, mirrored", () => {
    tree({}, "rtl");
    item(/^Assets/).focus();
    key("ArrowLeft");
    expect(item(/^Assets/)).toHaveAttribute("aria-expanded", "true");
    key("ArrowLeft");
    expect(item(/^Current assets/)).toHaveFocus();
    key("ArrowRight");
    expect(item(/^Assets/)).toHaveFocus();
    key("ArrowRight");
    expect(item(/^Assets/)).toHaveAttribute("aria-expanded", "false");
    // ↑/↓ and Home/End do not depend on direction.
    key("End");
    expect(item(/^Equity/)).toHaveFocus();
  });
});

describe("TreeView state", () => {
  it("controlled `expanded` and `selected` only change through the callbacks", () => {
    const onExpandedChange = vi.fn();
    const onSelectedChange = vi.fn();
    tree({ expanded: [], selected: null, onExpandedChange, onSelectedChange });
    item(/^Assets/).focus();
    key("ArrowRight");
    expect(onExpandedChange).toHaveBeenCalledWith(["assets"]);
    // Nobody fed it back, so it stays closed.
    expect(item(/^Assets/)).toHaveAttribute("aria-expanded", "false");
    key("Enter");
    expect(onSelectedChange).toHaveBeenCalledWith("assets", ACCOUNTS[0]);
    expect(item(/^Assets/)).toHaveAttribute("aria-selected", "false");
  });

  it("a click selects; a click on the chevron toggles without selecting", () => {
    function Controlled() {
      const [expanded, setExpanded] = useState<string[]>([]);
      const [selected, setSelected] = useState<string | null>(null);
      return (
        <TreeView
          aria-label="Accounts"
          items={ACCOUNTS}
          expanded={expanded}
          onExpandedChange={setExpanded}
          selected={selected}
          onSelectedChange={setSelected}
        />
      );
    }
    render(<Controlled />);
    const assets = item(/^Assets/);
    fireEvent.click(assets.querySelector("[data-tree-toggle]")!);
    expect(assets).toHaveAttribute("aria-expanded", "true");
    expect(assets).toHaveAttribute("aria-selected", "false");
    fireEvent.click(within(item(/^Fixed assets/)).getByText("Fixed assets"));
    expect(item(/^Fixed assets/)).toHaveAttribute("aria-selected", "true");
  });

  it("collapsing the branch that holds focus moves the Tab stop to the parent", () => {
    tree({ defaultExpanded: ["assets"] });
    item(/^Assets/).focus();
    key("ArrowDown");
    expect(item(/^Current assets/)).toHaveFocus();
    fireEvent.click(item(/^Assets/).querySelector("[data-tree-toggle]")!);
    expect(item(/^Assets/)).toHaveAttribute("tabindex", "0");
  });

  it("disabled rows are focusable but not selectable", () => {
    const onSelectedChange = vi.fn();
    render(
      <TreeView
        aria-label="Accounts"
        items={[{ id: "a", label: "Archived", disabled: true }, { id: "b", label: "Bank" }]}
        onSelectedChange={onSelectedChange}
      />,
    );
    item("Archived").focus();
    expect(item("Archived")).toHaveAttribute("aria-disabled", "true");
    key("Enter");
    expect(onSelectedChange).not.toHaveBeenCalled();
  });

  it('selectionMode="none": no aria-selected, and Enter toggles', () => {
    tree({ selectionMode: "none" });
    item(/^Assets/).focus();
    expect(item(/^Assets/)).not.toHaveAttribute("aria-selected");
    key("Enter");
    expect(item(/^Assets/)).toHaveAttribute("aria-expanded", "true");
  });

  it("lazy children: opening calls loadChildren and the row is busy until it settles", async () => {
    let resolve!: () => void;
    const loadChildren = vi.fn<(node: TreeNode) => Promise<void>>(() => new Promise((r) => (resolve = r)));
    function Lazy() {
      const [items, setItems] = useState<TreeNode[]>([{ id: "root", label: "Root", hasChildren: true }]);
      return (
        <TreeView
          aria-label="Lazy"
          items={items}
          loadChildren={async (node) => {
            await loadChildren(node);
            setItems([{ id: "root", label: "Root", children: [{ id: "kid", label: "Kid" }] }]);
          }}
        />
      );
    }
    render(<Lazy />);
    item(/^Root/).focus();
    key("ArrowRight");
    expect(loadChildren).toHaveBeenCalledTimes(1);
    expect(item(/^Root/)).toHaveAttribute("aria-busy", "true");
    expect(item(/^Root/)).toHaveAttribute("aria-expanded", "true");
    await act(async () => resolve());
    expect(item(/^Root/)).not.toHaveAttribute("aria-busy");
    expect(item("Kid")).toHaveAttribute("aria-level", "2");
  });
});

describe("TreeRow on its own (gantt labels)", () => {
  it("renders a real toggle button named by the label, with aria-expanded", () => {
    const onToggle = vi.fn();
    render(<TreeRow level={2} expanded={false} onToggle={onToggle} label="Phase 1" />);
    const button = screen.getByRole("button", { name: "Phase 1" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("a leaf has no toggle but keeps the chevron's space, and one guide per ancestor", () => {
    const { container } = render(<TreeRow level={3} label="Task" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelectorAll("[data-tree-guide]")).toHaveLength(2);
    expect((container.firstChild as HTMLElement).style.paddingInlineStart).toBe("36px");
  });
});
