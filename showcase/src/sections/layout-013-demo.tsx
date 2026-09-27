import { useState } from "react";
import { ChevronLeft, ChevronRight, Hammer, Search } from "lucide-react";
import {
  Button,
  IconButton,
  List,
  ListItem,
  PageHeader,
  SectionLabel,
  Sparkline,
  ToggleGroup,
} from "@eifi1/ui-kit";
import type { PageHeaderSize } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * The 0.13 layout props: PageHeader `size="compact"` and `mobileLayout="inline"`
 * (keksdose F4), SectionLabel `variant="band"` (keksdose F5) and `size="md"` over a
 * chart column (lenkbank P9), and ListItem `titleLines` (kastlan 44).
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

/* ── PageHeader ───────────────────────────────────────────────────────────── */

function PageHeaderSizes() {
  const [size, setSize] = useState<PageHeaderSize>("compact");
  return (
    <Example label="PageHeader — size compact" hint="text-xl at every width: keksdose's page title">
      <div className="space-y-4">
        <ToggleGroup<PageHeaderSize>
          aria-label="Title size"
          value={size}
          onChange={setSize}
          options={[
            { value: "sm", label: "sm" },
            { value: "compact", label: "compact" },
            { value: "md", label: "md" },
          ]}
        />
        <PageHeader
          as="h2"
          size={size}
          title="Budgets"
          description="What each category may still spend this month."
          actions={<Button size="sm">New budget</Button>}
        />
        <Note>
          {code("sm")} is {code("text-lg")}, {code("compact")} {code("text-xl")} everywhere, {code("md")}{" "}
          {code("text-xl")} on a phone and {code("text-2xl")} from {code("sm")} up. A word rather than a letter
          because no letter sits between {code("sm")} and {code("md")}.
        </Note>
      </div>
    </Example>
  );
}

function PageHeaderInline() {
  const month = (
    <div className="flex items-center gap-1">
      <IconButton aria-label="Previous month">
        <ChevronLeft />
      </IconButton>
      <IconButton aria-label="Next month">
        <ChevronRight />
      </IconButton>
    </div>
  );
  return (
    <Example label="PageHeader — mobileLayout inline" hint="narrow the window below 640px to see the difference">
      <div className="space-y-6">
        <div className="space-y-1">
          <SectionLabel as="p" size="xs">
            stacked (default)
          </SectionLabel>
          <PageHeader as="h2" size="compact" title="Transactions" actions={month} />
        </div>
        <div className="space-y-1">
          <SectionLabel as="p" size="xs">
            inline
          </SectionLabel>
          <PageHeader
            as="h2"
            size="compact"
            mobileLayout="inline"
            title="Transactions"
            actions={
              <IconButton aria-label="Search">
                <Search />
              </IconButton>
            }
          />
        </div>
        <Note>
          {code("inline")} keeps a header tuned for the phone (keksdose live #263) a row: the actions stay beside
          the title and do not wrap, so use it for one or two small controls.
        </Note>
      </div>
    </Example>
  );
}

/* ── SectionLabel ─────────────────────────────────────────────────────────── */

function SectionLabelBand() {
  const days: Array<[string, Array<[string, string]>]> = [
    [
      "Today",
      [
        ["Bakery", "−€ 4.20"],
        ["Train ticket", "−€ 3.10"],
      ],
    ],
    ["Yesterday", [["Salary", "€ 2,480.00"]]],
  ];
  return (
    <Example label="SectionLabel — variant band" hint="a list's group header: surface-2 bar, bottom border" className="p-0">
      <div className="overflow-hidden rounded-lg">
        {days.map(([day, rows]) => (
          <section key={day}>
            <SectionLabel as="h3" variant="band">
              {day}
            </SectionLabel>
            <List separator="divider" density="comfortable">
              {rows.map(([name, amount]) => (
                <ListItem key={name} title={name} trailing={<span className="tabular-nums">{amount}</span>} />
              ))}
            </List>
          </section>
        ))}
      </div>
    </Example>
  );
}

function SectionLabelChartColumns() {
  const income = [3, 4, 4, 5, 6, 5, 7, 8];
  const spending = [5, 4, 6, 5, 5, 7, 6, 6];
  return (
    <Example label="SectionLabel — md over a chart column" hint="11px, centred over each of a pair of facing charts">
      <div className="grid grid-cols-2 gap-6">
        {(
          [
            ["Income", income, "income"],
            ["Spending", spending, "expense"],
          ] as const
        ).map(([label, data, tone]) => (
          <div key={label} className="space-y-1">
            <SectionLabel as="p" size="md" className="text-center">
              {label}
            </SectionLabel>
            <Sparkline data={data} variant="bar" tone={tone} fluid height={48} label={label} />
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Note>
          {code("xs")} inside a control (a legend, a menu), {code("md")} over a figure or a plot, {code("sm")}{" "}
          over a block of page content.
        </Note>
      </div>
    </Example>
  );
}

/* ── ListItem ─────────────────────────────────────────────────────────────── */

function ListItemTitleLines() {
  const defect =
    "Crack in the bathroom tiles behind the washbasin, about 20 cm long, running down to the skirting";
  return (
    <Example label="ListItem — titleLines" hint="a free-text name that one truncated line cannot tell apart">
      <List separator="divider">
        <ListItem icon={Hammer} title={defect} subtitle="titleLines={1} (default)" onClick={() => {}} />
        <ListItem icon={Hammer} title={defect} titleLines={2} align="start" subtitle="titleLines={2}" onClick={() => {}} />
        <ListItem
          icon={Hammer}
          title={defect}
          titleLines="all"
          align="start"
          subtitle='titleLines="all"'
          onClick={() => {}}
        />
      </List>
    </Example>
  );
}

export function Layout013Demo() {
  return (
    <>
      <PageHeaderSizes />
      <PageHeaderInline />
      <SectionLabelBand />
      <SectionLabelChartColumns />
      <ListItemTitleLines />
    </>
  );
}
