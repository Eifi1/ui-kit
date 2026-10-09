import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Card, Checkbox, cn, contrast } from "@eifi1/ui-kit";
import type { Rgb } from "@eifi1/ui-kit";
// `@eifi1/ui-kit/testing` in an app. The showcase maps only the main entry and its
// sub-paths `rhf`, `dates` and `table-text` (alias.ts and tsconfig.json's `paths`), so
// the entry is reached by its file here — the code shown beside the specimen uses the
// package name an app writes.
import { KIT_CSS_VARIABLES, undeclaredCssVariables } from "../../../src/testing";
import type { UndeclaredCssVariablesOptions } from "../../../src/testing";
import { Example, Note, OutTable } from "../lib/section";
import { useActiveTokenSet, useTheme } from "../stores";

/**
 * COLOUR ROLES (0.33, docs/colour-roles-harmonization.md): every fill with the
 * foreground it names, each tone as text, wash and line, the strong lines, the well on a
 * card, the hover rule, the role utilities that replace `text-[var(--…)]`, and the guard
 * an app runs against a variable nothing declares (`@eifi1/ui-kit/testing`, §8).
 *
 * Every ratio on this page is MEASURED in the browser, from what is on screen — the
 * active palette, mode and contrast level — not copied from the contract's tables. Flip
 * the theme, the palette or More contrast in the top bar and the figures move. In the
 * jsdom test run there is no canvas to resolve a colour with, so they read "—".
 *
 * New code here uses the role utilities (`text-muted`, `bg-surface`, `border-subtle`),
 * never `[var(--…)]` — the page is their specimen.
 */

const code = (s: string) => <code className="font-mono [overflow-wrap:anywhere]">{s}</code>;

/* ── Measuring what is on screen ───────────────────────────────────────────── */

interface Rgba extends Rgb {
  /** 0–1. */
  a: number;
}

let probe: CanvasRenderingContext2D | null | undefined;

/**
 * Any colour a computed style can hold — `rgb()`, `color(srgb …)`, the `oklab()` a
 * color-mix resolves to — as sRGB, through a 1×1 canvas: the browser's own parser, so
 * this file carries none. null where there is no canvas (jsdom answers null).
 */
function resolveColour(css: string): Rgba | null {
  if (probe === undefined) {
    probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  }
  if (!probe || !css) return null;
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "#000";
  probe.fillStyle = css;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
  return { r, g, b, a: a / 255 };
}

/** `top` laid over an opaque `bottom`. */
function over(top: Rgba, bottom: Rgba): Rgba {
  const mix = (t: number, b: number) => t * top.a + b * (1 - top.a);
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: 1 };
}

/**
 * The colour actually behind an element: its own background and every translucent one
 * above it up to the first opaque ancestor, composited — a dark theme's washes and the
 * kit's 7 % hover ink are translucent, and a ratio against them alone would be wrong.
 */
function groundOf(el: Element | null): Rgba | null {
  const layers: Rgba[] = [];
  for (let node = el; node; node = node.parentElement) {
    const colour = resolveColour(getComputedStyle(node).backgroundColor);
    if (!colour) return null;
    if (colour.a > 0) layers.push(colour);
    if (colour.a >= 0.999) break;
  }
  return layers.reverse().reduce<Rgba>((below, layer) => over(layer, below), { r: 255, g: 255, b: 255, a: 1 });
}

type Measure = "text" | "line";

/** An element's text against its ground, or its border against its ground. */
function ratioOf(el: HTMLElement, measure: Measure): number | null {
  const ground = groundOf(el);
  const ink = resolveColour(getComputedStyle(el)[measure === "text" ? "color" : "borderTopColor"]);
  return ground && ink ? contrast(over(ink, ground), ground) : null;
}

/** Runs `paint` now and whenever <html> changes: the theme's class, the palette's inline
 *  tokens, `data-contrast`. Returns the disconnect. */
function onHtmlChange(paint: () => void): () => void {
  paint();
  const observer = new MutationObserver(paint);
  observer.observe(document.documentElement, { attributes: true });
  return () => observer.disconnect();
}

const ratioText = (ratio: number | null) => (ratio === null ? "—" : `${ratio.toFixed(2)}:1`);

/**
 * A specimen that measures itself: `className` paints it, and the figure after its
 * children is its text (or its border) against what is behind it. Written into the DOM
 * by an effect rather than kept in state: it is a reading of the page, refreshed when
 * the page's colours change.
 */
function Specimen({
  className,
  style,
  measure = "text",
  children,
}: {
  className: string;
  style?: CSSProperties;
  measure?: Measure;
  children?: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const out = useRef<HTMLSpanElement>(null);
  useEffect(
    () =>
      onHtmlChange(() => {
        if (box.current && out.current) out.current.textContent = ratioText(ratioOf(box.current, measure));
      }),
    [measure],
  );
  return (
    <div ref={box} className={className} style={style}>
      {children}
      <span ref={out} className="block font-mono text-caption tabular-nums" data-ratio>
        —
      </span>
    </div>
  );
}

/** The step between two grounds: a hover against its rest, a well against its card. */
function Step({ rest, hover }: { rest: string; hover: string }) {
  const a = useRef<HTMLDivElement>(null);
  const b = useRef<HTMLDivElement>(null);
  const out = useRef<HTMLSpanElement>(null);
  useEffect(
    () =>
      onHtmlChange(() => {
        const ga = groundOf(a.current);
        const gb = groundOf(b.current);
        if (out.current) out.current.textContent = ga && gb ? ratioText(contrast(ga, gb)) : "—";
      }),
    [],
  );
  return (
    <div className="flex items-center gap-2">
      <div ref={a} className={cn("h-8 w-12 shrink-0 rounded-md border border-subtle", rest)} />
      <span aria-hidden className="text-muted">
        →
      </span>
      <div className={cn("h-8 w-12 shrink-0 rounded-md border border-subtle", rest)}>
        <div ref={b} className={cn("size-full rounded-md", hover)} />
      </div>
      <span ref={out} className="font-mono text-xs tabular-nums text-secondary">
        —
      </span>
    </div>
  );
}

/* ── Every fill and its foreground (§5.1) ─────────────────────────────────── */

interface Fill {
  name: string;
  /** The fill's class — or, for money-net, which has none, its variable. */
  fill: string;
  style?: CSSProperties;
  fg: string;
  /** New in 0.33. */
  added?: boolean;
}

// Literal class strings, so Tailwind finds them when it reads this file.
const FILLS: Fill[] = [
  { name: "brand", fill: "bg-brand", fg: "text-brand-contrast" },
  { name: "danger", fill: "bg-danger", fg: "text-danger-contrast" },
  { name: "warning", fill: "bg-warning", fg: "text-warning-contrast", added: true },
  { name: "success", fill: "bg-success", fg: "text-success-contrast" },
  { name: "info", fill: "bg-info", fg: "text-info-contrast" },
  { name: "neutral", fill: "bg-neutral", fg: "text-neutral-contrast", added: true },
  { name: "money-income", fill: "bg-money-pos", fg: "text-money-income-contrast", added: true },
  { name: "money-expense", fill: "bg-money-neg", fg: "text-money-expense-contrast", added: true },
  // No `.bg-money-net`: the money statics are the three tokens.css always had (§7.2).
  { name: "money-net", fill: "var(--money-net)", style: { backgroundColor: "var(--money-net)" }, fg: "text-money-net-contrast", added: true },
  { name: "money-neutral", fill: "bg-money-neutral", fg: "text-money-neutral-contrast", added: true },
  { name: "hue-blue", fill: "bg-hue-blue", fg: "text-hue-blue-contrast", added: true },
  { name: "hue-indigo", fill: "bg-hue-indigo", fg: "text-hue-indigo-contrast", added: true },
  { name: "hue-purple", fill: "bg-hue-purple", fg: "text-hue-purple-contrast", added: true },
  { name: "hue-teal", fill: "bg-hue-teal", fg: "text-hue-teal-contrast", added: true },
  { name: "hue-orange", fill: "bg-hue-orange", fg: "text-hue-orange-contrast", added: true },
];

function FillsDemo() {
  return (
    <Example label="Every fill and its foreground" hint="`bg-<fill> text-<fill>-contrast` — the label's ratio, measured on screen">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {FILLS.map((f) => (
          <Specimen
            key={f.name}
            className={cn("rounded-md px-3 py-2", f.style ? undefined : f.fill, f.fg)}
            style={f.style}
          >
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-semibold">{f.name}</span>
              {f.added && <span className="text-caption uppercase tracking-wide">0.33</span>}
            </span>
            <span className="block font-mono text-caption [overflow-wrap:anywhere]">
              {f.fill} · {f.fg}
            </span>
          </Specimen>
        ))}
      </div>
      <Note>
        Every fill names its foreground, {code("--<fill>-contrast")}, so a label on a fill is never `text-white`: in
        dark the fills are pastel and the foreground is the tone&apos;s 950 ink, or for money the page colour (the
        brand&apos;s contrast, which the money swatches borrowed until 0.33, fell to 3.3:1 on the derived dark
        presets). `--neutral` is `--text-muted` as a fill under `--text-inverse` — the translation review&apos;s
        reset swipe made official; it steps with More contrast. Chip `solid` and the FloatingAction badge read
        these pairs. `bg-money-net` does not exist: the money fills stay the three plain classes tokens.css always
        had, so the net tile is painted by its variable.
      </Note>
    </Example>
  );
}

/* ── Each tone as text, wash and line (§5.5) ──────────────────────────────── */

interface Tone {
  name: string;
  text: string;
  soft: string;
  line: string;
}

const TONES: Tone[] = [
  { name: "danger", text: "text-danger", soft: "bg-danger-soft", line: "border-danger" },
  { name: "warning", text: "text-warning", soft: "bg-warning-soft", line: "border-warning" },
  { name: "success", text: "text-success", soft: "bg-success-soft", line: "border-success" },
  { name: "info", text: "text-info", soft: "bg-info-soft", line: "border-info" },
  { name: "brand", text: "text-brand-muted", soft: "bg-brand-soft", line: "border-brand" },
  { name: "hue-blue", text: "text-hue-blue", soft: "bg-hue-blue-soft", line: "border-hue-blue" },
  { name: "hue-indigo", text: "text-hue-indigo", soft: "bg-hue-indigo-soft", line: "border-hue-indigo" },
  { name: "hue-purple", text: "text-hue-purple", soft: "bg-hue-purple-soft", line: "border-hue-purple" },
  { name: "hue-teal", text: "text-hue-teal", soft: "bg-hue-teal-soft", line: "border-hue-teal" },
  { name: "hue-orange", text: "text-hue-orange", soft: "bg-hue-orange-soft", line: "border-hue-orange" },
];

const GROUNDS = [
  { name: "page", className: "bg-page" },
  { name: "card", className: "bg-surface" },
  { name: "well", className: "bg-surface-2" },
] as const;

const CELL = "rounded-md px-2 py-1.5 text-sm font-medium";

function TonesDemo() {
  return (
    <Example label="Each tone as text, wash and line" hint="status text clears 4.5:1 on the page, the card, the well and its own wash">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-separate border-spacing-1 text-start text-xs">
          <thead>
            <tr className="text-secondary">
              <th scope="col" className="py-1 text-start font-medium">
                tone · text class
              </th>
              {GROUNDS.map((g) => (
                <th key={g.name} scope="col" className="py-1 text-start font-medium">
                  on the {g.name}
                </th>
              ))}
              <th scope="col" className="py-1 text-start font-medium">
                on its wash, with its line
              </th>
            </tr>
          </thead>
          <tbody>
            {TONES.map((t) => (
              <tr key={t.name}>
                <th scope="row" className="py-1 pe-2 text-start align-top font-mono font-normal text-primary">
                  {t.text}
                </th>
                {GROUNDS.map((g) => (
                  <td key={g.name} className="align-top">
                    <Specimen className={cn(CELL, g.className, t.text)}>Aa {t.name}</Specimen>
                  </td>
                ))}
                <td className="align-top">
                  <Specimen className={cn(CELL, "border", t.soft, t.line, t.text)}>{t.soft}</Specimen>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note>
        The light `--warning`, `--success`, `--hue-orange` and `--hue-teal` are darker since 0.33 (#a34800,
        #007152, #b43800, #006f68: the same hue and chroma, the lightness solved): as text they sat at 3.86–4.22:1.
        Dark is unchanged, at 8–13:1. A tone&apos;s wash is {code("bg-<tone>-soft")} (Chip&apos;s word), its line{" "}
        {code("border-<tone>")}; brand&apos;s text is `text-brand-muted`, which the deriver now holds at 4.5:1 too.
      </Note>
    </Example>
  );
}

/* ── The strong lines (§5.2) ──────────────────────────────────────────────── */

const LINES = [
  { name: "border-warning-strong", note: "new" },
  { name: "border-danger-strong", note: "louder in light" },
  { name: "border-strong", note: "--border-strong" },
  { name: "border-subtle", note: "--border, a hairline" },
] as const;

function LinesDemo() {
  return (
    <Example label="The strong lines" hint="`border-warning-strong` is new; the light `border-danger-strong` went from 2.07 to 3.6:1">
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] border-separate border-spacing-1 text-start text-xs">
            <thead>
              <tr className="text-secondary">
                <th scope="col" className="py-1 text-start font-medium">
                  line
                </th>
                {GROUNDS.map((g) => (
                  <th key={g.name} scope="col" className="py-1 text-start font-medium">
                    on the {g.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LINES.map((line) => (
                <tr key={line.name}>
                  <th scope="row" className="py-1 pe-2 text-start align-top font-normal text-primary">
                    <span className="block font-mono">{line.name}</span>
                    <span className="text-muted">{line.note}</span>
                  </th>
                  {GROUNDS.map((g) => (
                    <td key={g.name} className="align-top">
                      <Specimen measure="line" className={cn("rounded-md border-2 px-2 py-1.5 text-primary", g.className, line.name)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card tone="warning" toneStrength="strong" padding="sm">
            <p className="text-sm text-primary">
              {code('Card tone="warning" toneStrength="strong"')} — its 2px frame is {code("--warning-border-strong")}.
            </p>
          </Card>
          <Card tone="danger" toneStrength="strong" padding="sm">
            <p className="text-sm text-primary">{code('Card tone="danger" toneStrength="strong"')}</p>
          </Card>
        </div>
      </div>
      <Note>
        The two status lines clear 3:1 on every surface. `--warning-border-strong` is the warning text colour in
        light (amber-600 would be 2.5:1) and amber-600 in dark, where `--warning` stood 13:1 off the card and
        shouted; IconButton&apos;s warning focus ring and Card&apos;s strong warning frame use it. The light danger
        line went from rose-400 (2.07:1, where its comment claimed 3) to rose-600. `border-strong` is the neutral
        strong line — the selected row&apos;s outline — and `border-subtle` the hairline, decorative at standard
        contrast; More contrast steps both. Every ratio is the line against the ground it is drawn on.
      </Note>
    </Example>
  );
}

/* ── The well on a card (§5.3, §12.1) ─────────────────────────────────────── */

function ZebraList() {
  return (
    <ul className="overflow-hidden rounded-md text-sm text-primary">
      {["North bed", "Herb spiral", "South border", "Cold frame"].map((bed) => (
        <li key={bed} className="px-3 py-1.5 even:bg-surface-2">
          {bed}
        </li>
      ))}
    </ul>
  );
}

function WellDemo() {
  const tokens = useActiveTokenSet();
  const mode = useTheme((s) => s.mode);
  const ratio = (a: string, b: string) => `${contrast(a, b).toFixed(2)}:1`;
  return (
    <Example label="The well on a card" hint="light `--bg-surface-2` is the page colour since 0.33 — a well reads on a card">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs text-muted">On a card — zebra rows and {code('Card variant="inset"')}</p>
          <Card padding="sm" className="space-y-3">
            <ZebraList />
            <Card variant="inset" padding="sm">
              <p className="text-sm text-secondary">An inset panel: the well.</p>
            </Card>
          </Card>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted">The same, straight on the page</p>
          <div className="space-y-3 rounded-lg bg-page p-3">
            <ZebraList />
            <Card variant="inset" padding="sm">
              <p className="text-sm text-secondary">An inset panel on the page.</p>
            </Card>
          </div>
        </div>
      </div>
      <OutTable
        rows={[
          [`well / card  (${mode})`, ratio(tokens.bgSurface2, tokens.bgSurface)],
          [`card / page  (${mode})`, ratio(tokens.bgSurface, tokens.bgPage)],
          [`well / page  (${mode})`, ratio(tokens.bgSurface2, tokens.bgPage)],
        ]}
      />
      <Note>
        Before 0.33 the light well stood 1.02–1.05:1 off the card — invisible, and with it the kit&apos;s zebra
        rows, DataTable&apos;s header bands and Kurvenschmiede&apos;s selected rows. Now a well stands out from the
        card exactly as much as the card does from the page; dark keeps its 1.11–1.13. Nothing re-solved: every
        text role was already audited against the page. The price is on the right — a well straight on the page
        vanishes in light, so `Card variant="inset"` and a {code("DataTable frame={false}")} belong inside a card.
      </Note>
    </Example>
  );
}

/* ── Hovers (§12.2, §12.10) ───────────────────────────────────────────────── */

const ROWS = ["Seed potatoes", "Runner beans", "Garlic"];

function HoverDemo() {
  return (
    <Example label="Hovers" hint="a row on the card hovers to `bg-hover`; a row on a well hovers to the card">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <p className="text-xs text-muted">On the card: {code("hover:bg-hover")}</p>
          <ul className="rounded-md border border-subtle text-sm text-primary">
            {ROWS.map((row) => (
              <li key={row} className="px-3 py-1.5 hover:bg-hover">
                {row}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted">On a well: {code("hover:bg-surface")}</p>
          <ul className="rounded-md bg-surface-2 text-sm text-primary">
            {ROWS.map((row) => (
              <li key={row} className="px-3 py-1.5 hover:bg-surface">
                {row}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted">Selected (the well marks it): an outline</p>
          <ul className="rounded-md border border-subtle text-sm text-primary">
            {ROWS.map((row, i) => (
              <li
                key={row}
                aria-current={i === 1 ? "true" : undefined}
                className={cn(
                  "px-3 py-1.5",
                  i === 1
                    ? "bg-surface-2 hover:bg-surface-2 hover:outline hover:-outline-offset-1 hover:outline-strong"
                    : "hover:bg-hover",
                )}
              >
                {row}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-xs text-muted">Rest → hover, measured</p>
          <Step rest="bg-surface" hover="bg-hover" />
          <Step rest="bg-surface-2" hover="bg-surface" />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted">The controls&apos; 7 % ink on the page, the card and the well</p>
          <Step rest="bg-page" hover="bg-inverse/7" />
          <Step rest="bg-surface" hover="bg-inverse/7" />
          <Step rest="bg-surface-2" hover="bg-inverse/7" />
        </div>
      </div>
      <Note>
        The rule: a hover differs from its rest by at least 1.08:1, and every text role on it keeps 4.5:1. On a
        well that left one fill, the card — every fill darker than the light well fails the text half, because the
        page is already the darkest surface the text roles are solved against. A row whose well marks a STATE
        (Kurvenschmiede&apos;s selected rows) keeps its fill and draws a 1px inside outline in `--border-strong`
        ({code("hover:outline-strong")}), an outline because a shadow on a {code("<tr>")} is not painted by every
        engine. Button `secondary` and `ghost` and IconButton&apos;s muted tone hover with a translucent ink,{" "}
        {code("color-mix(in srgb, var(--text-primary) 7%, transparent)")} ({code("bg-inverse/7")} here), which
        reads on any ground: the on-page `--bg-hover` was only 1.04.
      </Note>
    </Example>
  );
}

/* ── The role utilities (§7) ──────────────────────────────────────────────── */

function UtilitiesDemo() {
  return (
    <Example label="Role utilities instead of text-[var(--…)]" hint="one name per role, for its own property only — `text-muted` exists, `bg-muted` does not">
      <OutTable
        rows={[
          ["text-[var(--text-muted)]", "text-muted — and primary, secondary, placeholder, inverse"],
          ["text-[var(--danger)]", "text-danger — warning, success, info, brand, brand-muted, hue-*"],
          ["text-[var(--danger-contrast)]", "text-danger-contrast — every <fill>-contrast"],
          ["bg-[var(--bg-surface)]", "bg-surface — page, surface-2, hover, active, inverse"],
          ["bg-[var(--danger)]", "bg-danger — brand, brand-hover, danger-hover, warning, success, info, neutral, hue-*"],
          ["bg-[var(--danger-bg)]", "bg-danger-soft — each tone's wash; bg-brand-soft, bg-hue-*-soft"],
          ["border-[var(--border)]", "border-subtle (and divide-subtle)"],
          ["border-[var(--border-strong)]", "border-strong"],
          ["border-[var(--danger-border)]", "border-danger — border-danger-strong, border-warning-strong"],
          ["ring-[var(--brand)] · outline-[var(--brand)]", "ring-brand · outline-brand — subtle, strong, danger-strong, warning-strong"],
          ["fill-[var(--bg-surface)] · stroke-[var(--border)]", "fill-surface · stroke-subtle — primary, secondary, muted, surface, subtle, strong"],
          ["text-[var(--media-ink)] · bg-[var(--media-scrim)]", "text-media-ink · bg-media-scrim"],
          ["text-[var(--money-income)]", "text-money-pos — a plain class: no hover:, no dark:"],
        ]}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-subtle bg-surface p-3 text-sm">
        <span className="text-primary">text-primary</span>
        <span className="text-secondary">text-secondary</span>
        <span className="text-muted">text-muted</span>
        <span className="rounded-md bg-surface-2 px-2 py-0.5 text-secondary hover:bg-surface">bg-surface-2, hover:bg-surface</span>
        <span className="rounded-md border border-strong px-2 py-0.5 text-primary">border-strong</span>
        <span className="rounded-md bg-danger-soft px-2 py-0.5 text-danger">bg-danger-soft text-danger</span>
        <svg viewBox="0 0 48 20" className="h-5 w-12" aria-hidden>
          <rect x="1" y="1" width="46" height="18" rx="4" className="fill-surface stroke-strong" />
          <path d="M6 14 L16 8 L26 11 L42 4" fill="none" className="stroke-muted" strokeWidth="2" />
        </svg>
      </div>
      <Note>
        They come from one `@theme inline` block in tokens.css. `inline` makes each read its role at the element,
        so a local override still works, and an unused name costs nothing. `hover:`, `md:`, `dark:` and `/60` work
        on every one — `hover:bg-brand` generated nothing while `.bg-brand` was a plain class. The money classes
        stay plain (`.text-money-pos`, `.bg-money-neg` …): a site that needs a variant keeps the `[var()]` form.
        The kit&apos;s own ~1,580 `[var(--role)]` classes stay too, under a ratchet that only lets the count fall
        (`npm run check:tokens`); new and touched code uses the names. In kastlan, `text-primary` is now the ink,
        not its shadcn brand.
      </Note>
    </Example>
  );
}

/* ── The guard: @eifi1/ui-kit/testing (§8) ───────────────────────────────── */

/**
 * A pretend app's source — ten files, the fewest the guard accepts. One reads the
 * token Kurvenschmiede's control diagram painted with, `--surface`, which has never
 * existed (the kit's is `--bg-surface`): black boxes on a public page (F79).
 */
const APP_SOURCES: Record<string, string> = {
  "/src/app.css": [
    "@import \"tailwindcss\";",
    "@import \"@eifi1/ui-kit/tokens.css\";",
    ":root { --app-accent: #0f766e; }",
    ".hb-figure { color: var(--app-accent); }",
  ].join("\n"),
  "/src/features/control/control-basics.tsx": [
    "export function Box() {",
    "  return <rect className=\"fill-[var(--surface)] stroke-[var(--text-primary)]\" />;",
    "}",
  ].join("\n"),
  "/src/features/sync/sync-status.tsx": "const late = \"text-[var(--color-rose-500)]\";",
  "/src/features/charts/totals-chart.tsx": [
    "const config = { total: { label: \"Total\", color: \"var(--chart-1)\" } };",
    "const line = \"stroke-[var(--color-total)]\";",
  ].join("\n"),
  "/src/features/budget/impact-toast.tsx": [
    "el.style.setProperty(\"--tone-from\", from);",
    "const fade = \"bg-[linear-gradient(var(--tone-from),transparent)]\";",
  ].join("\n"),
  "/src/layout/sticky-bar.tsx": [
    "// bottom-[var(--app-nav-h)] would read nothing on the sign-in page",
    "const bar = \"bottom-[var(--app-nav-h,0px)]\";",
    "const sheet = \"pb-[var(--app-nav-h)]\";",
  ].join("\n"),
  "/src/features/accounts/row.tsx": "const muted = \"text-[var(--text-muted)] text-[var(--text-color-muted)]\";",
  "/src/features/landing/hero.tsx": "const accent = \"text-[var(--app-accent)] bg-[var(--brand-bg,#eef)]\";",
  "/src/features/collapsible.tsx": "const h = \"h-[var(--radix-collapsible-content-height)]\";",
  "/src/main.tsx": "createRoot(document.getElementById(\"root\")!).render(<App />);",
};

/** The output of a run, or the guard's refusal. */
function run(sources: Record<string, string>, options: UndeclaredCssVariablesOptions): string[] {
  try {
    const found = undeclaredCssVariables(sources, options);
    return found.length ? found : ["[] — nothing undeclared"];
  } catch (error) {
    return [`throws: ${(error as Error).message}`];
  }
}

const WIRING = `// src/app/css-variables.test.ts — one test file in the app
import { expect, it } from "vitest";
import { undeclaredCssVariables } from "@eifi1/ui-kit/testing";

const sources = import.meta.glob<string>(
  ["/src/**/*.{ts,tsx,css}", "!/src/**/*.test.{ts,tsx}", "!/src/**/__tests__/**"],
  { query: "?raw", import: "default", eager: true },
);

it("reads no CSS variable that nothing declares", () => {
  expect(undeclaredCssVariables(sources)).toEqual([]);
});

// vite.config.ts — Vitest stubs every stylesheet with "" (?raw too) unless listed:
//   test: { css: { include: [/src\\/app\\.css/] } }`;

function GuardDemo() {
  const [refusePalette, setRefusePalette] = useState(false);
  const [checkFallbacks, setCheckFallbacks] = useState(false);
  const [listRadix, setListRadix] = useState(true);
  const runtime = listRadix ? ["--radix-collapsible-content-height"] : [];
  const found = run(APP_SOURCES, { refusePalette, checkFallbacks, runtime });
  const three = Object.fromEntries(Object.entries(APP_SOURCES).slice(0, 3));
  return (
    <Example label="undeclaredCssVariables — @eifi1/ui-kit/testing" hint="the guard an app runs from its own suite: every var(--x) without a fallback must be declared">
      <pre className="overflow-x-auto rounded-md border border-subtle bg-surface-2 p-3 font-mono text-xs text-secondary">
        {WIRING}
      </pre>
      <div className="mt-4 space-y-3">
        <p className="text-sm text-secondary">
          A live run over a pretend app of ten files (the fewest it accepts), in this page:
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Checkbox label="refusePalette" checked={refusePalette} onChange={(e) => setRefusePalette(e.target.checked)} />
          <Checkbox label="checkFallbacks" checked={checkFallbacks} onChange={(e) => setCheckFallbacks(e.target.checked)} />
          <Checkbox
            label={'runtime: ["--radix-collapsible-content-height"]'}
            checked={listRadix}
            onChange={(e) => setListRadix(e.target.checked)}
          />
        </div>
        <ul aria-label="undeclaredCssVariables(sources)" className="space-y-0.5 rounded-md bg-surface-2 p-3 font-mono text-xs text-primary [overflow-wrap:anywhere]">
          {found.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <OutTable
          rows={[
            ["undeclaredCssVariables(threeFiles)", run(three, {})[0]],
            ['KIT_CSS_VARIABLES.has("--text-muted")', String(KIT_CSS_VARIABLES.has("--text-muted"))],
            ['KIT_CSS_VARIABLES.has("--warning-border-strong")', String(KIT_CSS_VARIABLES.has("--warning-border-strong"))],
            ['KIT_CSS_VARIABLES.has("--text-color-muted")', String(KIT_CSS_VARIABLES.has("--text-color-muted"))],
            ['KIT_CSS_VARIABLES.has("--app-nav-h")', String(KIT_CSS_VARIABLES.has("--app-nav-h"))],
            ["KIT_CSS_VARIABLES.size", String(KIT_CSS_VARIABLES.size)],
          ]}
        />
      </div>
      <Note>
        A `var(--x)` that nothing declares, read without a fallback, invalidates its whole declaration: `fill`
        inherits, and Kurvenschmiede&apos;s diagram drew black boxes. The class compiled, the build passed, the
        type checker had no opinion. Declared means: the kit&apos;s tokens (`KIT_CSS_VARIABLES`, generated from
        the installed tokens.css — without the `@theme inline` names, which Tailwind never emits, and without
        AppShell&apos;s `--app-nav-h`, set only while a shell is mounted), the app&apos;s own stylesheets and
        runtime writes (`setProperty`, a style key, `[--x:…]`), Tailwind&apos;s theme, a chart key in the same
        file, and the `runtime` list for a library. Comments do not count. It throws on fewer than ten files or an
        empty stylesheet, so a glob that found nothing cannot pass. `refusePalette` reports Tailwind&apos;s
        palette colours although they resolve; `checkFallbacks` checks `var(--x, …)` too.
      </Note>
    </Example>
  );
}

/** The "Colour roles" page. */
export function ColourRoles033Demo() {
  return (
    <>
      <FillsDemo />
      <TonesDemo />
      <LinesDemo />
      <WellDemo />
      <HoverDemo />
      <UtilitiesDemo />
      <GuardDemo />
    </>
  );
}
