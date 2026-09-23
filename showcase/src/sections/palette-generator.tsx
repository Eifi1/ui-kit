import { useMemo, useState } from "react";
import { Check, CircleAlert, Copy, RotateCcw, TriangleAlert } from "lucide-react";
import {
  Button,
  FIELD_BASE,
  applyTokenSet,
  auditChartRamp,
  cn,
  deriveChartRamp,
  derivePalette,
  parseHex,
  toHex,
} from "@eifi1/ui-kit";
import type {
  AnchorRole,
  ChartRampReport,
  ContrastCheck,
  ContrastReport,
  DerivedPalette,
  PaletteAnchors,
  SemanticTokens,
  TokenSet,
} from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row, Swatch } from "../lib/section";
import { useActiveTokenSet, useTheme } from "../stores";

/**
 * The palette generator.
 *
 * Every other page in this showcase displays colours somebody already chose. This one
 * runs the chooser: one brand hex in, two full token sets out, with every contrast
 * ratio measured rather than asserted. That is the whole argument of
 * `theme/palette-derive.ts` — the shipped presets used to carry their ratios in
 * comments that nothing computed, and one of those comments was wrong for two years —
 * so the audit table below is the feature, not the decoration around it.
 *
 * Nothing here touches `document` outside an event handler: the render test mounts
 * every page in jsdom, and a module-scope write to <html> would fail it (and would also
 * re-skin the page merely by navigating to it, which is not consent).
 */

/** The roles a caller may pin by hand. `brand` is required and handled separately. */
const OPTIONAL_ROLES = ["accent", "danger", "warning", "success", "info"] as const satisfies
  readonly Exclude<AnchorRole, "brand">[];

type OptionalRole = (typeof OPTIONAL_ROLES)[number];

const ROLE_HINT: Record<OptionalRole, string> = {
  accent: "a second brand colour; only exists when pinned",
  danger: "destructive — red by convention, not by taste",
  warning: "amber",
  success: "green",
  info: "blue",
};

/**
 * Something to start from, and three brands worth trying on the way past.
 *
 * Each of the three produces a different one of the deriver's warnings, which is the
 * only way to see that `warnings` is a real channel rather than an empty array the API
 * carries around: pale amber gets its brand lifted for the light theme, the deep red
 * collides with `danger`'s home hue, and the dusty teal cannot carry legible text at
 * any ink — which is also the one input that makes the audit table below fail a row.
 */
const DEFAULT_BRAND = "#4f46e5";
const TRY_THESE: Array<[hex: string, why: string]> = [
  ["#f59e0b", "too pale for the light surfaces"],
  ["#b91c1c", "sits on danger's hue"],
  ["#538180", "no ink is legible on it"],
];

/** The scalar (string-valued) fields of a `TokenSet` — `chart` and `heat` are not. */
type ScalarTokenKey = {
  [K in keyof TokenSet]: TokenSet[K] extends string ? K : never;
}[keyof TokenSet];

/**
 * Token field → the custom property `applyTokenSet` writes it to.
 *
 * Typed against `TokenSet`, so a renamed field is a compile error here rather than a
 * quietly missing line in the CSS a consumer pastes. It is still a second copy of the
 * mapping that lives in `applyTokenSet` — the same caveat `foundations.tsx` records —
 * but one copy for both the swatch grid and the CSS block, so those two cannot disagree
 * with each other, and the "Apply to this page" button below is the live check: it goes
 * through `applyTokenSet` itself, so if these names were wrong the preview would paint
 * something different from what the CSS block promises.
 */
const TOKEN_VARS = [
  ["--bg-page", "bgPage"],
  ["--bg-surface", "bgSurface"],
  ["--bg-surface-2", "bgSurface2"],
  ["--border", "border"],
  ["--text-primary", "textPrimary"],
  ["--text-secondary", "textSecondary"],
  ["--text-muted", "textMuted"],
  ["--brand", "brand"],
  ["--brand-hover", "brandHover"],
  ["--brand-contrast", "brandContrast"],
  ["--money-income", "moneyIncome"],
  ["--money-expense", "moneyExpense"],
  ["--money-net", "moneyNet"],
  ["--money-neutral", "moneyNeutral"],
] as const satisfies ReadonlyArray<readonly [string, ScalarTokenKey]>;

/** The semantic layer, which lives in `tokens.css` rather than in a `TokenSet` — so
 *  `applyTokenSet` does not write it, and the CSS block below is the only way to get
 *  these out of the deriver. `--accent*` has no home in `tokens.css` at all yet. */
const SEMANTIC_VARS = [
  ["--danger", "danger"],
  ["--danger-hover", "dangerHover"],
  ["--danger-contrast", "dangerContrast"],
  ["--danger-border", "dangerBorder"],
  ["--danger-bg", "dangerBg"],
  ["--warning", "warning"],
  ["--warning-border", "warningBorder"],
  ["--warning-bg", "warningBg"],
  ["--info", "info"],
  ["--info-border", "infoBorder"],
  ["--info-bg", "infoBg"],
  ["--success", "success"],
  ["--success-border", "successBorder"],
  ["--success-bg", "successBg"],
  ["--accent", "accent"],
  ["--accent-contrast", "accentContrast"],
  ["--accent-bg", "accentBg"],
] as const satisfies ReadonlyArray<readonly [string, keyof SemanticTokens]>;

/** The three surfaces a colour can land on, in the order the audit measures them. */
function surfacesOf(t: TokenSet): string[] {
  return [t.bgPage, t.bgSurface, t.bgSurface2];
}

function cssBlock(selector: string, p: DerivedPalette, chart: string[] | null): string {
  const lines = [`${selector} {`];
  for (const [name, key] of TOKEN_VARS) lines.push(`  ${name}: ${p.tokens[key]};`);
  // Only when the reader opted in: a derived `TokenSet` carries an EMPTY chart array,
  // and writing nothing is the deriver's answer, not an omission. See the ramp section.
  if (chart) chart.forEach((hex, i) => lines.push(`  --chart-${i + 1}: ${hex};`));
  lines.push("", "  /* semantic layer — tokens.css owns these, applyTokenSet does not */");
  for (const [name, key] of SEMANTIC_VARS) {
    const value = p.semantic[key];
    if (value) lines.push(`  ${name}: ${value};`);
  }
  lines.push("}");
  return lines.join("\n");
}

/**
 * A ratio with its verdict.
 *
 * Colour is never the only signal — the same rule `FieldSyncIndicator` follows, and for
 * the same reason: the pass/fail pair here is green-ish against `--danger`, which is the
 * one combination roughly one man in twelve cannot read. The glyph carries the meaning,
 * the word carries it to a screen reader, and the colour is the third copy.
 */
function Verdict({ check }: { check?: ContrastCheck }) {
  if (!check) return <span className="text-[var(--text-muted)]">—</span>;
  const Icon = check.passes ? Check : CircleAlert;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono",
        check.passes ? "text-[var(--text-secondary)]" : "font-semibold text-[var(--danger)]",
      )}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {check.ratio.toFixed(2)}
      <span className="sr-only">{check.passes ? "passes" : "fails"}</span>
    </span>
  );
}

/** "3 of 34 checks fail" — loud when it is true, quiet when it is not. */
function AuditSummary({ label, report }: { label: string; report: ContrastReport }) {
  const failed = report.failures.length;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        failed ? "font-semibold text-[var(--danger)]" : "text-[var(--text-muted)]",
      )}
    >
      {failed ? <TriangleAlert aria-hidden className="size-3.5" /> : <Check aria-hidden className="size-3.5" />}
      {label}: {failed ? `${failed} of ${report.checks.length} checks fail` : `all ${report.checks.length} checks pass`}
    </span>
  );
}

/**
 * The audit, both themes on one line each.
 *
 * Zipped by pair name rather than by index: both reports come out of the same
 * `auditPalette` over the same token shape so the rows do line up, but looking the dark
 * check up by name means a future check added for one mode only degrades to an em dash
 * instead of silently shifting every row's dark column by one.
 */
function AuditTable({ light, dark }: { light: ContrastReport; dark: ContrastReport }) {
  const darkByPair = useMemo(() => new Map(dark.checks.map((c) => [c.pair, c])), [dark]);
  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
          <th scope="col" className="py-1.5 pr-3 font-medium">Pair</th>
          <th scope="col" className="py-1.5 pr-3 font-medium">Needs</th>
          <th scope="col" className="py-1.5 pr-3 font-medium">Light</th>
          <th scope="col" className="py-1.5 pr-3 font-medium">Dark</th>
          <th scope="col" className="py-1.5 font-medium">Rule</th>
        </tr>
      </thead>
      <tbody>
        {light.checks.map((check) => {
          const other = darkByPair.get(check.pair);
          const failed = !check.passes || (other ? !other.passes : false);
          return (
            <tr
              key={check.pair}
              // The fill is the fourth signal, and the only one that finds the row while
              // you are scrolling past rather than reading it.
              className={cn(
                "border-b border-[var(--border)] last:border-b-0",
                failed && "bg-[var(--danger-bg)]",
              )}
            >
              <td className="py-1.5 pr-3 align-top font-mono text-[var(--text-primary)]">{check.pair}</td>
              <td className="py-1.5 pr-3 align-top font-mono text-[var(--text-muted)]">{check.required}:1</td>
              <td className="py-1.5 pr-3 align-top"><Verdict check={check} /></td>
              <td className="py-1.5 pr-3 align-top"><Verdict check={other} /></td>
              <td className="py-1.5 align-top text-[var(--text-muted)]">{check.rule}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * One anchor: a picker and a hex field for the same value.
 *
 * Both, because a designer arrives with `#4f46e5` written down and a colour wheel cannot
 * be pasted into, while a developer arrives with a wheel and no number. `onUnset` is
 * what makes a hard point retractable — "let the deriver choose" is the default, and a
 * role pinned by accident has to be releasable or the page has quietly changed its own
 * defaults.
 */
function AnchorField({
  label,
  hint,
  value,
  auto,
  seed,
  onChange,
  onUnset,
}: {
  label: string;
  hint: string;
  /** The pinned hex, or null when the deriver is choosing this role. */
  value: string | null;
  /** What the deriver chose, when it chose anything — `accent` has no derived value. */
  auto?: string;
  /** Where "Pin" starts from, so pinning begins at what the role already looked like. */
  seed: string;
  onChange: (hex: string) => void;
  onUnset?: () => void;
}) {
  const parsed = value === null ? null : parseHex(value);
  const invalid = value !== null && parsed === null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-xs font-medium text-[var(--text-primary)]">{label}</span>
      {value === null ? (
        <>
          <span
            aria-hidden
            className="size-9 shrink-0 rounded-md border border-dashed border-[var(--border)]"
            style={auto ? { background: auto } : undefined}
          />
          <span className="font-mono text-xs text-[var(--text-muted)]">
            {auto ? `auto · ${auto}` : "auto · not derived unless pinned"}
          </span>
          <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => onChange(auto ?? seed)}>
            Pin
          </Button>
        </>
      ) : (
        <>
          <input
            type="color"
            aria-label={`${label} colour picker`}
            // The picker cannot hold a half-typed value, so it shows the last thing that
            // parsed. Typing into the hex field never makes the swatch jump to black.
            value={parsed ? toHex(parsed) : (auto ?? seed)}
            onChange={(e) => onChange(e.target.value)}
            className="size-9 shrink-0 cursor-pointer rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-1"
          />
          <input
            type="text"
            aria-label={`${label} hex`}
            value={value}
            spellCheck={false}
            placeholder="#4f46e5"
            onChange={(e) => onChange(e.target.value)}
            className={cn(FIELD_BASE, "w-28 font-mono")}
          />
          {invalid && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--danger)]">
              <CircleAlert aria-hidden className="size-3.5" />
              not a hex colour
            </span>
          )}
          {onUnset && (
            <Button variant="ghost" className="px-2 py-1 text-xs" onClick={onUnset}>
              Unset
            </Button>
          )}
        </>
      )}
      <span className="text-xs text-[var(--text-muted)]">{hint}</span>
    </div>
  );
}

/** A miniature app painted in the derived colours. Inline styles for the same reason a
 *  swatch uses them: these are data coming out of the deriver, not a design decision. */
function ThemePreview({ p }: { p: DerivedPalette }) {
  const t = p.tokens;
  return (
    <div className="rounded-lg border p-3" style={{ background: t.bgPage, borderColor: t.border }}>
      <div className="rounded-md border p-3" style={{ background: t.bgSurface, borderColor: t.border }}>
        <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>Payment run</p>
        <p className="mt-0.5 text-xs" style={{ color: t.textSecondary }}>Nine invoices, two flagged.</p>
        <p className="text-xs" style={{ color: t.textMuted }}>Updated a moment ago</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className="rounded-md px-2 py-1 text-xs font-medium"
            style={{ background: t.brand, color: t.brandContrast }}
          >
            Approve
          </span>
          <span
            className="rounded px-1.5 py-0.5 text-[11px] font-medium"
            style={{ background: p.semantic.dangerBg, color: p.semantic.danger }}
          >
            2 failed
          </span>
          <span className="text-xs font-medium" style={{ color: t.moneyIncome }}>+1,240.00</span>
          <span className="text-xs font-medium" style={{ color: t.moneyExpense }}>-380.00</span>
        </div>
      </div>
    </div>
  );
}

/** The measured facts about a ramp, as the report actually returns them. */
function RampReport({ report }: { report: ChartRampReport }) {
  return (
    <OutTable
      rows={[
        [".colors.length", String(report.colors.length)],
        [
          ".minSeparation",
          <span className={report.minSeparation < 0.05 ? "text-[var(--danger)]" : undefined}>
            {report.minSeparation.toFixed(4)}
          </span>,
        ],
        [
          ".minContrast",
          <span className={report.minContrast < 3 ? "text-[var(--danger)]" : undefined}>
            {report.minContrast.toFixed(2)}:1
          </span>,
        ],
        [
          ".collisions.length",
          <span className={report.collisions.length ? "text-[var(--danger)]" : undefined}>
            {report.collisions.length}
          </span>,
        ],
        [
          ".lowContrast.length",
          <span className={report.lowContrast.length ? "text-[var(--danger)]" : undefined}>
            {report.lowContrast.length}
          </span>,
        ],
        [
          ".passes",
          <span
            className={cn(
              "inline-flex items-center gap-1.5",
              report.passes ? undefined : "font-semibold text-[var(--danger)]",
            )}
          >
            {report.passes ? <Check aria-hidden className="size-3.5" /> : <CircleAlert aria-hidden className="size-3.5" />}
            {String(report.passes)}
          </span>,
        ],
      ]}
    />
  );
}

export function PaletteGenerator() {
  const mode = useTheme((s) => s.mode);
  const activeTokens = useActiveTokenSet();

  // Two pieces of state for one colour, and deliberately.
  //
  // The field holds whatever has been typed, including `#4f4` on the way to `#4f46e5`;
  // `brandHex` holds the last thing that PARSED. `derivePalette` throws on a string it
  // cannot parse, so nothing half-typed may reach it — and falling back to the last
  // valid colour rather than to a constant means the palette below stays still while
  // you retype four characters, instead of snapping back to indigo and out again.
  const [brandText, setBrandText] = useState<string>(DEFAULT_BRAND);
  const [brandHex, setBrandHex] = useState<string>(DEFAULT_BRAND);
  const [pins, setPins] = useState<Partial<Record<OptionalRole, string>>>({});
  const [useDerivedRamp, setUseDerivedRamp] = useState(false);
  const [rampCount, setRampCount] = useState(9);
  const [previewing, setPreviewing] = useState(false);
  const [copied, setCopied] = useState(false);

  function changeBrand(next: string) {
    setBrandText(next);
    const rgb = parseHex(next);
    // Normalised, not passed through: `derivePalette` echoes the anchor string straight
    // into `tokens.brand` when it already clears 3:1, so `4f46e5` typed without its hash
    // would come back out as a CSS value no browser accepts.
    if (rgb) setBrandHex(toHex(rgb));
  }

  const anchors = useMemo<PaletteAnchors>(() => {
    const next: PaletteAnchors = { brand: brandHex };
    for (const role of OPTIONAL_ROLES) {
      const rgb = pins[role] ? parseHex(pins[role]!) : null;
      if (rgb) next[role] = toHex(rgb);
    }
    return next;
  }, [brandHex, pins]);

  // Two derives per anchor change, a couple of milliseconds each. Memoised on the
  // anchors OBJECT so a keystroke that does not change a parsed colour — a second `#`,
  // a half-typed digit — costs nothing, and so the two themes below are always the same
  // input seen twice rather than two inputs that happen to agree.
  const light = useMemo(() => derivePalette({ anchors, mode: "light" }), [anchors]);
  const dark = useMemo(() => derivePalette({ anchors, mode: "dark" }), [anchors]);
  const derived = mode === "dark" ? dark : light;

  // Each ramp is measured against the surfaces it would actually be drawn on — the
  // DERIVED ones, not the preset's, which is the whole point of deriving them together.
  const lightRamp = useMemo(
    () => deriveChartRamp(brandHex, "light", surfacesOf(light.tokens), rampCount),
    [brandHex, light, rampCount],
  );
  const darkRamp = useMemo(
    () => deriveChartRamp(brandHex, "dark", surfacesOf(dark.tokens), rampCount),
    [brandHex, dark, rampCount],
  );
  const modeRamp = mode === "dark" ? darkRamp : lightRamp;

  // The shipped ramp, audited rather than trusted. `activeTokens` is the live preset, so
  // switching the palette menu in the top bar moves these numbers.
  const presetRamp = useMemo(
    () => auditChartRamp(activeTokens.chart, surfacesOf(activeTokens)),
    [activeTokens],
  );

  const css = useMemo(
    () =>
      `${cssBlock(":root", light, useDerivedRamp ? lightRamp.colors : null)}\n\n` +
      `${cssBlock(".dark", dark, useDerivedRamp ? darkRamp.colors : null)}\n`,
    [light, dark, lightRamp, darkRamp, useDerivedRamp],
  );

  function pin(role: OptionalRole, hex: string | null) {
    setPins((prev) => {
      const next = { ...prev };
      if (hex === null) delete next[role];
      else next[role] = hex;
      return next;
    });
  }

  function applyPreview() {
    // In a handler, never in render: the render test mounts this page in jsdom, and a
    // page that re-skins the whole showcase just by being visited has not been asked to.
    applyTokenSet(document.documentElement, {
      ...derived.tokens,
      chart: useDerivedRamp ? modeRamp.colors : derived.tokens.chart,
    });
    setPreviewing(true);
  }

  function resetPreview() {
    // `applyTokenSet` only ever writes, so this is a re-apply rather than an un-apply —
    // which is also why it restores `--chart-1…9`: the preset's array is nine long.
    applyTokenSet(document.documentElement, activeTokens);
    setPreviewing(false);
  }

  function copyCss() {
    // Optional chaining is load-bearing: `navigator.clipboard` is undefined outside a
    // secure context, and the whole chain short-circuits rather than throwing.
    void navigator.clipboard?.writeText(css).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => setCopied(false),
    );
  }

  return (
    <>
      <Example label="Anchors" hint="one brand colour is the whole required input">
        <div className="space-y-3">
          <AnchorField
            label="brand"
            hint="required — hue and chroma are kept, only lightness may move"
            value={brandText}
            seed={DEFAULT_BRAND}
            onChange={changeBrand}
          />
          <div className="border-t border-[var(--border)] pt-3">
            <p className="mb-2 text-xs text-[var(--text-muted)]">
              Hard points. Unpinned, each is placed away from the brand and from its
              siblings within its own licence to move; pinned, it is honoured exactly.
            </p>
            <div className="space-y-2">
              {OPTIONAL_ROLES.map((role) => (
                <AnchorField
                  key={role}
                  label={role}
                  hint={ROLE_HINT[role]}
                  value={pins[role] ?? null}
                  // `accent` is the one role with nothing to show here: the deriver emits
                  // it only when it is pinned, so this is undefined until you pin it.
                  auto={derived.semantic[role]}
                  seed={derived.tokens.brand}
                  onChange={(hex) => pin(role, hex)}
                  onUnset={() => pin(role, null)}
                />
              ))}
            </div>
          </div>
          <div className="border-t border-[var(--border)] pt-3">
            <Row className="gap-2">
              <span className="text-xs text-[var(--text-muted)]">Try:</span>
              {TRY_THESE.map(([hex, why]) => (
                <Button
                  key={hex}
                  variant="secondary"
                  className="gap-1.5 px-2 py-1 text-xs"
                  onClick={() => changeBrand(hex)}
                >
                  <span aria-hidden className="size-3.5 rounded-sm" style={{ background: hex }} />
                  <span className="font-mono">{hex}</span>
                  <span className="text-[var(--text-muted)]">{why}</span>
                </Button>
              ))}
            </Row>
          </div>
        </div>
      </Example>

      <Note>
        The semantic roles have a home hue and a narrow licence to move — danger is red
        because every other interface the reader has ever used made it red, and a danger
        button in the brand&rsquo;s teal is a worse button however well it matches. So
        pinning is for a brand that already owns one of those hues, not for taste. Pinning{" "}
        <code className="font-mono">accent</code> is the exception: it is the only role
        that does not exist until you ask for it, and the only one{" "}
        <code className="font-mono">tokens.css</code> has no variable for yet.
      </Note>

      <Example
        label="The derived palette, both themes"
        hint="one set of anchors, two token sets — no second input"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {([["Light", light], ["Dark", dark]] as const).map(([label, p]) => (
            <div key={label} className="min-w-0 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {label}
              </h4>
              <ThemePreview p={p} />
              <div className="grid gap-3 sm:grid-cols-2">
                {TOKEN_VARS.map(([name, key]) => (
                  <Swatch key={name} name={name} value={p.tokens[key]} />
                ))}
              </div>
              <div className="grid gap-3 border-t border-[var(--border)] pt-3 sm:grid-cols-2">
                {SEMANTIC_VARS.map(([name, key]) => {
                  const value = p.semantic[key];
                  return value ? <Swatch key={name} name={name} value={value} /> : null;
                })}
              </div>
            </div>
          ))}
        </div>
      </Example>

      <Note>
        The two columns are one call each and share every input. That the dark set is not
        the light set inverted is the part worth staring at: the surfaces are solved at
        different lightnesses, the text is solved against the WORST of the three surfaces
        it can land on in that theme, and the brand keeps its hue in both while its
        lightness moves to clear 3:1 in each. The <code className="font-mono">heat</code>{" "}
        stops are derived too but get no custom property — CSS variables cannot be
        interpolated, so heatmaps read them from JS.
      </Note>

      <Example label="Contrast audit" hint="every pair that has a requirement, measured">
        <div className="space-y-3">
          <Row className="gap-x-4">
            <AuditSummary label="Light" report={light.audit} />
            <AuditSummary label="Dark" report={dark.audit} />
          </Row>
          <div className="overflow-x-auto">
            <AuditTable light={light.audit} dark={dark.audit} />
          </div>
        </div>
      </Example>

      <Note>
        A derived palette almost always passes, because every one of these numbers was
        SOLVED to its target and then measured — that is the difference between this and a
        comment claiming a ratio. Almost: try <code className="font-mono">#538180</code>{" "}
        above and watch <code className="font-mono">brandContrast on brand</code> fail at
        4.36:1. Neither white nor near-black is legible on a mid-lightness, mid-chroma
        fill, so no choice of ink saves it and the deriver says so rather than shipping a
        button nobody can read. The one row that is measured looser than it was solved is{" "}
        <code className="font-mono">border</code>: solved to 1.5:1 against{" "}
        <code className="font-mono">bgSurface</code>, checked at 1.1:1 against all three,
        which is what lets one hairline sit on the page and on a raised card without a
        second token.
      </Note>

      <Example label="Warnings" hint="compromises the deriver had to make, in plain words">
        <div className="grid gap-4 lg:grid-cols-2">
          {([["Light", light], ["Dark", dark]] as const).map(([label, p]) => (
            <div key={label} className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {label}
              </h4>
              {p.warnings.length === 0 ? (
                <p className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <Check aria-hidden className="size-3.5" />
                  No compromises — every role reached its target.
                </p>
              ) : (
                <ul className="space-y-2">
                  {p.warnings.map((w) => (
                    <li
                      key={w}
                      className="flex gap-2 rounded-md border border-[var(--warning-border)] bg-[var(--warning-bg)] px-3 py-2 text-xs text-[var(--text-primary)]"
                    >
                      <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0 text-[var(--warning)]" />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </Example>

      <Note>
        A warning is not the same thing as a failed check. The audit measures the palette
        that came out; a warning names what the deriver had to give up to get there — a
        brand lifted off the colour you asked for, a semantic hue that could not get far
        enough from the brand to be told apart at a glance, an anchor that was not a hex
        and was ignored. Most of them sit happily beside an audit that passes. The
        text-on-brand warning is the exception, and it is the interesting one: there the
        compromise could not be made at all, so the same input that raises it also fails a
        row above. The array is never silent and never swallowed, which is why this section
        exists even when it is empty.
      </Note>

      <Example label="Apply to this page" hint="a preview, not a setting">
        <div className="space-y-3">
          <Row>
            <Button variant="brand" onClick={applyPreview}>
              Apply the {mode} set to this page
            </Button>
            <Button variant="secondary" onClick={resetPreview}>
              <RotateCcw aria-hidden className="size-4" />
              Reset to the active preset
            </Button>
            {previewing && (
              <span className="text-xs text-[var(--text-muted)]">
                Preview applied — every token-driven surface in the showcase is now yours.
              </span>
            )}
          </Row>
          <label className="flex items-center gap-2 text-xs text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={useDerivedRamp}
              onChange={(e) => setUseDerivedRamp(e.target.checked)}
            />
            Include the derived chart ramp — see the last section for what that costs
          </label>
        </div>
      </Example>

      <Note>
        This writes the token set onto <code className="font-mono">&lt;html&gt;</code> with{" "}
        <code className="font-mono">applyTokenSet</code>, exactly as the palette store
        does. It is a preview and nothing more: it is not persisted, and the next theme
        toggle or palette selection re-applies the active preset over it, because that
        store&rsquo;s effect runs on every change of either. Two things stay put even so —{" "}
        <code className="font-mono">applyTokenSet</code> writes no semantic variables, so{" "}
        <code className="font-mono">--danger</code> and its siblings keep their{" "}
        <code className="font-mono">tokens.css</code> values, and a derived set&rsquo;s{" "}
        <code className="font-mono">chart</code> array is empty, so the chart hues stay as
        they were unless you tick the box — and a ramp shorter than nine replaces only as
        many as it has, because <code className="font-mono">applyTokenSet</code> writes{" "}
        <code className="font-mono">--chart-N</code> per index and never clears one.
      </Note>

      <Example label="CSS to paste" hint="the output a consumer actually ships">
        <div className="space-y-3">
          <Row>
            <Button variant="secondary" onClick={copyCss}>
              <Copy aria-hidden className="size-4" />
              Copy
            </Button>
            {copied && <span className="text-xs text-[var(--text-muted)]">Copied to the clipboard.</span>}
          </Row>
          <pre className="max-h-96 overflow-auto rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] p-3 font-mono text-[11px] leading-relaxed text-[var(--text-secondary)]">
            {css}
          </pre>
        </div>
      </Example>

      <Note>
        <code className="font-mono">.dark</code> rather than a media query, because that is
        the selector <code className="font-mono">tokens.css</code> defines its dark block
        under and the one the kit&rsquo;s theme store toggles. Paste this AFTER importing{" "}
        <code className="font-mono">@eifi1/ui-kit/tokens.css</code> and it overrides the
        shipped values; paste it before and it does not. Note also what is missing: the{" "}
        <code className="font-mono">heat</code> stops, which are JS-only, and{" "}
        <code className="font-mono">--chart-N</code> unless you asked for a derived ramp.
      </Note>

      <Example label="The categorical chart ramp" hint="a separate system, deliberately">
        <div className="space-y-5">
          <p className="max-w-3xl text-sm text-[var(--text-secondary)]">
            A UI colour needs contrast against one known surface and carries a fixed
            meaning. A chart colour needs to stay separable from eight unknown siblings at
            roughly equal salience with no implied order. Optimising for one makes a set
            worse at the other, so <code className="font-mono">derivePalette</code> returns{" "}
            <code className="font-mono">chart: []</code> and leaves the ramp alone unless
            you ask for <code className="font-mono">deriveChartRamp</code> by name.
          </p>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              The shipped ramp, audited — {mode} theme, live preset
            </h4>
            <Row className="gap-1.5">
              {presetRamp.colors.map((hex, i) => (
                <span
                  key={i}
                  title={hex}
                  className="size-6 rounded border border-[var(--border)]"
                  style={{ background: hex }}
                />
              ))}
            </Row>
            <RampReport report={presetRamp} />
            {presetRamp.lowContrast.length > 0 && (
              <p className="text-xs text-[var(--text-secondary)]">
                Below 3:1 against a surface it may be drawn on:{" "}
                <span className="font-mono text-[var(--danger)]">
                  {[...new Set(presetRamp.lowContrast.map((l) => l.index))]
                    .map((i) => `chart[${i}]`)
                    .join(", ")}
                </span>
                .
              </p>
            )}
          </div>

          <div className="space-y-2 border-t border-[var(--border)] pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              deriveChartRamp, opt-in — from your brand hue
            </h4>
            <Row className="gap-2">
              <label htmlFor="ramp-count" className="text-xs text-[var(--text-primary)]">
                Series
              </label>
              <select
                id="ramp-count"
                value={rampCount}
                onChange={(e) => setRampCount(Number(e.target.value))}
                className={cn(FIELD_BASE, "w-auto py-1 text-xs")}
              >
                {[3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </Row>
            <Row className="gap-1.5">
              {modeRamp.colors.map((hex, i) => (
                <span
                  key={i}
                  title={hex}
                  className="size-6 rounded border border-[var(--border)]"
                  style={{ background: hex }}
                />
              ))}
            </Row>
            <RampReport report={modeRamp} />
          </div>
        </div>
      </Example>

      <Note>
        <strong className="font-semibold text-[var(--text-primary)]">
          The trade-off, as the deriver measured it.
        </strong>{" "}
        At a SINGLE lightness, the most series that can satisfy both the 3:1 fill contrast
        of WCAG 1.4.11 and the 0.05 minimum separation under dichromacy is FOUR — searched
        exhaustively over starting hue and lightness, the best achievable separation is
        0.065 at four series, 0.041 at five and 0.015 at nine. The reason is structural:
        dichromacy collapses the red-green axis, so hue alone stops distinguishing colours
        past a handful, and the channel that is left is LIGHTNESS — the very thing a
        uniform-contrast ramp holds constant. Paul Tol&rsquo;s set varies lightness
        deliberately and pays for it in contrast; that is not an oversight in their
        palette, it is the only currency left. Above four series{" "}
        <code className="font-mono">deriveChartRamp</code> varies lightness too, in a
        three-step cycle so that ADJACENT series differ in lightness as well as hue, and
        reports what it gave up rather than pretending both constraints were met.
      </Note>

      <Note>
        Which is why the report above is the thing to read, not the four. That figure is
        what an exhaustive search over starting hue and lightness can reach;{" "}
        <code className="font-mono">deriveChartRamp</code> does no such search — it spaces
        hues evenly starting from YOUR brand&rsquo;s hue, so most brands do not land on it
        even at four series. The shipped Paul Tol &ldquo;Muted&rdquo; set stays the default
        for the same reason: it was optimised against real confusion lines rather than
        spaced by formula, and <code className="font-mono">MIN_SEPARATION</code> was
        calibrated just under what it achieves, so an audit that failed it would be an
        audit nobody would leave switched on.
      </Note>
    </>
  );
}
