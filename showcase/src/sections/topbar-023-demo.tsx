import { useState } from "react";
import { Check, Compass, PiggyBank, Upload, Users, Wallet } from "lucide-react";
import { Chip, ToggleGroup, TopBarActionMenu } from "@eifi1/ui-kit";
import type { TopBarMenuEntry } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * Group headings in `TopBarActionMenu` (0.23, keksdose's guided-tours menu): the tours
 * filed by topic, each block named by a heading instead of fenced off by a bare divider.
 * The tours here are made up; an app's are its own.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";
const code = (s: string) => <code className="font-mono">{s}</code>;

type Mode = "headings" | "dividers";

export function TopBarMenuHeadingsDemo() {
  const [mode, setMode] = useState<Mode>("headings");
  const [log, setLog] = useState("—");
  const [done, setDone] = useState<string[]>(["budgets"]);

  const tour = (key: string, label: string, Icon: typeof Wallet, fresh = false): TopBarMenuEntry => ({
    key,
    icon: <Icon className="size-4" />,
    label,
    trailing: done.includes(key) ? (
      <Check className="size-4 text-[var(--text-secondary)]" />
    ) : fresh ? (
      <Chip size="sm" tone="brand" caps className="px-1.5">
        New
      </Chip>
    ) : undefined,
    onSelect: () => {
      setLog(`launch → ${key}`);
      setDone((d) => (d.includes(key) ? d : [...d, key]));
    },
  });

  const here = [tour("budgets", "Budgets basics", Wallet), tour("goals", "Savings goals", PiggyBank)];
  const fresh = [tour("import", "Bank import", Upload, true), tour("shared", "Shared budgets", Users, true)];
  const allTours: TopBarMenuEntry = {
    key: "all",
    icon: <Compass className="size-4" />,
    label: "All tours…",
    onSelect: () => setLog("navigate → /tours"),
  };

  const entries: TopBarMenuEntry[] =
    mode === "headings"
      ? [
          { kind: "heading", key: "h-here", label: "On this page" },
          ...here,
          { kind: "heading", key: "h-new", label: "New since your last visit" },
          ...fresh,
          // An empty topic is not drawn: no heading over nothing.
          { kind: "heading", key: "h-reports", label: "Reports" },
          { kind: "divider", key: "sep-all" },
          allTours,
        ]
      : [...here, { kind: "divider", key: "sep-1" }, ...fresh, { kind: "divider", key: "sep-all" }, allTours];

  return (
    <Example
      label="TopBarActionMenu — group headings"
      hint={'`{ kind: "heading", key, label }` entries name the rows after them'}
    >
      <div className="flex flex-col gap-3">
        <ToggleGroup
          aria-label="Menu layout"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { value: "headings", label: "Headings" },
            { value: "dividers", label: "Dividers only (before)" },
          ]}
        />
        <div className="flex justify-end rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] p-2">
          <TopBarActionMenu
            icon={<Compass className="size-5" />}
            ariaLabel="Guided tours"
            panelClassName="w-72 max-h-[70vh] overflow-y-auto"
            entries={entries}
          />
        </div>
        <Row>
          <span className={READOUT}>{log}</span>
        </Row>
        <Note>
          A heading names the rows after it up to the next heading, the next divider or the end: the rows sit in a{" "}
          {code('role="group"')} labelled by the heading, as the CommandPalette&apos;s groups are, so a screen reader
          says the topic when the focus enters it. The heading is not a row — the arrow keys, Home and End pass over it
          and it takes no focus. A divider ends the group, so &quot;All tours…&quot; behind the rule belongs to no
          topic, and a topic with no rows (&quot;Reports&quot; here) is not drawn. The panel is the same at 390px; a
          long heading wraps rather than widening it. With headings, the menu-wide {code("heading")} title is usually
          redundant.
        </Note>
      </div>
    </Example>
  );
}
