import { useState } from "react";
import {
  CHART_COLORS,
  HEATMAP_HEX,
  PALETTES,
  PALETTE_HEX,
  lerpHex,
  paletteFor,
  textOn,
} from "@eifi1/ui-kit";
import type { HeatStops, TokenSet } from "@eifi1/ui-kit";
import { ConstList, Example, Note, OutTable, Row, Swatch } from "../lib/section";
import { useActiveTokenSet, usePalette, useTheme } from "../stores";

/**
 * Foundations & tokens.
 *
 * Every colour below is read from the LIVE store (`useActiveTokenSet`), never from
 * the imported `DEFAULT_PRESET`. That is the whole point of the section: a swatch
 * built from the constant would keep its colour when the palette menu changes, and
 * would therefore prove nothing. Where a specimen IS driven by a frozen constant
 * (`PALETTE_HEX`, `HEATMAP_HEX`) it says so, because standing still is the finding.
 */

/**
 * The scalar colour fields of a `TokenSet`, in declaration order.
 *
 * Derived, not hand-listed. `palette-presets.ts` deleted an exported 24-name
 * `TOKEN_VARS` array for precisely this reason — a second copy of the token names
 * with nothing comparing the two drifts in silence, so a token added to the
 * interface simply never appears here. `chart` (an array) and `heat` (an object)
 * fall out of the filter and get examples of their own.
 */
function scalarTokens(t: TokenSet): Array<[string, string]> {
  return (Object.entries(t) as Array<[string, unknown]>).filter(
    (e): e is [string, string] => typeof e[1] === "string",
  );
}

/**
 * `bgSurface2` → `--bg-surface-2`, mirroring what `applyTokenSet` writes onto
 * <html>. This IS a second copy of that mapping, which the note above warns about —
 * it is display-only and deliberately cheap, and the `paletteFor` example further
 * down is the live check: those swatches are painted by the custom properties
 * themselves, so if the write never happened they come out blank.
 */
function cssVar(field: string): string {
  return `--${field.replace(/([A-Z])|(\d+)/g, "-$1$2").toLowerCase()}`;
}

/** The six heat stops, typed against the interface so a renamed stop is a compile
 *  error here rather than a quietly missing swatch. */
const HEAT_STOPS = ["neutral", "under", "over", "seqLow", "seqHigh", "empty"] as const satisfies
  readonly (keyof HeatStops)[];

/** A colour result inside an `OutTable` cell: the returned string, plus the colour
 *  it names, because "#62653c" tells a reader nothing on its own. */
function Hex({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="inline-block size-3.5 rounded-sm border border-[var(--border)]"
        style={{ background: value }}
      />
      {value}
    </span>
  );
}

/** `textOn` shown doing its job: the returned colour used as the label colour on
 *  the very fill it was asked about. */
function TextOn({ fill }: { fill: string }) {
  const out = textOn(fill);
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
        style={{ background: fill, color: out }}
      >
        -12.50
      </span>
      {out}
    </span>
  );
}

export function Foundations() {
  const tokens = useActiveTokenSet();
  const mode = useTheme((s) => s.mode);
  const activeId = usePalette((s) => s.id);

  // Controlled, like everything else on this page — an accent colour you cannot
  // toggle demonstrates nothing about the checked state it applies to.
  const [reconciled, setReconciled] = useState(true);
  const [override, setOverride] = useState(true);
  const [tone, setTone] = useState<"income" | "expense">("income");

  const heat = tokens.heat;
  const heatHex = HEATMAP_HEX[mode];

  return (
    <>
      <Example
        label="The active TokenSet"
        hint={`live — preset "${activeId}", ${mode} mode`}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scalarTokens(tokens).map(([field, value]) => (
            <Swatch key={field} name={`${field} · ${cssVar(field)}`} value={value} />
          ))}
        </div>
      </Example>

      <Note>
        <code className="font-mono">applyTokenSet</code> writes these fourteen onto{" "}
        <code className="font-mono">&lt;html&gt;</code> as inline custom properties
        (camelCase → kebab), plus <code className="font-mono">--chart-1…9</code> from the{" "}
        <code className="font-mono">chart</code> array. The <code className="font-mono">heat</code>{" "}
        stops get no custom property at all — CSS variables cannot be interpolated, so the
        heatmaps read them from JS via <code className="font-mono">useHeatStops()</code>. Note
        also that the <code className="font-mono">:root</code> block in{" "}
        <code className="font-mono">tokens.css</code> is a documentation mirror, not the source:
        Tailwind v4 strips a root block that holds only custom properties, so the inline write is
        what actually paints.
      </Note>

      <Example label="chart — 9 categorical hues" hint="the array field of the same TokenSet">
        <div className="grid gap-3 sm:grid-cols-3">
          {tokens.chart.map((hex, i) => (
            <Swatch key={i} name={`chart[${i}] · --chart-${i + 1}`} value={hex} />
          ))}
        </div>
      </Example>

      <Example
        label="heat — heatmap interpolation stops"
        hint="JS-only: no CSS custom property is written for these"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HEAT_STOPS.map((k) => (
            <Swatch key={k} name={`heat.${k}`} value={heat[k]} />
          ))}
        </div>
      </Example>

      <Note>
        <code className="font-mono">heat.empty</code> is an{" "}
        <code className="font-mono">rgba()</code> string, not a hex — it is the fill for a cell
        with no data, and being translucent is the point. It is also the reason{" "}
        <code className="font-mono">textOn</code> has a fallback at all; see the helper table
        below.
      </Note>

      <Example
        label="paletteFor(i)"
        hint="returns a CSS var, so these chips are painted by the live custom property"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Swatch key={i} name={`paletteFor(${i})`} value={paletteFor(i)} />
          ))}
        </div>
      </Example>

      <Note>
        These nine are the same colours as the <code className="font-mono">chart</code> grid above,
        reached the other way round — that grid is hex out of the store, this one is whatever{" "}
        <code className="font-mono">--chart-N</code> currently resolves to in the browser. If the
        two ever disagree, <code className="font-mono">applyTokenSet</code> has not run.
        (In jsdom nothing applies them, so in the render test these chips are simply blank.) The
        index wraps at nine — <code className="font-mono">paletteFor(9)</code> is{" "}
        <code className="font-mono">var(--chart-1)</code> — so a tenth series silently reuses the
        first one&rsquo;s colour.
      </Note>

      <Example label="CHART_COLORS" hint="semantic money roles, as theme-aware CSS vars">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(CHART_COLORS).map(([role, value]) => (
            <Swatch key={role} name={`CHART_COLORS.${role}`} value={value} />
          ))}
        </div>
      </Example>

      <Note>
        <code className="font-mono">activity</code> and <code className="font-mono">expense</code>{" "}
        are the same token (<code className="font-mono">--money-expense</code>), and{" "}
        <code className="font-mono">assigned</code> is the brand accent rather than a money
        colour — so a chart that plots activity against expense must separate them by something
        other than colour.
      </Note>

      <Example
        label="PALETTE_HEX"
        hint={`the frozen ${mode} mirror — does NOT follow the palette menu`}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {PALETTE_HEX[mode].map((hex, i) => (
            <Swatch key={i} name={`PALETTE_HEX.${mode}[${i}]`} value={hex} />
          ))}
        </div>
      </Example>

      <Example
        label="HEATMAP_HEX"
        hint={`the frozen ${mode} mirror of the heat stops`}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HEAT_STOPS.map((k) => (
            <Swatch key={k} name={`HEATMAP_HEX.${mode}.${k}`} value={heatHex[k]} />
          ))}
        </div>
      </Example>

      <Note>
        Both of these are module constants in{" "}
        <code className="font-mono">theme/chart-palette.ts</code>, written before the palette layer
        existed. Select <em>Imprint</em> in the top bar: the{" "}
        <code className="font-mono">chart</code> grid moves and{" "}
        <code className="font-mono">PALETTE_HEX</code> does not. They have also drifted from the
        default preset they mirror — <code className="font-mono">HEATMAP_HEX.light.neutral</code> is
        slate-100 (<code className="font-mono">#f1f5f9</code>), a cool grey, while the shipped
        default&rsquo;s <code className="font-mono">heat.neutral</code> is the warm{" "}
        <code className="font-mono">#f1e7d2</code>. Prefer{" "}
        <code className="font-mono">useHeatStops()</code> / <code className="font-mono">useChartHex()</code>{" "}
        in app code and treat these two as the pre-palette fallback.
      </Note>

      <Example label="lerpHex + textOn" hint="live calls against the active heat stops">
        <OutTable
          rows={[
            [
              `lerpHex(heat.seqLow, heat.seqHigh, 0)  // ${heat.seqLow} → ${heat.seqHigh}`,
              <Hex value={lerpHex(heat.seqLow, heat.seqHigh, 0)} />,
            ],
            [
              "lerpHex(heat.seqLow, heat.seqHigh, 0.5)",
              <Hex value={lerpHex(heat.seqLow, heat.seqHigh, 0.5)} />,
            ],
            [
              "lerpHex(heat.seqLow, heat.seqHigh, 1)",
              <Hex value={lerpHex(heat.seqLow, heat.seqHigh, 1)} />,
            ],
            // t is clamped, not wrapped — an out-of-range domain value lands on the
            // endpoint instead of producing a colour outside the scale.
            [
              "lerpHex(heat.seqLow, heat.seqHigh, 2.5)",
              <Hex value={lerpHex(heat.seqLow, heat.seqHigh, 2.5)} />,
            ],
            ['lerpHex("#fff", "#000", 0.5)', <Hex value={lerpHex("#fff", "#000", 0.5)} />],
            // An unparseable stop degrades to mid-grey rather than the literal
            // "#nannannan" this used to emit.
            [
              `lerpHex(heat.empty, heat.over, 0.5)  // ${heat.empty}`,
              <Hex value={lerpHex(heat.empty, heat.over, 0.5)} />,
            ],
            ["textOn(heat.under)", <TextOn fill={heat.under} />],
            ["textOn(heat.over)", <TextOn fill={heat.over} />],
            ["textOn(heat.seqLow)", <TextOn fill={heat.seqLow} />],
            // The case the fallback exists for: `empty` is rgba(), so textOn cannot
            // read it and answers "currentColor" — inherit. The label above is
            // therefore painted in the table's own text colour, which is legible on
            // both themes; a constant would be wrong on one of them.
            ["textOn(heat.empty)", <TextOn fill={heat.empty} />],
          ]}
        />
      </Example>

      <Note>
        <code className="font-mono">textOn</code> returns{" "}
        <code className="font-mono">&quot;currentColor&quot;</code> for anything it cannot parse,
        and that is a real case rather than defensive padding: the variance heatmap paints a figure
        on an <code className="font-mono">empty</code> cell whenever a category has zero assigned
        and positive activity (a refund). The earlier version computed{" "}
        <code className="font-mono">NaN &gt; 0.6 === false</code> and returned the near-white label
        colour, on a near-white cell.
      </Note>

      <Example
        label="Semantic utility classes"
        hint="plain CSS in tokens.css — present only if the consumer imports it"
      >
        <div className="space-y-3">
          <Row className="gap-x-5 text-sm font-medium">
            <span className="text-money-pos">+1,240.00</span>
            <span className="text-money-neg">-380.00</span>
            <span className="text-money-net">860.00</span>
            <span className="text-money-pos-muted">+1,240.00</span>
            <span className="text-money-neg-muted">-380.00</span>
            <span className="text-brand">Brand text</span>
          </Row>
          <Row>
            <span className="bg-brand rounded px-2 py-1 text-xs font-medium text-[var(--brand-contrast)]">
              .bg-brand
            </span>
            <span className="bg-money-pos rounded px-2 py-1 text-xs font-medium text-[var(--brand-contrast)]">
              .bg-money-pos
            </span>
            <span className="bg-money-neg rounded px-2 py-1 text-xs font-medium text-[var(--brand-contrast)]">
              .bg-money-neg
            </span>
            <span className="bg-money-neutral rounded px-2 py-1 text-xs font-medium text-[var(--brand-contrast)]">
              .bg-money-neutral
            </span>
            <span className="border-brand rounded border-2 px-2 py-1 text-xs font-medium text-[var(--text-primary)]">
              .border-brand
            </span>
          </Row>
        </div>
      </Example>

      <Note>
        The two <code className="font-mono">-muted</code> variants are the same colour at{" "}
        <code className="font-mono">opacity: 0.72</code>, not a second token — so they dim whatever
        is behind them too, and are for a figure that is genuinely secondary rather than for
        disabled text. All eleven are written unlayered on purpose, so they beat Tailwind&rsquo;s
        layered colour utilities and need no <code className="font-mono">dark:</code> variant. They
        are also NOT generated by Tailwind: they exist because the stylesheet is imported, so an
        app that misses <code className="font-mono">@import &quot;@eifi1/ui-kit/tokens.css&quot;</code>{" "}
        gets unstyled text with no error. <code className="font-mono">.bg-money-neutral</code> means
        &ldquo;no money has moved&rdquo; — scheduled or future-dated rows — and is deliberately
        neither brand nor money-pos, both of which read as settled.
      </Note>

      <Example
        label="Form-control accent"
        hint="a base-layer rule in tokens.css, not a utility"
      >
        <div className="space-y-3 text-sm text-[var(--text-primary)]">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={reconciled}
              onChange={(e) => setReconciled(e.target.checked)}
            />
            Reconciled — inherits <code className="font-mono">accent-color: var(--brand)</code>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-[var(--money-expense)]"
              checked={override}
              onChange={(e) => setOverride(e.target.checked)}
            />
            <span>
              Overridden with <code className="font-mono">accent-[var(--money-expense)]</code>
            </span>
          </label>
          <Row className="gap-x-5">
            {(["income", "expense"] as const).map((t) => (
              <label key={t} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="foundations-tone"
                  checked={tone === t}
                  onChange={() => setTone(t)}
                />
                {t}
              </label>
            ))}
          </Row>
        </div>
      </Example>

      <Note>
        The accent rule sits inside <code className="font-mono">@layer base</code> precisely so the
        second checkbox can win. Unlayered it beat every <code className="font-mono">accent-*</code>{" "}
        utility regardless of specificity, which silently overrode deliberate choices like a
        destructive checkbox.
      </Note>

      <Example label="Animation utilities" hint="also shipped by tokens.css">
        <div className="space-y-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-surface-2)]">
            <div className="animate-indeterminate h-full w-1/3 rounded-full bg-[var(--brand)]" />
          </div>
          {/* The five overlay/drill classes are listed rather than rendered: four of
              them animate an element out of view or assume a mount transition, so a
              specimen of them is an empty box. The overlays section operates them. */}
          <ConstList
            items={[
              [".animate-indeterminate", "indeterminate-sweep 1.4s ease-in-out infinite — the bar above"],
              [".animate-overlay", "overlay-fade-in 0.18s ease-out — backdrop enter"],
              [".animate-sheet", "sheet-rise-in 0.22s cubic-bezier(0.32, 0.72, 0, 1) — bottom sheet enter"],
              [".animate-overlay-out", "overlay-fade-out 0.18s ease-in forwards — backdrop exit"],
              [".animate-sheet-out", "sheet-lower-out 0.22s cubic-bezier(1, 0, 0.68, 0.28) forwards — sheet exit"],
              [".animate-drill", "drill-in 0.25s ease-out — chart drilldown remount"],
            ]}
          />
        </div>
      </Example>

      <Note>
        Both exit classes carry <code className="font-mono">forwards</code> because the element is
        unmounted by a timer (<code className="font-mono">OVERLAY_EXIT_MS</code>): without a
        retained end state the last painted frame is the panel back at full opacity. Under{" "}
        <code className="font-mono">prefers-reduced-motion</code> the sheet stops travelling and the
        overlay fade collapses to 0.01ms; the exit pair is not listed there because{" "}
        <code className="font-mono">useCloseTransition</code> reads the same query and closes
        immediately, so those classes are never applied.
      </Note>

      <Example label="PALETTES" hint="the two live presets, in menu order">
        <div className="space-y-4">
          {PALETTES.map((p) => (
            <div key={p.id} className="space-y-1.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-sm font-medium text-[var(--text-primary)]">{p.name}</span>
                <code className="font-mono text-xs text-[var(--text-muted)]">id: {p.id}</code>
                {p.id === activeId && (
                  <span className="rounded bg-[var(--brand)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--brand-contrast)]">
                    active
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)]">{p.blurb}</p>
              {/* The ramps side by side are the argument: Imprint is the default
                  preset with ONLY the nine categorical hues swapped, so every other
                  row of this section is identical under both. */}
              <Row className="gap-1.5">
                {p[mode].chart.map((hex, i) => (
                  <span
                    key={i}
                    title={hex}
                    className="size-6 rounded border border-[var(--border)]"
                    style={{ background: hex }}
                  />
                ))}
              </Row>
            </div>
          ))}
        </div>
      </Example>

      <Note>
        <code className="font-mono">ALTERNATIVE_PRESETS</code> holds five more vetted sets
        (Warm Paper, Nord Frost, Indigo Noir, Solar Dusk, Zinc Mono) but is a reference bank, not a
        menu: <code className="font-mono">PALETTES</code> is the live pair, and{" "}
        <code className="font-mono">presetById</code> falls back to the default for any stale
        persisted id, so a removed preset degrades rather than throwing.
      </Note>
    </>
  );
}
