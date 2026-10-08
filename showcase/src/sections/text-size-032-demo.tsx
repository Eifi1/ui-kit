import { useState } from "react";
import {
  BREAKPOINT_REM,
  Button,
  ContrastSetting,
  FOCUS_RING,
  Input,
  Switch,
  TEXT_SCALE,
  TextSizeSetting,
  cn,
  resolveContrastMode,
  resolveTextSize,
  useAccountAppearance,
  useBreakpoint,
  usePhoneLayout,
  useTextSize,
} from "@eifi1/ui-kit";
import type { AccountAppearanceFields, AccountAppearancePatch, ContrastMode, TextSize } from "@eifi1/ui-kit";
import { useContrastStore, useTextSizeStore } from "../stores";
import { Example, Note, OutTable } from "../lib/section";

/**
 * TEXT SIZE AND CONTRAST (0.32, docs/text-size-harmonization.md §2–§6, §10): the two
 * settings bound to THIS page — pick Extra large and the whole showcase grows, its
 * breakpoints with it — a live sample that shows what moves, the account rule played
 * against a pretend account, and the numbers behind `md:`.
 *
 * Belongs on a new Foundations page, "Text size & contrast" (slug `text-size`), after
 * "Tokens": the mechanism is a foundation every page sits on. Components: TextSizeSetting,
 * ContrastSetting, createTextSizeStore, createContrastStore, applyPersistedTextSize,
 * applyPersistedContrast, TEXT_SIZE_INLINE_SCRIPT, useTextSize, useBreakpoint,
 * usePhoneLayout, useAccountAppearance, FOCUS_RING, FIELD_TOUCH_TEXT.
 *
 * "Ada Example" and her settings are SYNTHETIC. Nothing sends a request: the pretend
 * account is local state.
 */

// `anywhere`: an identifier has no space to break at, and at Extra large on a phone a long
// one is wider than the line.
const code = (s: string) => <code className="font-mono [overflow-wrap:anywhere]">{s}</code>;

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--border)] py-1 last:border-b-0">
      <span className="text-[var(--text-secondary)]">{label}</span>
      {/* `anywhere` lowers the value's min-content too: the account's JSON is one
          unbreakable word, and it held the whole grid wider than a phone. */}
      <span className="min-w-0 text-end font-mono text-[var(--text-primary)] [overflow-wrap:anywhere]">{value}</span>
    </div>
  );
}

/** What is in force on this page right now, as the hooks answer it — and, beside the
 *  JS answer, the CSS one: a `md:inline` span that shows only where `md:` applies. */
function LiveAnswers() {
  const { size, scale } = useTextSize();
  const sm = useBreakpoint("sm");
  const md = useBreakpoint("md");
  const lg = useBreakpoint("lg");
  const phone = usePhoneLayout();
  const level = typeof document === "undefined" ? "standard" : document.documentElement.getAttribute("data-contrast");
  return (
    <div className="text-sm">
      <Readout label="useTextSize()" value={`${size} × ${scale}`} />
      <Readout label="data-contrast" value={level ?? "—"} />
      <Readout label={`useBreakpoint("sm" | "md" | "lg")`} value={`${sm} · ${md} · ${lg}`} />
      <Readout label="usePhoneLayout()" value={String(phone)} />
      <div className="flex items-baseline justify-between gap-3 py-1">
        <span className="text-[var(--text-secondary)]">The CSS: {code("md:inline")} / {code("max-md:inline")}</span>
        <span className="font-mono text-[var(--text-primary)]">
          <span className="hidden md:inline">md: on</span>
          <span className="hidden max-md:inline">max-md: on</span>
        </span>
      </div>
    </div>
  );
}

export function TextSize032Demo() {
  const device = useTextSizeStore((s) => s.size);
  const setSize = useTextSizeStore((s) => s.setSize);
  const deviceContrast = useContrastStore((s) => s.contrast);
  const setContrast = useContrastStore((s) => s.setContrast);
  const size = resolveTextSize(device);
  const contrast = resolveContrastMode(deviceContrast);

  return (
    <>
      <Example
        label="The two settings, on this page"
        hint="the same stores as the top bar's two menus; the choice is kept on this device"
      >
        <div className="grid gap-4 @container">
          <TextSizeSetting label="Text size" labelPlacement="above" value={size} onChange={setSize} />
          <ContrastSetting label="Contrast" labelPlacement="above" value={contrast} onChange={setContrast} />
          <LiveAnswers />
        </div>
        <Note>
          `Large` and `Extra large` set `font-size: 125%` / `150%` on `html` — percent, so
          Normal keeps the browser&apos;s own size. Everything in rem grows, and the
          breakpoints move with it: `md:` is 48rem at Normal, 60rem at Large, 72rem at
          Extra large. Narrow the window, or pick Extra large on a tablet-sized window,
          and the page takes its phone layout.
        </Note>
      </Example>

      <Example label="A live sample" hint="every role that More contrast steps, and the 16px field floor on touch">
        <div className="space-y-3 rounded-lg border border-[var(--border)] p-4">
          <p className="text-base font-semibold text-[var(--text-primary)]">Ada&apos;s Garden Planner</p>
          <p className="text-sm text-[var(--text-secondary)]">
            Secondary text: the tomatoes go out after the last frost.
          </p>
          <p className="text-sm text-[var(--text-muted)]">Muted text: last watered two days ago.</p>
          <p className="text-caption text-[var(--text-muted)]">
            {code("text-caption")} (0.6875rem) and <span className="text-micro">{code("text-micro")} (0.625rem)</span>{" "}
            — the sizes the kit&apos;s 11 and 10px move to.
          </p>
          <Input label="Bed name" placeholder="Placeholder: e.g. North bed" />
          <div className="flex flex-wrap items-center gap-2">
            <Button>Save the plan</Button>
            <button type="button" className={cn("rounded-md border border-[var(--border)] px-3 py-1.5 text-sm", FOCUS_RING)}>
              Tab to me: {code("FOCUS_RING")}
            </button>
          </div>
          <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)] text-sm">
            <li className="px-3 py-2">Borders and dividers step toward {code("--border-strong")}</li>
            <li className="px-3 py-2">…until they clear 3:1 on every surface</li>
          </ul>
        </div>
        <Note>
          With More contrast, muted text becomes secondary, secondary and placeholder text
          step toward the primary, borders reach 3:1 and the focus frame is 3px instead of
          2. The colours are written inline by `applyTokenSet`, so a palette change in the
          top bar keeps the step.
        </Note>
      </Example>

      <AccountRuleDemo />

      <Example label="What a breakpoint means at each size" hint="tokens.css and useBreakpoint use the same table">
        <OutTable
          rows={(Object.keys(BREAKPOINT_REM) as (keyof typeof BREAKPOINT_REM)[]).map((name) => [
            `${name}:`,
            (["normal", "large", "xlarge"] as TextSize[])
              .map((s) => `${BREAKPOINT_REM[name] * TEXT_SCALE[s]}rem`)
              .join(" / "),
          ])}
        />
        <Note>
          Each variant is three media queries scoped to the size in `:where()`, so `md:flex`
          keeps its specificity. `min-[2400px]:` would not scale — it is linted; `3xl:` is
          its name. In JS, `useBreakpoint("md")` and `usePhoneLayout()` answer the same
          question with the same numbers, so the shell, the table and an app&apos;s own
          phone checks switch together.
        </Note>
      </Example>
    </>
  );
}

/**
 * The account rule (§2.2, §6), against a pretend `/auth/me`: the device's own choice,
 * else the account's, else the default; nothing written on its own; a pick writes the
 * device and the account, a demo only the device. Local state — it does not touch the
 * page's own size.
 */
function AccountRuleDemo() {
  const [signedIn, setSignedIn] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [account, setAccount] = useState<AccountAppearanceFields>({ text_size: "large", contrast: "more" });
  const [device, setDevice] = useState<{ textSize: TextSize | null; contrast: ContrastMode | null }>({
    textSize: null,
    contrast: null,
  });
  const [log, setLog] = useState<string[]>([]);
  const note = (line: string) => setLog((l) => [line, ...l].slice(0, 4));

  const appearance = useAccountAppearance({
    account: signedIn ? account : undefined,
    device,
    setDevice: (patch) => {
      setDevice((d) => ({ ...d, ...patch }));
      note(`device ← ${JSON.stringify(patch)}`);
    },
    save: (patch: AccountAppearancePatch) => {
      setAccount((a) => ({ ...a, ...patch }));
      note(`PATCH /auth/me ${JSON.stringify(patch)}`);
    },
    isDemo,
  });

  return (
    <Example label="Following the account" hint="a pretend /auth/me for Ada Example; nothing is sent">
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Switch checked={signedIn} onCheckedChange={setSignedIn} label="Signed in as Ada Example" />
          <Switch checked={isDemo} onCheckedChange={setIsDemo} label="Demo session" />
          <Button variant="secondary" size="sm" onClick={() => setDevice({ textSize: null, contrast: null })}>
            Forget this device&apos;s choices
          </Button>
        </div>
        <TextSizeSetting label="Ada's text size" labelPlacement="above" value={appearance.textSize} onChange={(v) => void appearance.pickTextSize(v)} />
        <ContrastSetting label="Ada's contrast" labelPlacement="above" value={appearance.contrast} onChange={(v) => void appearance.pickContrast(v)} />
        <div className="text-sm">
          <Readout label="text size" value={`${appearance.textSize} (from the ${appearance.sources.textSize})`} />
          <Readout label="contrast" value={`${appearance.contrast} (from the ${appearance.sources.contrast})`} />
          <Readout label="account" value={signedIn ? JSON.stringify(account) : "signed out"} />
        </div>
        <ul aria-label="Writes" className="space-y-0.5 font-mono text-xs text-[var(--text-secondary)] [overflow-wrap:anywhere]">
          {log.length === 0 ? <li>No writes yet — signing in wrote nothing.</li> : log.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      </div>
      <Note>
        In an app the values in force are applied by the stores: `useApplyTextSize({"{ account: me?.text_size }"})`
        and `useApplyContrast({"{ account: me?.contrast }"})`, resolving the same order. Before
        first paint, `applyPersistedTextSize(key, {"{ account }"})` uses the account&apos;s last
        known value, so a device without a choice of its own does not paint Normal and then
        jump.
      </Note>
    </Example>
  );
}
