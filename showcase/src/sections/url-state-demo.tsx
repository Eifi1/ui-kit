import { useId, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  Button,
  Input,
  Modal,
  Tabs,
  ToggleGroup,
  useDialogParam,
  useSearchParamState,
  useTabParam,
} from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * URL STATE — 0.12.0's search-param hooks: one param as React state
 * (`useSearchParamState`), the active tab (`useTabParam`), a dialog's open state
 * (`useDialogParam`) and the Modal that takes that as a prop (`urlParam`).
 *
 * Every param here has its own key (`view`, `zoom`, `tab`, `edit`, `dialog`), so the
 * demos share the page's query string without stepping on each other — which is the
 * contract of the hooks: every OTHER param is left as it is.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

/** The router's query, which under the HashRouter lives after the `#`. */
function QueryReadout({ extra = [] }: { extra?: Array<[string, React.ReactNode]> }) {
  const { search } = useLocation();
  return <OutTable rows={[["location.search", search || "— (clean URL)"], ...extra]} />;
}

export function UrlStateDemo() {
  return (
    <>
      <SearchParamStateDemo />
      <TabParamDemo />
      <EditDialogDemo />
      <SharedDialogParamDemo />
    </>
  );
}

/* ── useSearchParamState ─────────────────────────────────────────────────── */

type View = "list" | "grid" | "map";
const VIEWS: readonly View[] = ["list", "grid", "map"];

function SearchParamStateDemo() {
  // `replace`: a view toggle is not a step anyone wants Back to walk through.
  const [view, setView] = useSearchParamState<View>("view", "list", {
    parse: (raw) => (VIEWS as readonly string[]).includes(raw) ? (raw as View) : undefined,
    replace: true,
  });
  // Push (the default): each zoom step is a history entry, so Back undoes it.
  const [zoom, setZoom] = useSearchParamState<number>("zoom", 100, {
    parse: (raw) => {
      const n = Number(raw);
      return Number.isFinite(n) && n >= 50 && n <= 200 ? n : undefined;
    },
  });
  return (
    <Example
      label="useSearchParamState — one param as state"
      hint="the default is the clean URL; an unparseable value reads as the default"
    >
      <div className="space-y-3">
        <div className="max-w-xs">
          <ToggleGroup<View>
            aria-label="View"
            value={view}
            onChange={setView}
            options={[
              { value: "list", label: "List" },
              { value: "grid", label: "Grid" },
              { value: "map", label: "Map" },
            ]}
          />
        </div>
        <Row>
          <Button variant="secondary" size="sm" disabled={zoom <= 50} onClick={() => setZoom((z) => z - 25)}>
            Zoom out
          </Button>
          <span className="font-mono text-xs tabular-nums text-[var(--text-secondary)]">{zoom}%</span>
          <Button variant="secondary" size="sm" disabled={zoom >= 200} onClick={() => setZoom((z) => z + 25)}>
            Zoom in
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setZoom(100)}>
            Reset
          </Button>
        </Row>
        <QueryReadout extra={[["view · zoom", `${view} · ${zoom}`]]} />
        <Note>
          {code('useSearchParamState("view", "list", { parse, replace: true })')} rewrites the entry;{" "}
          {code('useSearchParamState("zoom", 100, { parse })')} pushes one per step, so the browser&apos;s
          Back steps the zoom back down. Pick <em>List</em> or reset to 100% and the param leaves the URL
          — the default is always the clean address. Edit the hash by hand to{" "}
          {code("?zoom=banana")} and it reads as 100.
        </Note>
      </div>
    </Example>
  );
}

/* ── useTabParam ─────────────────────────────────────────────────────────── */

type Tab = "overview" | "payments" | "documents";
const TABS: readonly Tab[] = ["overview", "payments", "documents"];

const PANEL_TEXT: Record<Tab, string> = {
  overview: "Flat 3B · 2 rooms · let since March 2024.",
  payments: "Rent €1,240 · paid on the 1st · no arrears.",
  documents: "Lease.pdf · Handover protocol.pdf · Meter photos (4).",
};

function TabParamDemo() {
  const [tab, setTab] = useTabParam<Tab>("overview", { tabs: TABS });
  const panelId = useId();
  return (
    <Example label="useTabParam — the open tab in ?tab" hint="replaces the entry; an unknown tab reads as the default">
      <Tabs<Tab>
        label="Unit sections"
        active={tab}
        onChange={setTab}
        panelId={panelId}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "payments", label: "Payments" },
          { id: "documents", label: "Documents" },
        ]}
      />
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${panelId}-tab`}
        tabIndex={-1}
        className="mt-3 rounded-md border border-[var(--border)] p-3 text-sm text-[var(--text-secondary)]"
      >
        {PANEL_TEXT[tab]}
      </div>
      <div className="mt-3 space-y-2">
        <QueryReadout />
        <Note>
          Pick a tab and reload: the page opens on it. {code("tabs")} validates the param, so a link to{" "}
          {code("?tab=invoices")} — a tab since renamed — opens on Overview rather than on a blank panel.
          Switching tabs replaces the entry: Back leaves the page, it does not walk the tabs.
        </Note>
      </div>
    </Example>
  );
}

/* ── useDialogParam + Modal urlParam ─────────────────────────────────────── */

function EditDialogDemo() {
  const [open, setOpen] = useDialogParam("edit");
  const [name, setName] = useState("Flat 3B");
  const [draft, setDraft] = useState(name);
  const [closes, setCloses] = useState(0);
  const headingId = useId();
  const { pathname } = useLocation();
  return (
    <Example
      label="Modal urlParam — an edit dialog that survives reload"
      hint={<>{code('urlParam="edit"')} · opened with {code('useDialogParam("edit")')}</>}
    >
      <Row>
        <Button
          variant="brand"
          onClick={() => {
            setDraft(name);
            setOpen(true);
          }}
        >
          Edit “{name}”
        </Button>
        <Link to={`${pathname}?edit=1`} className="text-sm text-[var(--brand)] underline underline-offset-2">
          A plain link to ?edit=1
        </Link>
        <span className="font-mono text-xs text-[var(--text-secondary)]">
          open={String(open)} · onClose ran {closes}×
        </span>
      </Row>
      <Modal urlParam="edit" labelledBy={headingId} className="space-y-3" onClose={() => setCloses((n) => n + 1)}>
        <h4 id={headingId} className="text-sm font-semibold text-[var(--text-primary)]">
          Rename the unit
        </h4>
        <Input label="Name" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <Row className="justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="brand"
            onClick={() => {
              setName(draft.trim() || name);
              setOpen(false);
            }}
          >
            Save
          </Button>
        </Row>
      </Modal>
      <div className="mt-3 space-y-2">
        <QueryReadout />
        <Note>
          Open it and reload — it is still open, because {code("?edit=1")} is the only state it has (
          {code("open")} is ignored under {code("urlParam")}). Press the browser&apos;s Back: the dialog
          closes by leaving the entry its opener pushed, and Forward opens it again. Escape, the backdrop or
          Cancel go <em>back</em> over that entry rather than adding a second one, so closing leaves the
          history as it was.
        </Note>
        <Note>
          The plain link (or a reload, or a shared link) arrives with the dialog already open: there is no
          entry of ours to go back over, so its close removes the param in place, and Back from there leaves
          the page as it should.
        </Note>
      </div>
    </Example>
  );
}

function SharedDialogParamDemo() {
  const [inviteOpen, setInviteOpen] = useDialogParam({ key: "dialog", value: "invite" });
  const [archiveOpen, setArchiveOpen] = useDialogParam({ key: "dialog", value: "archive" });
  const inviteId = useId();
  const archiveId = useId();
  return (
    <Example
      label="useDialogParam — several dialogs on one param"
      hint={code('{ key: "dialog", value: "invite" | "archive" }')}
    >
      <Row>
        <Button variant="secondary" onClick={() => setInviteOpen(true)}>
          Invite a tenant
        </Button>
        <Button variant="secondary" tone="danger" onClick={() => setArchiveOpen(true)}>
          Archive the unit
        </Button>
        <span className="font-mono text-xs text-[var(--text-secondary)]">
          invite={String(inviteOpen)} · archive={String(archiveOpen)}
        </span>
      </Row>
      <Modal
        urlParam={{ key: "dialog", value: "invite" }}
        labelledBy={inviteId}
        className="space-y-3"
        onClose={() => {}}
      >
        <h4 id={inviteId} className="text-sm font-semibold text-[var(--text-primary)]">
          Invite a tenant
        </h4>
        <Input label="Email" type="email" placeholder="name@example.com" />
        <Row className="justify-end">
          <Button variant="brand" onClick={() => setInviteOpen(false)}>
            Send invite
          </Button>
        </Row>
      </Modal>
      <Modal
        urlParam={{ key: "dialog", value: "archive" }}
        labelledBy={archiveId}
        role="alertdialog"
        className="space-y-3"
        onClose={() => {}}
      >
        <h4 id={archiveId} className="text-sm font-semibold text-[var(--text-primary)]">
          Archive Flat 3B?
        </h4>
        <p className="text-sm text-[var(--text-secondary)]">It leaves every list but keeps its history.</p>
        <Row className="justify-end">
          <Button variant="secondary" onClick={() => setArchiveOpen(false)}>
            Keep
          </Button>
          <Button variant="brand" tone="danger" onClick={() => setArchiveOpen(false)}>
            Archive
          </Button>
        </Row>
      </Modal>
      <div className="mt-3 space-y-2">
        <QueryReadout />
        <Note>
          A page with several dialogs spends one param on all of them — {code("?dialog=invite")} or{" "}
          {code("?dialog=archive")}, never both — which is also a readable deep link to each. The setters
          work without a Modal too: anything that opens and closes can hold its state here.
        </Note>
      </div>
    </Example>
  );
}
