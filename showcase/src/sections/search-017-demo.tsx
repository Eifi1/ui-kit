import { useState } from "react";
import { Building2, FileText, Home, Users } from "lucide-react";
import { GlobalSearch } from "@eifi1/ui-kit";
import type { GlobalSearchSource, SearchEntry } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * 0.17.0 — a `GlobalSearch` source that fills several groups from ONE request
 * (`groups`), as kastlan's record search does: one server call answers with properties,
 * units, contacts and leases at once.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";

type Kind = "estate" | "unit" | "contact" | "lease";

const ICONS: Record<Kind, typeof Home> = { estate: Building2, unit: Home, contact: Users, lease: FileText };

// The "server's" records, deliberately interleaved: the headings must still come out in
// the declared order.
const RECORDS: { kind: Kind; id: string; label: string; sub?: string }[] = [
  { kind: "contact", id: "c1", label: "Anna Müller", sub: "Tenant" },
  { kind: "estate", id: "e1", label: "Müllerstraße 4", sub: "Berlin" },
  { kind: "lease", id: "l1", label: "Lease Müller, Unit 3" },
  { kind: "unit", id: "u1", label: "Unit 3", sub: "Müllerstraße 4" },
  { kind: "contact", id: "c2", label: "Ben Müller", sub: "Owner" },
  { kind: "estate", id: "e2", label: "Parkallee 12", sub: "Hamburg" },
  { kind: "unit", id: "u2", label: "Unit 7", sub: "Parkallee 12" },
  { kind: "contact", id: "c3", label: "Clara Park", sub: "Tenant" },
  { kind: "lease", id: "l2", label: "Lease Park, Unit 7" },
];

const STATIC: SearchEntry[] = [
  { id: "page-contacts", title: "Contacts", group: "Pages", keywords: ["people"], href: "/contacts" },
  { id: "page-properties", title: "Properties", group: "Pages", href: "/properties" },
];

export function Search017Demo() {
  const [went, setWent] = useState<string | null>(null);
  const [calls, setCalls] = useState(0);

  const records: GlobalSearchSource = {
    id: "records",
    group: "Other records",
    // Keys are what the server sends; labels are what the reader sees, in this order.
    groups: [
      { key: "estate", label: "Properties" },
      { key: "unit", label: "Units" },
      { key: "contact", label: "Contacts" },
      { key: "lease", label: "Leases" },
    ],
    limit: 3,
    search: (query, signal) =>
      new Promise((resolve) => {
        setCalls((n) => n + 1);
        const timer = setTimeout(() => {
          const needle = query.toLowerCase();
          resolve(
            RECORDS.filter((r) => `${r.label} ${r.sub ?? ""}`.toLowerCase().includes(needle)).map((r) => {
              const Icon = ICONS[r.kind];
              return {
                id: r.id,
                title: r.label,
                hint: r.sub,
                group: r.kind,
                icon: <Icon className="size-4" />,
                href: `/${r.kind}/${r.id}`,
              };
            }),
          );
        }, 500);
        signal.addEventListener("abort", () => clearTimeout(timer));
      }),
  };

  return (
    <Example
      label="GlobalSearch — one source, several groups"
      hint="groups on a source: one request per query, its answer split by each entry's group key"
    >
      <div className="space-y-3">
        <Row>
          {/* `shortcut={false}`: the page's first specimen already owns ⌘K. */}
          <GlobalSearch
            entries={STATIC}
            sources={[records]}
            navigate={setWent}
            hrefFor={(href) => href}
            shortcut={false}
            triggerClassName="border border-[var(--border)]"
          />
          <span className="text-xs text-[var(--text-secondary)]">← open, then type “müller” or “park”</span>
        </Row>
        <OutTable
          rows={[
            ["navigate(href)", <span className={READOUT}>{went ?? "—"}</span>],
            ["requests", <span className={READOUT}>{calls}</span>],
          ]}
        />
        <Note>
          The source declares <code className="font-mono">groups</code> as{" "}
          <code className="font-mono">{"{ key, label }"}</code> pairs and each returned entry names its key in{" "}
          <code className="font-mono">group</code>. While the one request runs there is one &ldquo;Searching…&rdquo;
          line under the first group; when it answers, Properties, Units, Contacts and Leases appear in that order
          whatever order the answer had, each capped at <code className="font-mono">limit</code>, and ↑/↓ walks
          them as shown. The request counter goes up once per query, not once per group.
        </Note>
      </div>
    </Example>
  );
}
