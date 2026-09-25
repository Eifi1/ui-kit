import { useState } from "react";
import { Activity, Users } from "lucide-react";
import {
  DEFAULT_SPARKLINE_LABELS,
  Sparkline,
  StatTile,
  StatTileGrid,
  sparklineSummary,
} from "@eifi1/ui-kit";
import type { SparklineTone, StatTileLinkProps } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * Stat tiles and sparklines — the KPI card and the trend line that sits in it (or in a
 * table cell on its own).
 *
 * The sparkline is plain SVG, not recharts, which is why it is on the main barrel: it
 * is cheap enough for every row of a table. No colour is written below; every tone is
 * a token name, so the palette switch reaches all of it.
 */

const PRICE = [9.75, 9.9, 10.2, 10.1, 11.3, 12.4];
const VISITS = [120, 132, 101, 134, 90, 230, 210, 250, 245, 280];
const GAPPY = [4, 6, 5, null, null, 7, 9, 8];
const NET = [320, -140, 80, -60, 210, 150];

export function StatsDemo() {
  return (
    <>
      <Example label="Sparkline" hint="role=img, named by a generated summary">
        <Row>
          <Sparkline data={PRICE} label="Price" />
          <Sparkline data={VISITS} variant="area" tone="brand" label="Visits" />
          <Sparkline data={NET} variant="bar" tone="signed" referenceValue={0} label="Net" />
          <Sparkline data={GAPPY} tone="muted" label="Readings" />
          <Sparkline data={[5]} label="One receipt" />
        </Row>
        <div className="mt-4 max-w-sm">
          <Sparkline data={VISITS} fluid height={32} variant="area" label="Visits (fluid)" />
        </div>
      </Example>

      <Note>
        The scale is tight by default — the price above moved from 9.75 to 12.40 and the
        line uses the whole box. Bars include zero; pass <code>min</code>/<code>max</code>{" "}
        to pin the scale, and <code>referenceValue</code> for a zero or target line. A gap
        (<code>null</code>) breaks the line rather than bridging it.
      </Note>

      <Example label="KPI row" hint="StatTileGrid fits columns to its own width">
        <StatTileGrid>
          <StatTile
            label="Inflow"
            value={4210.5}
            currency="EUR"
            tone="income"
            valueLabel="SEP"
            subValues={[
              { label: "Projected", value: 5100 },
              { label: "AUG", value: 4890 },
              { label: "JUL", value: 4705.2 },
            ]}
            sensitive
          />
          <StatTile
            label="Net"
            value={-182.4}
            currency="EUR"
            tone="signed"
            valueLabel="SEP"
            subValues={[
              { label: "AUG", value: 310 },
              { label: "JUL", value: -45 },
            ]}
            sensitive
          />
          <StatTile
            label="Avg monthly spend"
            value={2380}
            currency="EUR"
            tone="expense"
            description="Last 12 months"
            hint="Mean of the last twelve closed months"
            size="sm"
          />
          <StatTile label="Savings rate" value="18.4%" delta={{ value: 0.021, unit: "percent", label: "vs AUG" }} goodDirection="up" />
        </StatTileGrid>
      </Example>

      <Example label="Delta and trend" hint="goodDirection decides the verdict — the arrow and words carry it too">
        <StatTileGrid minTileWidth="12rem">
          <StatTile
            label="Active users"
            value={1284}
            delta={{ value: 96, label: "vs last week" }}
            goodDirection="up"
            trend={VISITS}
            icon={<Users />}
          />
          <StatTile
            label="AI cost (30 d)"
            value={3.42}
            currency="USD"
            delta={-0.58}
            goodDirection="down"
            trend={[4.4, 4.1, 4.0, 3.8, 3.42]}
          />
          <StatTile label="Transactions" value={52310} compact delta={0} trend={[5, 5, 5]} />
          <StatTile label="Push failures" value={7} delta={3} icon={<Activity />} description="Unjudged: no goodDirection" />
        </StatTileGrid>
      </Example>

      <Example label="Dense metrics wall" hint='size="sm", with units and threshold tones'>
        <StatTileGrid minTileWidth="7.5rem" className="gap-2">
          <StatTile size="sm" label="Overshoot" value={17.2} unit="%" tone="danger" description="Above 15 %" />
          <StatTile size="sm" label="Lag" value={42} unit="ms" />
          <StatTile size="sm" label="Phase margin" value={38} unit="°" tone="warning" description="Below 45°" />
          <StatTile size="sm" label="Gain margin" value={9.1} unit="dB" tone="success" />
          <StatTile size="sm" label="Crossover" value={null} unit="Hz" />
        </StatTileGrid>
      </Example>

      <Example label="Interactive and loading" hint="href / onClick stretch over the tile; the hint stays reachable">
        <StatTileGrid minTileWidth="11rem">
          <StatTile label="Invoices" value={128} href="#/stats#kpi-row" hint="Open and overdue" icon={<Activity />} />
          <ClickableTile />
          <StatTile label="Leases" loading />
          <StatTile
            label="Payment rate"
            value="92%"
            footer={
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-active)]">
                <div className="h-full w-[92%] rounded-full bg-[var(--success)]" />
              </div>
            }
          />
        </StatTileGrid>
      </Example>

      <SparklineOptions />
      <StatTileFormatting />
      <StatTileLinksAndLabels />
      <StatTileRtl />
    </>
  );
}

/** A button tile whose click is visible: the counter is in the description. */
function ClickableTile() {
  const [clicks, setClicks] = useState(0);
  return (
    <StatTile
      label="Units"
      value={42}
      onClick={() => setClicks((n) => n + 1)}
      description={clicks ? `onClick fired ${clicks}×` : "Click the tile"}
    />
  );
}

const TONES: SparklineTone[] = [
  "chart",
  "brand",
  "muted",
  "income",
  "expense",
  "net",
  "success",
  "warning",
  "danger",
  "info",
];

const GERMAN_LABELS = {
  rising: (a: string, b: string) => `Steigend von ${a} auf ${b}`,
  falling: (a: string, b: string) => `Fallend von ${a} auf ${b}`,
};

function SparklineOptions() {
  const euro = (v: number) => `${v.toFixed(2)} €`;
  return (
    <Example
      label="Sparkline — tones, scale and stroke"
      hint="every tone is a token; min/max pin the scale; the spoken name is shown under each"
    >
      <div className="space-y-4">
        <Row>
          {TONES.map((tone) => (
            <span key={tone} className="inline-flex flex-col items-center gap-1">
              <Sparkline data={VISITS} tone={tone} variant="area" label={tone} />
              <span className="font-mono text-[10px] text-[var(--text-muted)]">{tone}</span>
            </span>
          ))}
        </Row>
        <Row>
          {/* The same price, tight (default) and pinned to 0–15: the pinned one is the
              flat line a shape-only chart must not draw by accident. */}
          <Sparkline data={PRICE} width={120} height={36} label="Price, tight scale" />
          <Sparkline data={PRICE} width={120} height={36} min={0} max={15} label="Price, 0–15" />
          <Sparkline
            data={PRICE}
            width={120}
            height={36}
            referenceValue={11}
            highlightLast={false}
            strokeWidth={3}
            label="Price vs target 11"
          />
          <Sparkline data={NET} variant="bar" width={120} height={36} highlightLast={false} label="Net, all bars equal" />
          <Sparkline data={[]} label="Nothing yet" />
        </Row>
        <OutTable
          rows={[
            ["label + formatValue", sparklineSummary(PRICE, DEFAULT_SPARKLINE_LABELS, euro)],
            [
              'labels (German) + locale="de-DE"',
              sparklineSummary(PRICE, { ...DEFAULT_SPARKLINE_LABELS, ...GERMAN_LABELS }, (v) =>
                new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(v),
              ),
            ],
            ["[] → noData", sparklineSummary([], DEFAULT_SPARKLINE_LABELS, String)],
            ["[5] → single", sparklineSummary([5], DEFAULT_SPARKLINE_LABELS, String)],
            ["[3, 7, 3] → flat", sparklineSummary([3, 7, 3], DEFAULT_SPARKLINE_LABELS, String)],
          ]}
        />
        <Row>
          <Sparkline data={PRICE} formatValue={euro} label="Price" />
          <Sparkline data={PRICE} locale="de-DE" labels={GERMAN_LABELS} label="Preis" />
        </Row>
      </div>
      <Note>
        The table is the exported <code className="font-mono">sparklineSummary()</code> — the
        same sentence the two sparklines in the last row carry as their accessible name
        (inspect them, or hover in a screen reader). <code className="font-mono">formatValue</code>{" "}
        decides how a figure is spoken, <code className="font-mono">locale</code> the default
        formatter&apos;s digits, and <code className="font-mono">labels</code> the sentence
        itself. <code className="font-mono">highlightLast={"{false}"}</code> drops the end dot
        on a line and stops dimming every bar but the last. <code className="font-mono">width</code>{" "}
        and <code className="font-mono">height</code> default to 72×24.
      </Note>
    </Example>
  );
}

function StatTileFormatting() {
  return (
    <Example
      label="StatTile — number formatting and remaining tones"
      hint="numberFormat merges over currency/compact; format replaces Intl outright; locale per tile"
    >
      <StatTileGrid minTileWidth="11rem">
        <StatTile
          label="Conversion"
          value={0.0734}
          numberFormat={{ style: "percent", minimumFractionDigits: 1 }}
          tone="brand"
          description='numberFormat: { style: "percent" }'
        />
        <StatTile
          label="Balance"
          value={1234567.891}
          currency="EUR"
          locale="de-DE"
          tone="net"
          description='locale="de-DE"'
          subValues={[
            { label: "Budget", value: 1200000, tone: "info" },
            { label: "Status", value: "on plan" },
          ]}
        />
        <StatTile
          label="Uptime"
          value={2591700}
          format={(sec) => `${Math.floor(sec / 86400)} d ${Math.floor((sec % 86400) / 3600)} h`}
          tone="info"
          delta={{ value: 3600 }}
          description="format: seconds → days and hours"
        />
        <StatTile label="Rating" value="" description='value="" shows the dash, like null' />
      </StatTileGrid>
      <Note>
        <code className="font-mono">format</code> formats <em>every</em> number on the tile —
        the uptime&apos;s delta reads &ldquo;0 d 1 h&rdquo;, not &ldquo;3,600&rdquo;. A sub-value
        takes its own <code className="font-mono">tone</code> (the info-coloured budget) or
        inherits the tile&apos;s, always at the muted weight; a string sub-value is rendered as
        given. Headline sizes key on the TILE&apos;s width (a container query), not the
        viewport — try the phone preview in the top bar: the grid drops to two columns and the
        figures step down with the tiles.
      </Note>
    </Example>
  );
}

function RouterishLink({ href, className, children, ...rest }: StatTileLinkProps) {
  // Stands in for a router's <Link>: marks itself so the specimen can show it was used.
  return (
    <a href={href} className={className} data-router-link="" {...rest}>
      {children}
    </a>
  );
}

function StatTileLinksAndLabels() {
  return (
    <Example
      label="StatTile — renderLink, custom sparkline and labels"
      hint="renderLink gets the stretched-link props; labels translate the spoken delta and states"
    >
      <StatTileGrid minTileWidth="12rem">
        <StatTile
          label="Open invoices"
          value={37}
          href="#/stats#kpi-row"
          renderLink={(props) => <RouterishLink {...props} />}
          delta={{ value: -5, label: "vs last week" }}
          goodDirection="down"
          description="Rendered through renderLink"
        />
        <StatTile
          label="Throughput"
          value={1840}
          unit="req/s"
          sparkline={<Sparkline data={NET} variant="bar" tone="signed" referenceValue={0} fluid height={28} label="Net change" />}
          description="sparkline wins over trend"
          trend={VISITS}
        />
        <StatTile
          label="Umsatz"
          value={9120}
          currency="EUR"
          locale="de-DE"
          delta={{ value: 0.08, unit: "percent", label: "ggü. Vormonat" }}
          goodDirection="up"
          labels={{
            increase: (a) => `Plus ${a}`,
            decrease: (a) => `Minus ${a}`,
            better: (c) => `${c} (besser)`,
            worse: (c) => `${c} (schlechter)`,
          }}
          description="labels: German spoken delta"
        />
        <StatTile label="Leerstand" value={null} labels={{ noValue: "Keine Daten" }} description='labels.noValue' />
      </StatTileGrid>
      <Note>
        <code className="font-mono">renderLink</code> is how an app hands in its router&apos;s{" "}
        <code className="font-mono">&lt;Link&gt;</code>: spread the props it receives — the class
        is what stretches the link over the whole tile. The German tile&apos;s delta is spoken
        as &ldquo;Plus 8 % (besser)&rdquo;; the words are screen-reader text, so inspect the
        tile or use a reader to hear them. Without <code className="font-mono">labels</code>, the
        tile takes the <code className="font-mono">statTile</code> bundle from the provider —
        switch the page language to see the whole page follow.
      </Note>
    </Example>
  );
}

function StatTileRtl() {
  return (
    <Example label="StatTile — right-to-left" hint={<code className="font-mono">dir=&quot;rtl&quot;</code>}>
      <div dir="rtl">
        <StatTileGrid minTileWidth="12rem">
          <StatTile
            label="الدخل"
            value={4210.5}
            currency="EUR"
            locale="ar-EG"
            tone="income"
            valueLabel="سبتمبر"
            subValues={[{ label: "أغسطس", value: 4890 }]}
            delta={{ value: 120, label: "مقابل الشهر الماضي" }}
            goodDirection="up"
            trend={VISITS}
            icon={<Users />}
            hint="متوسط الأشهر المغلقة"
          />
        </StatTileGrid>
      </div>
      <Note>
        The tile lays out with logical properties (<code className="font-mono">ms-auto</code>,{" "}
        <code className="font-mono">text-start</code>): the period sits at the start, the figure
        and sub-values at the end, the icon at the top end — all mirrored. The sparkline is not
        mirrored, on purpose: time runs left to right in a chart in both directions.
      </Note>
    </Example>
  );
}
