import { useState } from "react";
import {
  Bike,
  Building2,
  Car,
  Coffee,
  Gamepad2,
  Gift,
  HeartPulse,
  House,
  KeyRound,
  Plane,
  ShoppingCart,
  Utensils,
  Wrench,
} from "lucide-react";
import {
  Chip,
  ChoiceCard,
  ChoiceCardGroup,
  IconPicker,
  SwatchPicker,
  ToggleGroup,
} from "@eifi1/ui-kit";
import type { IconOption, SwatchOption } from "@eifi1/ui-kit";
import { Example, Note, Stage } from "../lib/section";

/**
 * SELECTION — the one-of-n and any-of-n controls added in 0.6.0: the swatch and icon
 * pickers (radio groups of tiles), the choice card, the clearable toggle group, and the
 * chip's touch size and money tones. Every specimen is live; the readout under each is
 * derived from state, so the value the control emits is on the page.
 */

type Colour = "c1" | "c2" | "c3" | "c4" | "c5" | "c6";
const COLOURS: SwatchOption<Colour>[] = [
  { value: "c1", color: "var(--chart-1)", label: "Colour 1" },
  { value: "c2", color: "var(--chart-2)", label: "Colour 2" },
  { value: "c3", color: "var(--chart-3)", label: "Colour 3" },
  { value: "c4", color: "var(--chart-4)", label: "Colour 4", note: "Used by Groceries" },
  { value: "c5", color: "var(--chart-5)", label: "Colour 5" },
  { value: "c6", color: "var(--chart-6)", label: "Colour 6" },
];

type Glyph =
  | "home"
  | "cart"
  | "food"
  | "coffee"
  | "car"
  | "bike"
  | "plane"
  | "health"
  | "gift"
  | "game"
  | "tools";
const SYMBOLS: IconOption<Glyph>[] = [
  { value: "home", icon: House, label: "House", keywords: ["rent", "home"] },
  { value: "cart", icon: ShoppingCart, label: "Shopping cart", keywords: ["groceries"] },
  { value: "food", icon: Utensils, label: "Cutlery", keywords: ["restaurant", "food"] },
  { value: "coffee", icon: Coffee, label: "Coffee cup", keywords: ["café"] },
  { value: "car", icon: Car, label: "Car", note: "Used by Transport" },
  { value: "bike", icon: Bike, label: "Bicycle" },
  { value: "plane", icon: Plane, label: "Plane", keywords: ["travel", "holiday"] },
  { value: "health", icon: HeartPulse, label: "Heartbeat", keywords: ["health", "doctor"] },
  { value: "gift", icon: Gift, label: "Gift" },
  { value: "game", icon: Gamepad2, label: "Game controller", keywords: ["games"] },
  { value: "tools", icon: Wrench, label: "Wrench", keywords: ["repairs"] },
];

type Role = "owner" | "manager" | "viewer";
type Status = "open" | "waiting" | "closed";

const shown = (v: unknown) =>
  v === null ? "null" : v === undefined ? "undefined" : JSON.stringify(v);

export function SelectionDemo() {
  const [colour, setColour] = useState<Colour | null>("c2");
  const [flag, setFlag] = useState<Colour | null>(null);
  const [bulkMixed, setBulkMixed] = useState(true);
  const [symbol, setSymbol] = useState<Glyph | null>("cart");
  const [role, setRole] = useState<Role | null>("manager");
  const [roles, setRoles] = useState<Role[]>(["viewer"]);
  const [recurring, setRecurring] = useState(true);
  const [status, setStatus] = useState<Status | null>("open");
  const [outflow, setOutflow] = useState(true);
  const [range, setRange] = useState("month");

  return (
    <>
      <Example
        label="SwatchPicker"
        hint="role=radiogroup; one tab stop, arrows move and choose, flipped in RTL"
      >
        <Stage>
          <div className="space-y-2">
            <SwatchPicker
              aria-label="Category colour"
              options={COLOURS}
              value={colour}
              onChange={setColour}
              allowNone
            />
            <p className="text-xs text-[var(--text-muted)]">value: {shown(colour)}</p>
          </div>
          <div className="space-y-2">
            <SwatchPicker
              aria-label="Flag, for the selected rows"
              options={COLOURS}
              value={flag}
              mixed={bulkMixed}
              onChange={(next) => {
                setFlag(next);
                setBulkMixed(false);
              }}
              allowNone
              activation="manual"
              size="lg"
            />
            <p className="text-xs text-[var(--text-muted)]">
              {bulkMixed ? "mixed — the rows disagree" : `value: ${shown(flag)}`}
            </p>
          </div>
        </Stage>
        <Note>
          The second is a bulk edit: <code className="font-mono">mixed</code> checks nothing (not
          even &quot;none&quot;) and describes the group as mixed;{" "}
          <code className="font-mono">activation=&quot;manual&quot;</code> lets the arrows move
          without saving on every step, and <code className="font-mono">size=&quot;lg&quot;</code>{" "}
          is the 44px touch target. A tile with a <code className="font-mono">note</code> wears a
          dot and says the note in its bubble and its description.
        </Note>
      </Example>

      <Example label="IconPicker" hint="searchable; matches label and keywords, accent-insensitive">
        <Stage>
          <div className="space-y-2">
            <IconPicker
              aria-label="Category symbol"
              options={SYMBOLS}
              value={symbol}
              onChange={setSymbol}
              allowNone
              searchable
            />
            <p className="text-xs text-[var(--text-muted)]">value: {shown(symbol)}</p>
          </div>
        </Stage>
      </Example>

      <Example
        label="ChoiceCard"
        hint="a native checkbox or radio; the whole card is the hit area"
      >
        <Stage>
          <div data-stage="wide" className="mx-auto max-w-2xl space-y-4">
            <ChoiceCardGroup<Role>
              legend="Invite as"
              options={[
                {
                  value: "owner",
                  title: "Owner",
                  description: "Everything, including billing.",
                  icon: KeyRound,
                },
                {
                  value: "manager",
                  title: "Manager",
                  description: "Properties, leases and tenants.",
                  icon: Building2,
                },
                {
                  value: "viewer",
                  title: "Viewer",
                  description: "Reads everything, changes nothing.",
                },
              ]}
              value={role}
              onChange={setRole}
            />
            <ChoiceCardGroup<Role>
              multiple
              legend="Roles"
              options={[
                { value: "owner", title: "Owner" },
                { value: "manager", title: "Manager" },
                { value: "viewer", title: "Viewer" },
              ]}
              value={roles}
              onChange={setRoles}
              className="sm:grid-cols-3"
            />
            <ChoiceCard
              title="Set up recurring rent"
              description="Creates a rent invoice on the first of every month, starting with this one."
              checked={recurring}
              onCheckedChange={setRecurring}
            />
            <p className="text-xs text-[var(--text-muted)]">
              role: {shown(role)} · roles: {shown(roles)} · recurring: {shown(recurring)}
            </p>
          </div>
        </Stage>
      </Example>

      <Example label="ToggleGroup — allowEmpty" hint="click the active option to clear it">
        <Stage>
          <div className="space-y-2">
            <ToggleGroup<Status>
              allowEmpty
              aria-label="Status filter"
              value={status}
              onChange={setStatus}
              options={[
                { value: "open", label: "Open" },
                { value: "waiting", label: "Waiting" },
                { value: "closed", label: "Closed" },
              ]}
            />
            <p className="text-xs text-[var(--text-muted)]">value: {shown(status)}</p>
          </div>
        </Stage>
        <Note>
          With <code className="font-mono">allowEmpty</code> the options are toggle buttons
          (<code className="font-mono">aria-pressed</code>) rather than radios, and{" "}
          <code className="font-mono">onChange</code> is typed to receive{" "}
          <code className="font-mono">null</code> — without it, nothing changes for existing
          callers.
        </Note>
      </Example>

      <Example
        label="Chip — touch size and money tones"
        hint='size="lg" is 44px; income/expense tint text and border only'
      >
        <Stage>
          <div data-stage="wide" className="flex flex-wrap items-center justify-center gap-2">
            {/* The label names the ON state and never changes; `selected` carries the
                state, and "pressed" is announced for it. */}
            <Chip size="lg" tone="expense" selected={outflow} onClick={() => setOutflow((o) => !o)}>
              Outflow
            </Chip>
            {(["week", "month", "year"] as const).map((r) => (
              <Chip key={r} size="lg" tone="brand" selected={range === r} onClick={() => setRange(r)}>
                {r === "week" ? "This week" : r === "month" ? "This month" : "This year"}
              </Chip>
            ))}
            <Chip tone="income">Income</Chip>
            <Chip tone="expense">Expense</Chip>
            <Chip tone="income" size="sm">
              +12.50
            </Chip>
          </div>
        </Stage>
      </Example>
    </>
  );
}
