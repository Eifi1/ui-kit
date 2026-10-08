import { useEffect, useRef, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FieldHint,
  IconButton,
  Select,
  StatTile,
  StatTileGrid,
} from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * The 0.16 surface props from keksdose's 0.15.5 sweep: Card parts that follow the
 * card's padding, CardTitle `as`, CardHeader `stackAction`, Card `toneStrength`,
 * IconButton `pending` (and its lazy label bubble), a FieldHint on an unlabelled
 * Select, and StatTile `variant` / StatTileGrid `stretch` and `loading`.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

function CardParts016() {
  return (
    <Example
      label="Card — padded card, parts, stacked action"
      hint='padding="md" pads once; CardHeader stackAction; CardTitle as="h3"'
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card padding="md">
          <CardHeader stackAction>
            <CardTitle as="h3" className="text-[var(--text-primary)]">
              Two-factor authentication
            </CardTitle>
            <CardDescription>An authenticator app or a passkey, asked at every sign-in.</CardDescription>
            <CardAction>
              <Button size="sm" variant="secondary">
                Set up two-factor
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="pt-3 text-sm text-[var(--text-secondary)]">
            Not set up yet.
          </CardContent>
        </Card>
        <Card variant="outline" padding="sm">
          <CardHeader>
            <CardTitle as="h3" className="text-sm text-[var(--text-primary)]">
              Sessions
            </CardTitle>
            <CardDescription className="text-xs">Signed in on 3 devices.</CardDescription>
            <CardAction>
              <IconButton size="sm" label="Refresh sessions">
                <RefreshCw />
              </IconButton>
            </CardAction>
          </CardHeader>
        </Card>
      </div>
      <div className="mt-3">
        <Note>
          A card with {code("padding")} (or {code("inset")} / {code("outline")}, which carry one)
          tells its parts so, and they add no {code("px-6")} / {code("pt-6")} of their own — the
          card is padded once. {code("stackAction")} puts a wide action under the title below{" "}
          {code("sm")}; the icon action on the right stays beside its title at every width at Normal.
          At Large, where an IconButton shows its label, an unset {code("stackAction")} stacks it below{" "}
          {code("sm")} too, and {code("stackAction={false}")} keeps it beside the title.
        </Note>
      </div>
    </Example>
  );
}

function StrongTone016() {
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const run = () => {
    setPending(true);
    timer.current = setTimeout(() => setPending(false), 1800);
  };
  return (
    <Example
      label="Card toneStrength, IconButton pending"
      hint='tone="danger" toneStrength="strong": 2px --danger-border-strong; pending swaps the glyph for a spinner'
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card tone="danger" padding="md">
          <CardTitle className="text-sm">Soft (default)</CardTitle>
          <CardDescription className="mt-1 text-xs">1px --danger-border.</CardDescription>
        </Card>
        <Card tone="danger" toneStrength="strong" padding="md">
          <CardHeader>
            <CardTitle as="h3" className="text-sm">
              Delete account
            </CardTitle>
            <CardDescription className="text-xs">Removes every booking. This cannot be undone.</CardDescription>
            <CardAction>
              <IconButton label="Delete account" tone="danger" quiet={false} pending={pending} onClick={run}>
                <Trash2 />
              </IconButton>
            </CardAction>
          </CardHeader>
        </Card>
      </div>
      <Row className="mt-3">
        <IconButton label="Refresh" pending={pending} onClick={run}>
          <RefreshCw />
        </IconButton>
        <IconButton size="xs" label="Refresh" pending={pending} onClick={run}>
          <RefreshCw />
        </IconButton>
        <Button size="sm" variant="secondary" onClick={run}>
          Run for 1.8s
        </Button>
      </Row>
    </Example>
  );
}

function SelectHint016() {
  return (
    <Example label="Select — FieldHint without a label line" hint="aria-label + hint: the ? sits at the field's end">
      <div className="max-w-xs">
        <Select aria-label="Account type" hint={<FieldHint label="Decides what answers the balance." />}>
          <option>Giro</option>
          <option>Savings</option>
        </Select>
      </div>
    </Example>
  );
}

function StatTiles016() {
  const [loading, setLoading] = useState(false);
  return (
    <Example
      label="StatTile variant, StatTileGrid stretch and loading"
      hint='tiles inside a card: variant="inset" / "plain"; stretch={false} keeps column width'
    >
      <div className="space-y-4">
        <Card padding="md">
          <CardTitle className="mb-3 text-sm text-[var(--text-primary)]">September (inset, stretch=false)</CardTitle>
          <StatTileGrid stretch={false} loading={loading}>
            <StatTile variant="inset" label="Income" value={4210} currency="EUR" tone="income" />
            <StatTile variant="inset" label="Spent" value={2895.5} currency="EUR" tone="expense" delta={-120} />
          </StatTileGrid>
        </Card>
        <Card padding="md">
          <CardTitle className="mb-3 text-sm text-[var(--text-primary)]">Balance (plain, stretch=false)</CardTitle>
          <StatTileGrid stretch={false} loading={loading}>
            <StatTile variant="plain" label="Balance" value={12840.12} currency="EUR" />
          </StatTileGrid>
        </Card>
        <Row>
          <Button size="sm" variant="secondary" onClick={() => setLoading((v) => !v)}>
            {loading ? "Stop loading" : "Load the grids"}
          </Button>
        </Row>
        <Note>
          A loading grid says “Loading…” once, in a status region, and its tiles keep the
          sentence to themselves; before, every tile carried its own.
        </Note>
      </div>
    </Example>
  );
}

export function Surfaces016Demo() {
  return (
    <>
      <CardParts016 />
      <StrongTone016 />
      <SelectHint016 />
      <StatTiles016 />
    </>
  );
}
