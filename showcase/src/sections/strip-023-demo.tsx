import { useState } from "react";
import { Coffee, Crosshair, Home, MapPin, Search, ShoppingCart, Star } from "lucide-react";
import {
  Button,
  FieldHint,
  FieldStrip,
  IconPicker,
  Input,
  SwatchPicker,
  Switch,
  TILE_SIZE,
  TileRadioGroup,
  ToggleGroup,
} from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * 0.23.0: the label strip on its own (keksdose G8) and a lock reason per option on the
 * tile pickers (the kit's later list). Two specimens: `FieldStrip023Demo` (page:
 * fields) and `TileLock023Demo` (page: choices). Every value is synthetic.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

const STATUSES = [
  { value: "open", label: "Open" },
  { value: "cleared", label: "Cleared" },
];
const FLAGS = [
  { value: "red", label: "Red", color: "var(--danger)" },
  { value: "amber", label: "Amber", color: "var(--warning)" },
  { value: "green", label: "Green", color: "var(--success)" },
];
const PATTERNS = [
  { key: "dots", label: "Dots" },
  { key: "lines", label: "Lines" },
  { key: "grid", label: "Grid" },
] as const;
type Pattern = (typeof PATTERNS)[number]["key"];

/** A stand-in for an app's map: the strip does not care what the content is. */
function MapPlaceholder({ pinned }: { pinned: boolean }) {
  return (
    <div
      aria-hidden
      className="flex h-28 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-muted)]"
    >
      <MapPin className={pinned ? "size-6 text-[var(--danger)]" : "size-5"} />
    </div>
  );
}

/* ── FieldStrip — page: fields ─────────────────────────────────────────── */

export function FieldStrip023Demo() {
  const [status, setStatus] = useState("open");
  const [flag, setFlag] = useState<string | null>("amber");
  const [pinned, setPinned] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [pattern, setPattern] = useState<Pattern>("dots");
  return (
    <>
      <Example label="FieldStrip — the strip label for content of your own" hint="a map and buttons on the label line of the fields beside it">
        <div className="flex flex-col gap-3">
          <Switch
            checked={readOnly}
            onCheckedChange={setReadOnly}
            label="Read-only row (the strip dims its label; the content drops its buttons)"
          />
          <div className="grid items-start gap-3 md:grid-cols-4">
            <Input label="Memo" defaultValue="Coffee beans" />
            <ToggleGroup label="Status" labelPlacement="strip" value={status} onChange={setStatus} options={STATUSES} />
            <SwatchPicker label="Flag" size="sm" allowNone value={flag} onChange={setFlag} options={FLAGS} />
            <FieldStrip
              label="Location"
              hint={<FieldHint label="Stored with the row, never shared" />}
              disabled={readOnly}
            >
              <div className="space-y-2">
                {pinned && <MapPlaceholder pinned />}
                {!readOnly && (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setPinned(true)}>
                      <Crosshair aria-hidden className="size-3.5" />
                      Locate me
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setPinned(true)}>
                      <Search aria-hidden className="size-3.5" />
                      Search
                    </Button>
                    {pinned && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setPinned(false)}>
                        Remove
                      </Button>
                    )}
                  </div>
                )}
                {readOnly && !pinned && <p className="text-sm text-[var(--text-muted)]">No location</p>}
              </div>
            </FieldStrip>
          </div>
        </div>
        <Note>
          The four labels share one line. The location cell is a {code("role=\"group\"")} named by its label, so a
          screen reader entering &ldquo;Locate me&rdquo; hears &ldquo;Location, group&rdquo; first. Its content
          starts 20px down ({code('pad="clear"')}, the default) like the swatches; {code('pad="field"')} is the 16px
          strip the status group uses, where the strip plus a 26px bordered group is a labelled Input&apos;s 42px. A
          text {code("hint")} becomes a caption under the content, an {code("error")} a message, both describing the
          group.
        </Note>
      </Example>
      <Example label="FieldStrip group={false}" hint="content that is a labelled group itself takes the label's id">
        <div className="grid items-start gap-3 md:grid-cols-3">
          <Input label="Card name" defaultValue="Example Ltd" />
          <FieldStrip label="Pattern" group={false} hint="Printed on the card's back.">
            {({ labelId, describedBy }) => (
              <div role="radiogroup" aria-labelledby={labelId} aria-describedby={describedBy} className="flex gap-1.5">
                <TileRadioGroup
                  items={[...PATTERNS]}
                  checked={pattern}
                  onSelect={(key) => key && setPattern(key)}
                  size="sm"
                  renderTile={(item) => (
                    <span aria-hidden className={`font-mono text-micro ${TILE_SIZE.sm.glyph}`}>
                      {item.key === "dots" ? "∴" : item.key === "lines" ? "≡" : "#"}
                    </span>
                  )}
                />
              </div>
            )}
          </FieldStrip>
        </div>
        <Note>
          A {code("radiogroup")} inside a group of the same name would be read twice, so {code("group={false}")}{" "}
          leaves the wrapper a plain box and the render prop hands the content {code("labelId")} and{" "}
          {code("describedBy")} (the caption&apos;s and the error&apos;s ids).
        </Note>
      </Example>
    </>
  );
}

/* ── per-option disabledReason — page: choices ─────────────────────────── */

const CATEGORY_COLOURS = [
  { value: "teal", label: "Teal", color: "var(--hue-teal)" },
  { value: "indigo", label: "Indigo", color: "var(--hue-indigo)", disabledReason: "Used by Groceries — each category has its own colour." },
  { value: "orange", label: "Orange", color: "var(--hue-orange)" },
  { value: "purple", label: "Purple", color: "var(--hue-purple)", disabled: true, disabledReason: "Reserved for overdue bills." },
];
const SYMBOLS = [
  { value: "home", label: "Home", icon: Home },
  { value: "cart", label: "Shopping", icon: ShoppingCart, disabledReason: "Only the household owner can use this symbol." },
  { value: "coffee", label: "Coffee", icon: Coffee },
  { value: "star", label: "Favourite", icon: Star },
];

export function TileLock023Demo() {
  const [colour, setColour] = useState<string | null>("teal");
  const [symbol, setSymbol] = useState<string | null>("home");
  return (
    <Example label="SwatchPicker / IconPicker: one option locked, with its reason" hint="disabledReason on an option: reachable, aria-disabled, says why">
      <div className="grid items-start gap-3 md:grid-cols-2">
        <SwatchPicker label="Colour" value={colour} onChange={setColour} options={CATEGORY_COLOURS} />
        <IconPicker label="Symbol" value={symbol} onChange={setSymbol} options={SYMBOLS} />
      </div>
      <Note>
        Indigo, Purple and Shopping are locked. Hover one, or walk onto it with the arrow keys: its bubble says why
        under its name, and a screen reader reads the reason as its description. Choosing it does nothing — the
        focus moves, the checked tile stays. A plain {code("disabled")} tile is skipped by the keyboard and cannot
        say why; with a {code("disabledReason")} it stays reachable ({code("disabled")} + a reason, as on Purple,
        is still reachable).
      </Note>
    </Example>
  );
}
