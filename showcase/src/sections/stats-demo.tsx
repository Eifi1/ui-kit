import { Activity, Users } from "lucide-react";
import { Sparkline, StatTile, StatTileGrid } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

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
          <StatTile label="Invoices" value={128} href="#invoices" hint="Open and overdue" icon={<Activity />} />
          <StatTile label="Units" value={42} onClick={() => undefined} description="Click the tile" />
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
    </>
  );
}
