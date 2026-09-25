import { useState } from "react";
import { Building2, FileText, Folder, FolderOpen, Landmark, Wallet } from "lucide-react";
import { Button, TreeRow, TreeView } from "@eifi1/ui-kit";
import type { TreeNode } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * TREE VIEW — the WAI-ARIA tree: one Tab stop, ↑/↓ through the visible rows, →/← to
 * open, step in, close and step out, Home/End, `*` for every sibling, and type-ahead.
 * `TreeRow` is the row alone — the indent, guides and chevron with no tree semantics —
 * for a hierarchy that cannot be a tree widget (a gantt's label column).
 */

const EUR = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

interface Account {
  number: string;
  balance: number;
}

const ACCOUNTS: TreeNode<Account>[] = [
  {
    id: "assets",
    label: "Assets",
    icon: <Landmark className="size-4" />,
    children: [
      {
        id: "current",
        label: "Current assets",
        children: [
          {
            id: "bank",
            label: "Bank",
            icon: <Wallet className="size-4" />,
            children: [
              { id: "1020", label: "1020 Operating account", textValue: "Operating account", trailing: EUR.format(18240), data: { number: "1020", balance: 18240 } },
              { id: "1030", label: "1030 Savings account", textValue: "Savings account", trailing: EUR.format(52000), data: { number: "1030", balance: 52000 } },
              { id: "1040", label: "1040 Closed account", textValue: "Closed account", trailing: EUR.format(0), disabled: true },
            ],
          },
          { id: "1200", label: "1200 Receivables", textValue: "Receivables", trailing: EUR.format(7310), data: { number: "1200", balance: 7310 } },
        ],
      },
      {
        id: "fixed",
        label: "Fixed assets",
        icon: <Building2 className="size-4" />,
        children: [{ id: "0400", label: "0400 Office equipment", textValue: "Office equipment", trailing: EUR.format(4100) }],
      },
    ],
  },
  {
    id: "liabilities",
    label: "Liabilities",
    icon: <Landmark className="size-4" />,
    children: [
      { id: "1600", label: "1600 Payables", textValue: "Payables", trailing: EUR.format(3920) },
      { id: "1700", label: "1700 VAT", textValue: "VAT", trailing: EUR.format(1450) },
    ],
  },
];

function Uncontrolled() {
  const [picked, setPicked] = useState<string>("—");
  return (
    <Example
      label="TreeView — keyboard, icons, trailing figures"
      hint="uncontrolled (defaultExpanded, defaultSelected); Tab in once, then ↑ ↓ → ← Home End * and type-ahead"
    >
      <div className="max-w-md rounded-md border border-[var(--border)] p-2">
        <TreeView<Account>
          aria-label="Chart of accounts"
          items={ACCOUNTS}
          defaultExpanded={["assets", "current", "bank"]}
          defaultSelected="1020"
          onSelectedChange={(id, node) =>
            setPicked(node.data ? `${id} · balance ${EUR.format(node.data.balance)}` : id)
          }
        />
      </div>
      <p className="mt-2 font-mono text-xs text-[var(--text-secondary)]">onSelectedChange → {picked}</p>
      <div className="mt-3">
        <Note>
          Type &ldquo;sav&rdquo; with focus in the tree and it jumps to the savings account: the
          accounts carry a <code className="font-mono">textValue</code> without the number, so
          type-ahead matches the name. &ldquo;1040 Closed account&rdquo; is{" "}
          <code className="font-mono">disabled</code> — focusable and announced as unavailable, not
          selectable. <code className="font-mono">data</code> rides along and comes back in{" "}
          <code className="font-mono">onSelectedChange</code>. Only the chevron toggles on click; a
          click on the label selects.
        </Note>
      </div>
    </Example>
  );
}

function Controlled() {
  const [expanded, setExpanded] = useState<string[]>(["liabilities"]);
  const [selected, setSelected] = useState<string | null>("1700");
  const allParents = ["assets", "current", "bank", "fixed", "liabilities"];
  return (
    <Example
      label="TreeView — controlled"
      hint="expanded and selected are the caller's state; the buttons below write it"
    >
      <Row className="mb-3">
        <Button variant="secondary" onClick={() => setExpanded(allParents)}>
          Expand all
        </Button>
        <Button variant="secondary" onClick={() => setExpanded([])}>
          Collapse all
        </Button>
        <Button variant="ghost" onClick={() => setSelected(null)}>
          Clear selection
        </Button>
      </Row>
      <div className="max-w-md rounded-md border border-[var(--border)] p-2">
        <TreeView
          aria-label="Chart of accounts, controlled"
          items={ACCOUNTS}
          expanded={expanded}
          onExpandedChange={setExpanded}
          selected={selected}
          onSelectedChange={(id) => setSelected(id)}
          indent={24}
          indentGuides={false}
          rowClassName="min-h-7"
        />
      </div>
      <OutTable
        rows={[
          ["expanded", JSON.stringify(expanded)],
          ["selected", JSON.stringify(selected)],
        ]}
      />
      <div className="mt-3">
        <Note>
          <code className="font-mono">indent={"{24}"}</code> and{" "}
          <code className="font-mono">indentGuides={"{false}"}</code> — a wider step and no hairlines;{" "}
          <code className="font-mono">rowClassName</code> makes every row a denser{" "}
          <code className="font-mono">min-h-7</code>.
        </Note>
      </div>
    </Example>
  );
}

/** A folder tree whose children arrive from a "server" — a timeout here. */
const ROOT_FOLDERS: TreeNode[] = [
  { id: "docs", label: "Documents", hasChildren: true },
  { id: "photos", label: "Photos", hasChildren: true },
  { id: "empty", label: "Empty folder", hasChildren: true },
  { id: "readme", label: "README.txt" },
];

function withChildren(nodes: TreeNode[], id: string, children: TreeNode[]): TreeNode[] {
  return nodes.map((n) =>
    n.id === id
      ? { ...n, children, hasChildren: false }
      : n.children
        ? { ...n, children: withChildren([...n.children], id, children) }
        : n,
  );
}

function Lazy() {
  const [items, setItems] = useState<TreeNode[]>(ROOT_FOLDERS);
  const [loads, setLoads] = useState<string[]>([]);
  return (
    <Example
      label="TreeView — lazy children"
      hint="hasChildren draws a chevron; opening calls loadChildren, and the row spins (aria-busy) until it settles"
    >
      <div className="max-w-md rounded-md border border-[var(--border)] p-2">
        <TreeView
          aria-label="Files"
          items={items}
          selectionMode="none"
          loadChildren={(node) =>
            new Promise<void>((resolve) => {
              setTimeout(() => {
                const kids: TreeNode[] =
                  node.id === "empty"
                    ? []
                    : Array.from({ length: 3 }, (_, i) => ({
                        id: `${node.id}/${i + 1}`,
                        label: `${node.label} ${i + 1}`,
                        hasChildren: i === 0,
                      }));
                setItems((current) => withChildren(current, node.id, kids));
                setLoads((l) => [...l, String(node.id)]);
                resolve();
              }, 700);
            })
          }
          renderItem={(node, state) => (
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              {state.expandable ? (
                state.expanded ? (
                  <FolderOpen aria-hidden className="size-4 shrink-0 text-[var(--text-muted)]" />
                ) : (
                  <Folder aria-hidden className="size-4 shrink-0 text-[var(--text-muted)]" />
                )
              ) : (
                <FileText aria-hidden className="size-4 shrink-0 text-[var(--text-muted)]" />
              )}
              <span className="truncate">{node.label}</span>
              <span className="ms-auto text-[11px] text-[var(--text-muted)]">
                {state.loading ? "loading…" : `level ${state.level}`}
              </span>
            </span>
          )}
        />
      </div>
      <p className="mt-2 font-mono text-xs text-[var(--text-secondary)]">loaded: {loads.length ? loads.join(", ") : "—"}</p>
      <div className="mt-3">
        <Note>
          <code className="font-mono">selectionMode=&quot;none&quot;</code> makes it a navigation-only
          tree: no <code className="font-mono">aria-selected</code>, and Enter toggles. The whole row
          after the chevron is <code className="font-mono">renderItem</code>, handed the node and its
          state — the open-folder icon and the level readout come from{" "}
          <code className="font-mono">state.expanded</code> and <code className="font-mono">state.level</code>.
          &ldquo;Empty folder&rdquo; loads no children, and its chevron goes away.
        </Note>
      </div>
    </Example>
  );
}

const RTL_ITEMS: TreeNode[] = [
  {
    id: "r1",
    label: "الأصول",
    children: [
      { id: "r1a", label: "البنك", trailing: "١٨٬٢٤٠ €" },
      { id: "r1b", label: "النقد", trailing: "٤٢٠ €" },
    ],
  },
  { id: "r2", label: "الخصوم", children: [{ id: "r2a", label: "الموردون" }] },
];

function Rtl() {
  return (
    <Example label="TreeView — right-to-left" hint={<code className="font-mono">dir=&quot;rtl&quot;</code>}>
      <div dir="rtl" className="max-w-md rounded-md border border-[var(--border)] p-2">
        <TreeView aria-label="شجرة الحسابات" items={RTL_ITEMS} defaultExpanded={["r1"]} />
      </div>
      <div className="mt-3">
        <Note>
          The indent, the guides and the chevron hang from the reading start (logical properties,
          no second code path), and the arrow keys follow the direction: here the children hang
          to the left, and <strong>←</strong> is what opens them. The chevron points left when
          closed and turns down — the other way round from LTR.
        </Note>
      </div>
    </Example>
  );
}

const GANTT = [
  { id: "g1", label: "Kitchen renovation", level: 1, parent: true },
  { id: "g2", label: "Demolition", level: 2 },
  { id: "g3", label: "Plumbing", level: 2 },
  { id: "g4", label: "Electrics", level: 2, parent: true },
  { id: "g5", label: "Cabling", level: 3 },
] as const;

function StandaloneRows() {
  const [open, setOpen] = useState<Record<string, boolean>>({ g1: true, g4: false });
  const [selected, setSelected] = useState("g3");
  const visible = GANTT.filter((row) => {
    if (row.level === 1) return true;
    if (!open.g1) return false;
    return row.level === 2 || open.g4;
  });
  return (
    <Example
      label="TreeRow — on its own"
      hint="the look without the widget: onToggle makes the chevron a real button, one per row"
    >
      <div className="max-w-md rounded-md border border-[var(--border)] p-2">
        {visible.map((row) =>
          "parent" in row ? (
            <TreeRow
              key={row.id}
              level={row.level}
              label={row.label}
              expanded={open[row.id]}
              onToggle={() => setOpen((o) => ({ ...o, [row.id]: !o[row.id] }))}
              icon={<FolderOpen aria-hidden className="size-4 text-[var(--text-muted)]" />}
              trailing="3 tasks"
              selected={selected === row.id}
              onClick={() => setSelected(row.id)}
            />
          ) : (
            <TreeRow
              key={row.id}
              level={row.level}
              label={row.label}
              selected={selected === row.id}
              onClick={() => setSelected(row.id)}
              indent={20}
              guides={row.level < 3}
            />
          ),
        )}
        <TreeRow level={2} expanded={false} loading label="Fetching subtasks…" />
        <TreeRow level={1} expanded={false} onToggle={() => undefined} label="Custom row" toggleLabel="Open the custom row">
          <span className="flex flex-1 items-center justify-between text-xs">
            <span className="font-medium text-[var(--text-primary)]">children replace label + trailing</span>
            <span className="rounded bg-[var(--bg-surface-2)] px-1.5 font-mono">custom</span>
          </span>
        </TreeRow>
      </div>
      <div className="mt-3">
        <Note>
          Each parent row&apos;s chevron here is a <code className="font-mono">&lt;button&gt;</code>{" "}
          with <code className="font-mono">aria-expanded</code>, named by the row&apos;s label — or by{" "}
          <code className="font-mono">toggleLabel</code> when <code className="font-mono">children</code>{" "}
          replaced the label (the last row). A leaf gets a chevron-sized gap so labels line up;{" "}
          <code className="font-mono">loading</code> puts a spinner in the chevron&apos;s place. The
          leaves pass <code className="font-mono">indent={"{20}"}</code>, and the third level{" "}
          <code className="font-mono">guides={"{false}"}</code>.
        </Note>
      </div>
    </Example>
  );
}

export function TreeViewDemo() {
  return (
    <>
      <Uncontrolled />
      <Controlled />
      <Lazy />
      <Rtl />
      <StandaloneRows />
    </>
  );
}
