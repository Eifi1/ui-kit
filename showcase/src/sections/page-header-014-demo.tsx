import { ChevronLeft, ChevronRight, ChevronsDownUp, ChevronsUpDown, Plus } from "lucide-react";
import { ButtonGroup, IconButton, PageHeader, SectionLabel, Select } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * The 0.14 PageHeader props, all from keksdose adopting 0.13: `truncateTitle` (G6a,
 * payees), `secondaryActions` (G6b, budget) and `actionsAlign` (G8, reports).
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

function PageHeaderTruncate() {
  const title = "Payees, merchants and everyone else money goes to or comes from";
  const add = (
    <IconButton aria-label="New payee">
      <Plus />
    </IconButton>
  );
  return (
    <Example label="PageHeader — truncateTitle" hint="one line with an ellipsis instead of breaking">
      <div className="max-w-sm space-y-6">
        <div className="space-y-1">
          <SectionLabel as="p" size="xs">
            default
          </SectionLabel>
          <PageHeader as="h2" size="compact" mobileLayout="inline" title={title} actions={add} />
        </div>
        <div className="space-y-1">
          <SectionLabel as="p" size="xs">
            truncateTitle
          </SectionLabel>
          <PageHeader as="h2" size="compact" mobileLayout="inline" truncateTitle title={title} actions={add} />
        </div>
        <Note>
          The whole title stays the heading&apos;s text, so a screen reader reads all of it. No native{" "}
          {code("title")} tooltip: the kit does not use them.
        </Note>
      </div>
    </Example>
  );
}

function PageHeaderSecondaryActions() {
  return (
    <Example label="PageHeader — secondaryActions" hint="narrow the window below 640px: a second row on a phone">
      <div className="space-y-4">
        <PageHeader
          as="h2"
          size="compact"
          mobileLayout="inline"
          title="Budget"
          actions={
            <div className="flex items-center gap-1">
              <IconButton aria-label="Previous month">
                <ChevronLeft />
              </IconButton>
              <span className="text-sm tabular-nums">September 2026</span>
              <IconButton aria-label="Next month">
                <ChevronRight />
              </IconButton>
            </div>
          }
          secondaryActions={
            <ButtonGroup aria-label="Fold groups">
              <IconButton size="sm" aria-label="Collapse all">
                <ChevronsDownUp />
              </IconButton>
              <IconButton size="sm" aria-label="Expand all">
                <ChevronsUpDown />
              </IconButton>
            </ButtonGroup>
          }
        />
        <Note>
          On a phone: title and {code("actions")} on row 1, {code("secondaryActions")} on row 2. From{" "}
          {code("sm")}: one row, title | secondary | actions. The reading and Tab order is title, actions,
          secondary at every width.
        </Note>
      </div>
    </Example>
  );
}

function PageHeaderActionsAlign() {
  const currency = (
    <Select className="w-full sm:w-44" label="Reporting currency" defaultValue="EUR">
      <option value="EUR">EUR</option>
      <option value="USD">USD</option>
    </Select>
  );
  return (
    <Example label="PageHeader — actionsAlign" hint="a labelled field beside the title">
      <div className="space-y-6">
        <div className="space-y-1">
          <SectionLabel as="p" size="xs">
            default (start)
          </SectionLabel>
          <PageHeader as="h2" size="compact" title="Reports" actions={currency} />
        </div>
        <div className="space-y-1">
          <SectionLabel as="p" size="xs">
            actionsAlign=&quot;center&quot;
          </SectionLabel>
          <PageHeader as="h2" size="compact" title="Reports" actionsAlign="center" actions={currency} />
        </div>
        <Note>
          Unset keeps each layout&apos;s own: {code("start")} for {code("stacked")}, {code("center")} for{" "}
          {code("inline")}. With {code("stacked")} it applies from {code("sm")} up, where the header is a row.
        </Note>
      </div>
    </Example>
  );
}

export function PageHeader014Demo() {
  return (
    <>
      <PageHeaderTruncate />
      <PageHeaderSecondaryActions />
      <PageHeaderActionsAlign />
    </>
  );
}
