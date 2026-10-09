import { useId, useState } from "react";
import { BookOpen, Eye, Flag, FlaskConical, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import {
  Button,
  DatePicker,
  FieldHint,
  Input,
  RowActions,
  Select,
  TextSizeSetting,
  Textarea,
  ToggleGroup,
  resolveTextSize,
  useTextSize,
} from "@eifi1/ui-kit";
import type { RowActionList, RowActionsCollapse } from "@eifi1/ui-kit";
import { useTextSizeStore } from "../stores";
import { Example, Note } from "../lib/section";

/**
 * TEXT SIZE, 0.33 (docs/text-size-harmonization.md §10.16–§10.18): a row action carries
 * its state — a toggle, a disclosure, a tone, a tour anchor — at every size; and at Large
 * a field's floating label stands above the field, with `truncate-until-large` the one
 * name for "truncate at Normal, wrap at Large". Belongs on the "Text size & contrast"
 * page, after text-size-components-032-demo. Ada's garden is SYNTHETIC.
 */

const code = (s: string) => <code className="font-mono [overflow-wrap:anywhere]">{s}</code>;
const READOUT = "font-mono text-xs text-secondary [overflow-wrap:anywhere]";

/** The page's own text size, from the top bar's store — the same switch as above. */
function PageSize() {
  const device = useTextSizeStore((s) => s.size);
  const setSize = useTextSizeStore((s) => s.setSize);
  const { size } = useTextSize();
  return (
    <div className="grid gap-1">
      <TextSizeSetting label="This page's text size" labelPlacement="above" value={resolveTextSize(device)} onChange={setSize} />
      <p className="text-xs text-muted">In force: {code(size)}.</p>
    </div>
  );
}

/* ── RowActions: state, tones, a tour anchor (§10.16, §10.18) ──────────────── */

const TOUR = "showcase-soil-check";

export function RowActions033Demo() {
  const [collapse, setCollapse] = useState<RowActionsCollapse>("auto");
  const [watched, setWatched] = useState(false);
  const [flagged, setFlagged] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [log, setLog] = useState("Nothing yet.");
  const [anchor, setAnchor] = useState<string | null>(null);
  const shareId = useId();
  const addId = useId();

  const actions: RowActionList = [
    { label: "Watch the bed", icon: Eye, pressed: watched, onSelect: () => setWatched((on) => !on) },
    { label: "Share the bed", icon: Share2, expanded: shareOpen, controls: shareId, onSelect: () => setShareOpen((open) => !open) },
    { label: "Open the planting log", icon: BookOpen, tone: "muted", onSelect: () => setLog("Open the planting log") },
    { label: "Check the soil", icon: FlaskConical, tone: "info", dataTour: TOUR, onSelect: () => setLog("Check the soil") },
    { label: "Flag for the committee", icon: Flag, tone: "warning", pressed: flagged, onSelect: () => setFlagged((on) => !on) },
    { label: "Delete the bed", icon: Trash2, tone: "danger", commit: true, onSelect: () => setLog("Delete the bed") },
  ];

  /** Where `[data-tour=…]` lands — what the kit's tour would point at. */
  const findAnchor = () => {
    const found = document.querySelectorAll(`[data-tour="${TOUR}"]`);
    const el = found[0];
    if (!el) return setAnchor("no match");
    const box = el.closest('[data-slot="row-actions"]');
    const what =
      el.tagName === "SPAN"
        ? `an overlay <span aria-hidden> in the "⋯" box (data-slot="row-actions"), which holds the button: ${String(Boolean(box?.querySelector("button")))}`
        : `the action's own <${el.tagName.toLowerCase()}>, named "${el.getAttribute("aria-label") ?? el.textContent ?? ""}"`;
    setAnchor(`${found.length} match · ${what}`);
  };

  return (
    <Example label="RowActions — pressed, expanded, tones and a tour anchor" hint="a row action carries its state at every size; at Large two or more fold into “⋯”">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <ToggleGroup
            label="collapse"
            value={collapse}
            onChange={setCollapse}
            options={[
              { value: "auto", label: "auto" },
              { value: "inline", label: "inline" },
              { value: "menu", label: "menu" },
            ]}
          />
          <Button variant="secondary" size="sm" onClick={findAnchor}>
            Find [data-tour=&quot;{TOUR}&quot;]
          </Button>
        </div>

        <div className="rounded-md border border-subtle">
          <div className="flex items-center gap-2 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 text-primary">North bed by the greenhouse door</span>
            <RowActions name="North bed" actions={actions} collapse={collapse} tooltipSide="start" />
          </div>
          <div id={shareId} hidden={!shareOpen} className="border-t border-subtle bg-surface-2 px-3 py-2 text-sm text-secondary">
            The share card opens here, under the row — the action says so with aria-expanded.
          </div>
        </div>

        <div className="rounded-md border border-subtle">
          {/* A category group's header strip: smaller buttons, 14 px glyphs (keksdose). */}
          <div className="flex items-center gap-2 bg-surface-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-secondary">
            <span className="min-w-0 flex-1">Vegetables</span>
            <RowActions
              name="Vegetables"
              size="sm"
              glyphSize={14}
              collapse={collapse}
              actions={[
                { label: "Add a category", icon: Plus, expanded: addOpen, controls: addId, onSelect: () => setAddOpen((open) => !open) },
                { label: "Rename the group", icon: Pencil, tone: "muted", commit: true, onSelect: () => setLog("Rename the group") },
              ]}
            />
          </div>
          <div id={addId} hidden={!addOpen} className="px-3 py-2">
            <Input label="New category" placeholder="e.g. Brassicas" />
          </div>
        </div>

        <ul className={`space-y-0.5 ${READOUT}`} aria-live="polite">
          <li>
            watched: {String(watched)} · flagged: {String(flagged)} · share open: {String(shareOpen)} · last: {log}
          </li>
          <li>anchor: {anchor ?? "press “Find” — then switch collapse and press it again"}</li>
        </ul>
      </div>
      <Note>
        A toggle is `pressed` — `aria-pressed` and IconButton&apos;s &ldquo;on&rdquo; look inline, `aria-pressed` on
        the menu entry — and keeps its label in both states. Something the action opens in the page is
        `expanded` with `controls` (`aria-expanded`, `aria-controls`), never with `pressed`. The tones `muted`,
        `info` and `warning` join `danger`: inline they are IconButton&apos;s, in the menu the glyph takes the tone
        and the words keep the text colour (danger keeps its red words). `dataTour` lands on ONE element per
        action at a time: inline on the action&apos;s own control; collapsed on an `aria-hidden` overlay in the
        &ldquo;⋯&rdquo;&apos;s `data-slot="row-actions"` box, so the selector resolves to a box the size of the
        button and a tap still reaches it; never on the entry in the open menu, which is portalled after the row
        and would only make the selector match twice. `glyphSize` and `tooltipSide` (&ldquo;start&rdquo; in a
        table&apos;s last column) are the row&apos;s; `rowActionsColumn` passes both through.
      </Note>
    </Example>
  );
}

/* ── Fields at Large: the label above (§10.17) ─────────────────────────────── */

export function LabelAbove033Demo() {
  const [date, setDate] = useState("2026-10-09");
  return (
    <Example label="Fields at Large — the label above the field" hint="pick Large or Extra large: every floating label stands above its field and wraps">
      <div className="space-y-4">
        <PageSize />
        {/* `grid-cols-1`, not the implicit column: an implicit track is sized to its
            widest item, and the w-64 field below is 384 px at Extra large — wider than a
            phone — so every field ran past the screen. A minmax(0, 1fr) track holds. */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Payment reference"
            defaultValue="RF18 5390 0754 7034"
            hint={<FieldHint label="The number on the paying-in slip" />}
          />
          <Select label="Account the standing order is paid from" defaultValue="household">
            <option value="household">Household</option>
            <option value="allotment">Allotment association</option>
          </Select>
          <DatePicker label="First booking date" value={date} onChange={setDate} />
          <Textarea label="Notes for the allotment committee" defaultValue="The shed key is with Ben until Friday." />
          {/* The case the size sweep found (fields.tsx): a w-64 field whose floating
              label read "Payment r…" at Extra large. Above the field it wraps. */}
          <div className="w-64 max-w-full">
            <Input label="Payment reference of the standing order" hint={<FieldHint label="From the bank's letter" />} />
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted">{code("truncate-until-large")}, in a 12rem box:</p>
          <p className="w-48 max-w-full truncate-until-large rounded-md border border-subtle px-2 py-1 text-sm text-primary">
            Sow the second sweetcorn batch in the cold frame by the shed
          </p>
        </div>
      </div>
      <Note>
        At Normal the label floats in the field&apos;s top strip, as it always has. At Large and Extra large it
        is a static label above the field — the phone card&apos;s &ldquo;label above value&rdquo; — so it wraps
        like any text and the field no longer reserves its height. Every floating-label field in every app shows
        it at Large without a change (keksdose re-anchors one Skeleton that was placed from the strip).
        `truncate-until-large` is the one name for &ldquo;truncate at Normal, wrap at Large&rdquo; (`overflow-wrap:
        anywhere`) — it replaced five copies in the kit, and it follows the attribute in CSS, so an app&apos;s{" "}
        {code('!large && "truncate"')} can go. The size sweep (`scripts/screenshot-sizes.mjs`) now reports a
        one-line ellipsis that cuts at Large, and a pinned box taller than half the screen: report-only in 0.33,
        gating from 0.34; `data-truncate-ok` marks a deliberate one, never on a name or an email.
      </Note>
    </Example>
  );
}
