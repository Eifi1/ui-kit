import { useEffect, useRef, useState } from "react";
import { Camera, Check, CloudCheck, RefreshCw, Save, TriangleAlert, WifiOff } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  IconButton,
  Spinner,
  ToggleGroup,
} from "@eifi1/ui-kit";
import type { CardTone, IconButtonGlyphSize } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row, Stage } from "../lib/section";

/**
 * The 0.12 props on the building blocks: Button `pending`, Card `tone`, Spinner
 * `showLabel` / `labelPosition`, and IconButton `glyphSize`, `badge`,
 * `disabledStyle="keep"` and the 64px `size="2xl"` camera shutter.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

/* ── Button pending ───────────────────────────────────────────────────────── */

function ButtonPending() {
  const [pending, setPending] = useState(false);
  const [saves, setSaves] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const save = () => {
    setAttempts((n) => n + 1);
    setPending(true);
    timer.current = setTimeout(() => {
      setPending(false);
      setSaves((n) => n + 1);
    }, 1800);
  };
  return (
    <Example label="Button — pending" hint="a save in flight: spinner over the label, aria-busy, no second submit">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Row>
          <Button type="submit" pending={pending}>
            <Save className="size-4" />
            Save changes
          </Button>
          <Button type="button" variant="secondary" pending={pending} onClick={save}>
            Secondary
          </Button>
          <Button type="button" variant="ghost" pending>
            Always pending
          </Button>
        </Row>
      </form>
      <OutTable
        rows={[
          ["pending", String(pending)],
          ["handler calls that got through", String(attempts)],
          ["saves finished", String(saves)],
        ]}
      />
      <div className="mt-3">
        <Note>
          Click &ldquo;Save changes&rdquo; and then click it again (or press Enter) while it spins: the second press is
          swallowed, so the counters rise by one per save. The label stays under the spinner, so the button keeps its
          width and its accessible name. It is {code("aria-disabled")}, not {code("disabled")}, so focus stays on it.
        </Note>
      </div>
    </Example>
  );
}

/* ── Card tone ────────────────────────────────────────────────────────────── */

const CARD_TONES: Array<{ tone: CardTone; title: string; body: string }> = [
  { tone: "warning", title: "Dunning: second reminder", body: "Payment is 21 days overdue. A fee of €5 is due." },
  { tone: "danger", title: "Direct debit returned", body: "The bank returned the last payment. Update the mandate." },
  { tone: "info", title: "Index adjustment due", body: "The rent can be adjusted from 1 January." },
  { tone: "success", title: "Paid in full", body: "All invoices for 2026 are settled." },
];

function CardTones() {
  const [variant, setVariant] = useState<"default" | "inset">("default");
  return (
    <Example label="Card — tone" hint="a status card: border and title in the tone; an inset card takes the tone's fill">
      <Row className="mb-3">
        <span className="text-xs text-[var(--text-muted)]">variant</span>
        <ToggleGroup<"default" | "inset">
          aria-label="Card variant"
          size="sm"
          value={variant}
          onChange={setVariant}
          options={[
            { value: "default", label: "default" },
            { value: "inset", label: "inset" },
          ]}
        />
      </Row>
      <div className="grid gap-3 sm:grid-cols-2">
        {CARD_TONES.map(({ tone, title, body }) => (
          <Card key={tone} tone={tone} variant={variant}>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{`tone="${tone}"`}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-[var(--text-secondary)]">{body}</CardContent>
          </Card>
        ))}
      </div>
    </Example>
  );
}

/* ── Spinner showLabel ────────────────────────────────────────────────────── */

function SpinnerLabels() {
  return (
    <Example label="Spinner — showLabel and labelPosition" hint="the label as visible text; the ring is then decorative">
      <Stage>
        <div className="flex justify-center">
          <Spinner showLabel />
        </div>
        <div className="flex justify-center">
          <Spinner showLabel label="Loading invoices…" labelPosition="end" />
        </div>
        <div className="flex justify-center">
          <Spinner showLabel label="Fetching the statement" labelPosition="below" className="size-8" />
        </div>
      </Stage>
      <Note>
        {code("showLabel")} draws the label (the kit&apos;s &ldquo;Loading…&rdquo;, translated by the language menu, or
        your {code("label")}) as the status text. {code('labelPosition="end"')} (default) puts it beside the ring,{" "}
        {code('"below"')} centres it underneath for a panel&apos;s loading state; {code("className")} still sizes the
        ring.
      </Note>
    </Example>
  );
}

/* ── IconButton glyphSize + badge + disabledStyle ─────────────────────────── */

type Sync = "synced" | "syncing" | "offline" | "error";

const SYNC: Record<Sync, { label: string; color: string; icon: typeof CloudCheck; badge?: typeof Check }> = {
  synced: { label: "All changes synced — sync now", color: "var(--success)", icon: CloudCheck, badge: Check },
  syncing: { label: "Syncing…", color: "var(--brand)", icon: RefreshCw },
  offline: { label: "Offline — changes are queued", color: "var(--text-muted)", icon: WifiOff },
  error: { label: "Sync failed — retry", color: "var(--danger)", icon: CloudCheck, badge: TriangleAlert },
};

const GLYPHS: IconButtonGlyphSize[] = [12, 14, 16, 20, 24, 28];

function SyncChip() {
  const [state, setState] = useState<Sync>("synced");
  const [glyph, setGlyph] = useState<IconButtonGlyphSize>(20);
  const [presses, setPresses] = useState(0);
  const { label, color, icon: Icon, badge: Badge } = SYNC[state];
  const disabled = state === "syncing" || state === "offline";
  return (
    <Example
      label="IconButton — glyphSize, badge and disabledStyle"
      hint="keksdose's sync chip: a 24px round chip round a 20px cloud, a check on its corner"
    >
      <Row className="mb-3">
        <span className="text-xs text-[var(--text-muted)]">state</span>
        <ToggleGroup<Sync>
          aria-label="Sync state"
          size="sm"
          value={state}
          onChange={setState}
          options={(["synced", "syncing", "offline", "error"] as const).map((s) => ({ value: s, label: s }))}
        />
        <span className="text-xs text-[var(--text-muted)]">glyphSize</span>
        <ToggleGroup<string>
          aria-label="Glyph size"
          size="sm"
          value={String(glyph)}
          onChange={(v) => setGlyph(Number(v) as IconButtonGlyphSize)}
          options={GLYPHS.map((g) => ({ value: String(g), label: String(g) }))}
        />
      </Row>
      <Stage>
        <div className="flex flex-col items-center gap-2">
          <IconButton
            size="2xs"
            shape="round"
            glyphSize={glyph}
            label={label}
            disabled={disabled}
            disabledStyle="keep"
            badge={Badge ? <Badge style={{ color }} /> : undefined}
            style={{ color }}
            onClick={() => setPresses((n) => n + 1)}
          >
            <Icon className={state === "syncing" ? "motion-safe:animate-spin" : undefined} />
          </IconButton>
          <span className="text-xs text-[var(--text-muted)]">disabledStyle=&quot;keep&quot;</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <IconButton
            size="2xs"
            shape="round"
            glyphSize={glyph}
            label={label}
            disabled={disabled}
            badge={Badge ? <Badge style={{ color }} /> : undefined}
            style={{ color }}
            onClick={() => setPresses((n) => n + 1)}
          >
            <Icon className={state === "syncing" ? "motion-safe:animate-spin" : undefined} />
          </IconButton>
          <span className="text-xs text-[var(--text-muted)]">disabledStyle=&quot;dim&quot; (default)</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <IconButton size="2xs" shape="round" label="2xs without glyphSize" style={{ color }}>
            <Icon />
          </IconButton>
          <span className="text-xs text-[var(--text-muted)]">2xs alone: 14px glyph</span>
        </div>
      </Stage>
      <OutTable
        rows={[
          ["disabled", String(disabled)],
          ["presses", String(presses)],
          ["badge", Badge ? (state === "synced" ? "Check" : "TriangleAlert") : "none"],
        ]}
      />
      <div className="mt-3">
        <Note>
          {code("glyphSize")} sets the icon in px over the box&apos;s own ({code("2xs")} alone draws 14px). The{" "}
          {code("badge")} sits on the corner, outside the {code("<button>")}, so a bare {code("<Check />")} stays 12px
          whatever the glyph; it is decorative, and the name carries the state. Switch to &ldquo;syncing&rdquo; or
          &ldquo;offline&rdquo;: both buttons are disabled, but {code('disabledStyle="keep"')} keeps the full colour and
          an ordinary cursor — the status still reads — while the default dims it to half.
        </Note>
      </div>
    </Example>
  );
}

/* ── IconButton 2xl shutter ───────────────────────────────────────────────── */

/** A dark "viewfinder": a gradient standing in for a live camera picture. */
const VIEWFINDER =
  "radial-gradient(ellipse at 30% 35%, #5b6b7a 0%, #2c3640 35%, #11161b 70%), linear-gradient(160deg, #1f2a33, #07090b)";

function Shutter() {
  const [shots, setShots] = useState(0);
  const [flash, setFlash] = useState(false);
  const shoot = () => {
    setShots((n) => n + 1);
    setFlash(true);
    setTimeout(() => setFlash(false), 120);
  };
  return (
    <Example
      label="IconButton — size 2xl, variant shutter"
      hint="a 64px camera release over the viewfinder, white ink on a dark scrim in both themes"
    >
      <div
        role="img"
        aria-label="Camera viewfinder (simulated)"
        className="relative mx-auto flex aspect-[3/4] w-full max-w-72 items-end justify-center overflow-hidden rounded-lg pb-6"
        style={{ background: VIEWFINDER }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-6 rounded-md border border-white/30"
        />
        {flash && <div aria-hidden className="pointer-events-none absolute inset-0 bg-white/70" />}
        <span className="absolute start-3 top-3 rounded bg-black/50 px-2 py-0.5 font-mono text-xs text-white">
          {shots} photo{shots === 1 ? "" : "s"}
        </span>
        <div className="relative flex items-center gap-6">
          <IconButton variant="shutter" size="2xl" label="Take photo" onClick={shoot}>
            <Camera />
          </IconButton>
          <IconButton variant="shutter" size="2xl" label="Take photo (disabled)" disabled>
            <Camera />
          </IconButton>
        </div>
      </div>
      <div className="mt-3">
        <Note>
          {code('size="2xl"')} is a 64px box with a 28px glyph. {code('variant="shutter"')} uses the media tokens (
          {code("--media-ink")}, {code("--media-scrim")}), which stay white on dark in both themes — flip the theme and
          the ring does not turn dark on the dark picture. The second is disabled.
        </Note>
      </div>
    </Example>
  );
}

export function Buttons012() {
  return (
    <>
      <ButtonPending />
      <CardTones />
      <SpinnerLabels />
      <SyncChip />
      <Shutter />
    </>
  );
}
