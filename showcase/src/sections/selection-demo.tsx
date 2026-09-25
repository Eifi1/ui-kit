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
  Button,
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
type Plan = "basic" | "plus" | "pro";
type Perm = "read" | "write" | "admin";
type Channel = "mail" | "sms" | "push";

/** Colours that live in CLASSES rather than values — `swatchClassName` paints the dot,
 *  and a light/dark pair is exactly what a class can hold and an inline colour cannot. */
const CLASS_SWATCHES: SwatchOption<Colour>[] = [
  { value: "c1", label: "Ink", swatchClassName: "bg-[var(--text-primary)]" },
  { value: "c2", label: "Brand", swatchClassName: "bg-[var(--brand)]" },
  { value: "c3", label: "Income", swatchClassName: "bg-[var(--money-income)]" },
  { value: "c4", label: "Expense", swatchClassName: "bg-[var(--money-expense)]" },
  { value: "c5", label: "Retired colour", swatchClassName: "bg-[var(--border-strong)]", disabled: true },
];
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
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  const [lockedStatus] = useState<Status>("waiting");
  const [bulkSymbol, setBulkSymbol] = useState<Glyph | null>(null);
  const [bulkSymbolMixed, setBulkSymbolMixed] = useState(true);
  const [themed, setThemed] = useState<Colour | null>("c3");
  const [deSymbol, setDeSymbol] = useState<Glyph | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planTried, setPlanTried] = useState(false);
  const [perms, setPerms] = useState<Perm[]>(["read"]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelsSent, setChannelsSent] = useState<string | null>(null);
  const [autopay, setAutopay] = useState<"on" | "off">("on");
  const [ack, setAck] = useState(false);
  const [ackTried, setAckTried] = useState(false);
  const [rtlColour, setRtlColour] = useState<Colour | null>("c1");
  const [rtlRole, setRtlRole] = useState<Role | null>("owner");

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
        label="SwatchPicker & IconPicker — mixed, disabled, class colours and labels"
        hint="per-option disabled · whole-picker disabled · swatchClassName · labels"
      >
        <Stage>
          <div className="space-y-2">
            <SwatchPicker
              aria-label="Theme colour (class-painted)"
              options={CLASS_SWATCHES}
              value={themed}
              onChange={setThemed}
            />
            <p className="text-xs text-[var(--text-muted)]">
              value: {shown(themed)} · the last tile is disabled
            </p>
          </div>
          <div className="space-y-2">
            <SwatchPicker
              aria-label="Category colour (locked)"
              options={COLOURS}
              value="c4"
              onChange={() => {}}
              disabled
            />
            <p className="text-xs text-[var(--text-muted)]">disabled — the choice stays visible</p>
          </div>
          <div className="space-y-2">
            <IconPicker
              aria-label="Symbol, for the selected rows"
              options={SYMBOLS.slice(0, 6)}
              value={bulkSymbol}
              mixed={bulkSymbolMixed}
              onChange={(next) => {
                setBulkSymbol(next);
                setBulkSymbolMixed(false);
              }}
              allowNone
              activation="manual"
              size="lg"
            />
            <p className="text-xs text-[var(--text-muted)]">
              {bulkSymbolMixed ? "mixed — arrows move, Space/Enter chooses" : `value: ${shown(bulkSymbol)}`}
            </p>
          </div>
          <div className="space-y-2">
            {/* Every string the picker renders, from `labels` — type "xyz" to see
                noResults, and the count is the live region's resultCount. */}
            <IconPicker
              aria-label="Kategoriesymbol"
              options={SYMBOLS}
              value={deSymbol}
              onChange={setDeSymbol}
              allowNone
              searchable
              size="sm"
              labels={{
                none: "Kein Symbol",
                search: "Symbole suchen",
                noResults: "Kein Symbol passt",
                resultCount: (n) => (n === 1 ? "1 Symbol" : `${n} Symbole`),
              }}
            />
            <p className="text-xs text-[var(--text-muted)]">value: {shown(deSymbol)}</p>
          </div>
          <div className="space-y-2">
            <IconPicker
              aria-label="Category symbol (locked)"
              options={SYMBOLS.slice(0, 6)}
              value="car"
              onChange={() => {}}
              disabled
            />
          </div>
          <div className="space-y-2">
            <SwatchPicker
              aria-label="Farbe"
              options={COLOURS}
              value={null}
              mixed
              onChange={() => {}}
              allowNone
              labels={{
                none: "Keine Farbe",
                mixed: "Gemischt: die gewählten Zeilen haben verschiedene Farben",
              }}
            />
            <p className="text-xs text-[var(--text-muted)]">
              labels.none names the ∅ tile; labels.mixed describes the group
            </p>
          </div>
        </Stage>
      </Example>

      <Example
        label="Tiles that follow their container"
        hint='tileClassName="@max-md:size-11" · size="sm" · allowNone'
      >
        <Stage>
          {/* `@container` on the caller's own box: the query is the caller's, and the
              kit's markup is never reached into. Narrower than 28rem, the tiles grow
              to the 44px touch target; wider, they are the compact 28px. */}
          <div data-stage="wide" className="@container space-y-3">
            <SwatchPicker
              aria-label="Category colour (container-sized tiles)"
              options={COLOURS}
              value={colour}
              onChange={setColour}
              allowNone
              size="sm"
              tileClassName="@max-md:size-11"
            />
            <IconPicker
              aria-label="Category symbol (container-sized tiles)"
              options={SYMBOLS}
              value={symbol}
              onChange={setSymbol}
              allowNone
              size="sm"
              tileClassName="@max-md:size-11"
            />
          </div>
        </Stage>
        <Note>
          <code className="font-mono">tileClassName</code> is merged after the kit&apos;s own
          classes, so a <code className="font-mono">size-*</code> in it beats{" "}
          <code className="font-mono">size</code>&apos;s. The dot or glyph inside keeps{" "}
          <code className="font-mono">size</code>&apos;s dimensions; only the tile grows. Narrow
          the window below about 500px to see it switch.
        </Note>
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

      <Example
        label="ChoiceCard — states"
        hint="radio · indeterminate · invalid · error · disabled · required, on a single card and on a group"
      >
        <Stage>
          <div data-stage="wide" className="mx-auto max-w-2xl space-y-5">
            <div className="grid gap-2 sm:grid-cols-2">
              {/* A standalone radio pair: `type="radio"` and a shared `name`, so the
                  browser's own arrow keys move between them. */}
              <ChoiceCard
                type="radio"
                name="autopay"
                value="on"
                title="Pay automatically"
                description="On the due date, from the default account."
                icon={Building2}
                checked={autopay === "on"}
                onCheckedChange={(on) => on && setAutopay("on")}
              />
              <ChoiceCard
                type="radio"
                name="autopay"
                value="off"
                title="Pay by hand"
                description="You get a reminder three days before."
                checked={autopay === "off"}
                onCheckedChange={(on) => on && setAutopay("off")}
              />
              <ChoiceCard
                title="All permissions"
                description="Some but not all are granted."
                indeterminate
                readOnly
              />
              <ChoiceCard title="Disabled, checked" description="Set by the plan." disabled checked readOnly />
              <ChoiceCard title="Invalid, no message" invalid />
              <ChoiceCard
                title="I have read the lease"
                description="Both pages, including the house rules."
                required
                checked={ack}
                onCheckedChange={setAck}
                error={ackTried && !ack ? "Confirm you have read the lease." : undefined}
              />
            </div>
            {/* A group's `error` names the answer as a whole and is attached to the
                fieldset; `required` reaches EVERY radio as the native attribute (any one
                satisfies the set, each announces "required"). No `legend` here, so the
                group is named by `aria-label` and there is nowhere to draw the star. */}
            <ChoiceCardGroup<Plan>
              aria-label="Plan"
              name="plan"
              required
              options={[
                { value: "basic", title: "Basic", description: "One property." },
                { value: "plus", title: "Plus", description: "Up to ten." },
                { value: "pro", title: "Pro", description: "Unlimited.", disabled: true },
              ]}
              value={plan}
              onChange={setPlan}
              error={planTried && plan === null ? "Choose a plan to continue." : undefined}
              className="sm:grid-cols-3"
              cardClassName="p-2"
            />
            {/* Checkbox mode + `required` = "at least one": every box is `required`
                while none is ticked, and none is once one is. The star goes on the
                legend, once — the cards inside a group draw none of their own. */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setChannelsSent(channels.join(", "));
              }}
              className="space-y-2"
            >
              <ChoiceCardGroup<Channel>
                multiple
                required
                legend="Notify me by"
                name="channels"
                options={[
                  { value: "mail", title: "E-mail" },
                  { value: "sms", title: "Text message" },
                  { value: "push", title: "Push" },
                ]}
                value={channels}
                onChange={(v) => {
                  setChannels(v);
                  setChannelsSent(null);
                }}
                className="sm:grid-cols-3"
                cardClassName="p-2"
              />
              <Button type="submit" variant="secondary">
                Submit (native form)
              </Button>
              <p className="text-xs text-[var(--text-muted)]">
                {channelsSent === null
                  ? "not submitted — with nothing ticked the browser refuses and points at the first box"
                  : `submitted: ${channelsSent}`}
              </p>
            </form>
            <ChoiceCardGroup<Perm>
              multiple
              legend="Permissions (whole group disabled)"
              disabled
              options={[
                { value: "read", title: "Read" },
                { value: "write", title: "Write" },
                { value: "admin", title: "Admin" },
              ]}
              value={perms}
              onChange={setPerms}
              className="sm:grid-cols-3"
            />
            <div className="flex justify-center">
              <Button
                variant="secondary"
                onClick={() => {
                  setPlanTried(true);
                  setAckTried(true);
                }}
              >
                Continue
              </Button>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              autopay: {shown(autopay)} · plan: {shown(plan)} · lease read: {shown(ack)}
            </p>
          </div>
        </Stage>
        <Note>
          Press <strong>Continue</strong> with nothing chosen to raise both errors.{" "}
          <code className="font-mono">cardClassName</code> reaches every card of a group (tighter
          padding on the plan cards), <code className="font-mono">className</code> the grid; a
          per-option <code className="font-mono">disabled</code> greys one card (Pro), the
          group&apos;s own <code className="font-mono">disabled</code> is the fieldset&apos;s.{" "}
          <code className="font-mono">required</code> is the native attribute plus the kit&apos;s{" "}
          <code className="font-mono">aria-hidden</code> star: after the title on a lone card (the
          lease), after the <code className="font-mono">legend</code> on a group (&quot;Notify me
          by&quot;). On a radio group every radio is required; on a checkbox group it means
          &quot;at least one&quot; — every box is required while none is ticked, so an empty set
          cannot be submitted and nothing demands a second box once one is ticked.
        </Note>
      </Example>

      <Example
        label="ToggleGroup — allowEmpty, required and disabled"
        hint="click the active option to clear it · optionClassName · per-option className"
      >
        <Stage>
          <div className="space-y-2">
            <ToggleGroup
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
          <div className="space-y-2">
            {/* Without allowEmpty: radios, one option is always the answer. */}
            <ToggleGroup
              aria-label="Period"
              value={period}
              onChange={setPeriod}
              optionClassName="px-4"
              options={[
                { value: "month", label: "Month" },
                { value: "quarter", label: "Quarter" },
                { value: "year", label: "Year", className: "font-semibold" },
              ]}
            />
            <p className="text-xs text-[var(--text-muted)]">value: {shown(period)} (required mode)</p>
          </div>
          <div className="space-y-2">
            <ToggleGroup
              aria-label="Status (locked)"
              disabled
              value={lockedStatus}
              onChange={() => {}}
              options={[
                { value: "open", label: "Open" },
                { value: "waiting", label: "Waiting" },
                { value: "closed", label: "Closed" },
              ]}
            />
            <p className="text-xs text-[var(--text-muted)]">disabled — the chosen one keeps its fill</p>
          </div>
        </Stage>
        <Note>
          With <code className="font-mono">allowEmpty</code> the options are toggle buttons
          (<code className="font-mono">aria-pressed</code>) rather than radios, and{" "}
          <code className="font-mono">onChange</code> is typed to receive{" "}
          <code className="font-mono">null</code> — without it, nothing changes for existing
          callers. Since 0.7 the value type is inferred from{" "}
          <code className="font-mono">value</code> and <code className="font-mono">onChange</code>{" "}
          in both modes, so a <code className="font-mono">useState&lt;Status | null&gt;</code>{" "}
          setter goes straight in — no <code className="font-mono">&lt;ToggleGroup&lt;Status&gt;&gt;</code>.
          In radio mode (the Period group) the group is ONE tab stop — the checked option, or the
          first — and ← → (and ↑ ↓, Home, End) move and choose, following the reading direction in
          RTL, as a native radio set does. The <code className="font-mono">allowEmpty</code> buttons
          stay separate tab stops, each toggled with Space or Enter.
        </Note>
      </Example>

      <Example label="Pickers and cards, right-to-left" hint={<code className="font-mono">dir=&quot;rtl&quot;</code>}>
        <Stage>
          <div data-stage="wide" dir="rtl" className="mx-auto max-w-2xl space-y-4">
            {/* Arrow keys follow the picture: → moves right, which in an RTL row is back
                towards its start (the previous tile in DOM order). */}
            <SwatchPicker
              aria-label="لون الفئة"
              options={COLOURS}
              value={rtlColour}
              onChange={setRtlColour}
              allowNone
              labels={{ none: "بلا لون" }}
            />
            <ChoiceCardGroup<Role>
              legend="دعوة بصفة"
              options={[
                { value: "owner", title: "مالك", description: "كل شيء، بما في ذلك الفواتير.", icon: KeyRound },
                { value: "manager", title: "مدير", description: "العقارات والعقود والمستأجرون.", icon: Building2 },
              ]}
              value={rtlRole}
              onChange={setRtlRole}
            />
          </div>
        </Stage>
        <p className="text-xs text-[var(--text-muted)]">
          colour: {shown(rtlColour)} · role: {shown(rtlRole)} — focus a swatch and press ← : it moves
          left, to the next tile, as the arrow points.
        </p>
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
