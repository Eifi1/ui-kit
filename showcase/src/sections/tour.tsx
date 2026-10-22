import { useState } from "react";
import { BarChart3, FileUp, FlaskConical, GraduationCap, Target, Trophy, Wallet } from "lucide-react";
import {
  AmountInput,
  Button,
  Chip,
  DEFAULT_TOUR_LABELS,
  PageHeader,
  StatTile,
  TourCatalogue,
  TourMenu,
  TourProvider,
  doneCount,
  earnedPoints,
  resetTourProgress,
  signOutTourProgress,
  completeTour,
  useTour,
  useTourOptional,
  useTourProgress,
} from "@eifi1/ui-kit";
import type {
  TourCatalogueFilter,
  TourCompletions,
  TourGroup,
  TourInfo,
  TourLabels,
  TourStep,
  TourProgressAccount,
  TourProgressBody,
  UseTourProgressOptions,
} from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row, beat } from "../lib/section";

/**
 * GUIDED TOUR — `TourProvider`, `useTour` and the shape of a step.
 *
 * `TourProvider` spotlights elements by CSS SELECTOR, so its steps point at markup that
 * lives in some other component entirely. The targets below are planted on this page on
 * purpose, so the tour has something real to find. The tour card is painted with the
 * kit's tokens, so it follows the palette switch like everything this page draws itself.
 *
 * Split out of the old "Tour, palette & files" page, together with command-palette-demo.tsx
 * and swipeable-row-demo.tsx; its three FileDropzone specimens went to the Files page.
 */


export function GuidedTour() {
  return (
    <>
      <Example
        label="Guided tour — useTour + TourProvider"
        hint="The provider is mounted above the whole page; the steps below target markup in this section."
      >
        <TourLauncher />
      </Example>

      <Example
        label="Tour — labels, placements, beforeStep and a missing target"
        hint="A second TourProvider nested in this card, with its own labels prop — useTour answers from the nearest one."
      >
        <TourProvider labels={TOUR_LABELS_DE}>
          <PlacementTour />
        </TourProvider>
      </Example>

      <Example
        label="TourStep — the shape a step actually takes"
        hint="Only `title` and `body` are required; everything else changes how the step is found or placed."
      >
        {/* The tour's last step points here — a target further down this page. It
            pointed at a FileDropzone until the dropzones moved to the Files page. */}
        <div data-tour="showcase-step-shape">
          <OutTable
            rows={[
              ["target?: string", "CSS selector. Omitted → the step centres on screen."],
              ["title: string", "Card heading."],
              ["body: ReactNode", "Card copy — a node, not a string."],
              ["action?: ReactNode", "Extra footer row, e.g. a shortcut button."],
              ["padding?: number", "Spotlight padding around the target, px (default 8)."],
              ["placement?", '"top" | "bottom" | "start" | "end" | "left" | "right" | "center"; omit for auto. start/end follow the target\'s reading direction, left/right are physical'],
              ["awaitClick?: boolean", "Advance only when the TARGET is clicked. Needs `target`."],
              ["interactive?: boolean", "The target is for using — the layers it opens (number pad, menus, popovers at z-50) sit above the scrim."],
              ["awaitInput?: boolean", "Advance once a value was entered in the target's field (blur or Enter). Implies interactive."],
              ["beforeStep?", "Sync or async; awaited before the target is located."],
            ]}
          />
        </div>
      </Example>
    </>
  );
}

/* ── tour ──────────────────────────────────────────────────────────────────── */

type TourOutcome = "finished" | "skipped" | "stopped" | null;

function TourLauncher() {
  const { start, stop, active, activeId, index, total, goToStep } = useTour();
  const [outcome, setOutcome] = useState<TourOutcome>(null);
  const [pings, setPings] = useState(0);
  const [amount, setAmount] = useState("");

  // `useTour` THROWS without a provider; `useTourOptional` answers null. The
  // difference matters for a launcher in app chrome: the throw's blast radius is
  // whatever error boundary is above it, which for a top bar is the whole app — so a
  // control that can honestly render nothing should degrade instead of exploding.
  // Here the provider is always present, so this only ever reports "yes".
  const optional = useTourOptional();

  // Built per render rather than hoisted: two of the steps close over state setters
  // and over `goToStep`, and `start()` snapshots the array anyway.
  const steps: TourStep[] = [
    {
      // No `target` at all — the welcome step centres itself. `placement: "center"`
      // would do the same thing even with a target, which is the difference between
      // "there is nothing to point at" and "do not point at it".
      title: "This is the guided tour",
      body: "Five steps over four targets planted in this section. Esc skips, Enter or → advances, ← goes back (mirrored in a right-to-left document). Tab to Back or Skip and press Enter: only that button runs.",
      action: (
        <Row>
          <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => goToStep(3)}>
            Skip ahead to the step table
          </Button>
          <Button
            variant="secondary"
            className="px-2.5 py-1 text-xs"
            onClick={() => {
              stop();
              // `stop()` deliberately fires NO callbacks — neither onFinish nor onSkip —
              // so an app that records completion has to record it here itself.
              setOutcome("stopped");
            }}
          >
            stop()
          </Button>
        </Row>
      ),
    },
    {
      target: '[data-tour="showcase-tour-start"]',
      title: "The launcher",
      body: "The button you just pressed. The spotlight follows it on scroll and resize — the overlay re-reads the rect on a 250ms interval as well as on events.",
      placement: "bottom",
    },
    {
      target: '[data-tour="showcase-ping"]',
      title: "awaitClick",
      body: "This step has no Next button: it advances only when the highlighted control itself is clicked. The control's own handler runs first, so the counter ticks and then the tour moves on.",
      placement: "bottom",
      awaitClick: true,
    },
    {
      target: '[data-tour="showcase-amount"]',
      title: "awaitInput",
      body: "An interactive step: on a phone the field's number pad opens ABOVE the scrim and its keys work. Enter an amount and press Done (or Enter, or tap away) — the value is the step's action.",
      placement: "bottom",
      awaitInput: true,
    },
    {
      target: '[data-tour="showcase-step-shape"]',
      title: "A target further down",
      body: "Scrolled into view before the spotlight is drawn. Steps whose target cannot be found after ~45 frames fall back to a centred card rather than hanging.",
      placement: "top",
      padding: 12,
    },
  ];

  return (
    <div className="space-y-3">
      <Row>
        <Button
          variant="accent"
          data-tour="showcase-tour-start"
          disabled={active}
          onClick={() => {
            setOutcome(null);
            start(steps, {
              id: "showcase-tour",
              onStart: () => setPings(0),
              onFinish: () => setOutcome("finished"),
              onSkip: () => setOutcome("skipped"),
            });
          }}
        >
          Start tour
        </Button>
        <Button
          variant="secondary"
          disabled={active}
          onClick={() => {
            setOutcome(null);
            // `startIndex` is the deep-link resume: clamped into range, and `onStart`
            // still fires. The step index is what an app mirrors to the URL.
            start(steps, {
              id: "showcase-tour",
              startIndex: 2,
              onFinish: () => setOutcome("finished"),
              onSkip: () => setOutcome("skipped"),
            });
          }}
        >
          Resume at step 3 (startIndex: 2)
        </Button>
        <Button data-tour="showcase-ping" onClick={() => setPings((n) => n + 1)}>
          Ping ({pings})
        </Button>
        <div data-tour="showcase-amount" className="w-40">
          <AmountInput label="Amount" value={amount} onChange={setAmount} currency="CHF" />
        </div>
      </Row>

      <OutTable
        rows={[
          ["active", String(active)],
          ["activeId", activeId === null ? "null" : `"${activeId}"`],
          // `index` is 0 while inactive, not -1; `total` is 0 too, so the counter the
          // card shows is meaningless until the tour is running.
          ["index / total", active ? `${index + 1} / ${total}` : "— (0 / 0 while inactive)"],
          ["last outcome", outcome ?? "—"],
          ["amount", amount || "—"],
          ["useTourOptional()", optional ? "a provider is above this component" : "null"],
        ]}
      />

      <Note>
        The four targets are marked with <code className="font-mono">data-tour</code>{" "}
        attributes, the same convention <code className="font-mono">AppShell</code> uses for
        its nav items. The step matches the first VISIBLE element for the selector, not the
        first in DOM order, so one selector can cover a desktop and a mobile copy of the same
        control.
      </Note>
      <Note>
        <code className="font-mono">stop()</code> sits in the welcome step&apos;s{" "}
        <code className="font-mono">action</code> rather than beside the launcher: while a tour
        runs the page outside the card and the spotlit target takes no clicks (the tour is{" "}
        <code className="font-mono">aria-modal</code>, and the pointer is held to that
        too), so a Stop button out on the page could never be pressed.
      </Note>
    </div>
  );
}

/** German on purpose, so the override is unmistakable on an English page. */
const TOUR_LABELS_DE: Partial<TourLabels> = {
  next: "Weiter",
  back: "Zurück",
  skip: "Überspringen",
  done: "Fertig",
  awaitClickHint: "Klicke auf das hervorgehobene Element",
  step: (c, t) => `Schritt ${c} von ${t}`,
};

function PlacementTour() {
  // The NESTED provider's engine — the page-level one above is untouched.
  const { start, active, index, total, next, prev } = useTour();
  const [revealed, setRevealed] = useState(false);
  const [beforeCalls, setBeforeCalls] = useState(0);
  const [outcome, setOutcome] = useState<TourOutcome>(null);
  const [from, setFrom] = useState(0);

  const steps: TourStep[] = [
    {
      target: '[data-tour="showcase-place-a"]',
      title: 'placement: "right"',
      body: "The card sits to the right of the target. An explicit side flips to the opposite one if it would overflow, then clamps into the window — narrow the window to see it turn.",
      placement: "right",
      padding: 4,
    },
    {
      target: '[data-tour="showcase-place-b"]',
      title: 'placement: "left"',
      body: "And to the left. padding here is 20 — the spotlight's margin around the target.",
      placement: "left",
      padding: 20,
    },
    {
      target: '[data-tour="showcase-place-a"]',
      title: 'placement: "end"',
      body: "The logical side: the card sits at the target's END — the right here, because Target A reads left to right. Compare the next step, in a right-to-left box.",
      placement: "end",
      padding: 4,
    },
    {
      target: '[data-tour="showcase-place-rtl"]',
      title: 'placement: "end" in \u2066dir="rtl"\u2069',
      body: "The same placement on a target inside \u2066dir=\"rtl\"\u2069: its end is the LEFT. The card takes the target's direction too — and so do the keys: ← advances here and → goes back.",
      placement: "end",
      padding: 4,
    },
    {
      target: '[data-tour="showcase-place-rtl"]',
      title: 'placement: "start" in \u2066dir="rtl"\u2069',
      body: "And its start is the right. A translated app writes start/end once and gets the mirror for free; left/right stay for a step that really means a side of the screen.",
      placement: "start",
      padding: 4,
    },
    {
      target: '[data-tour="showcase-place-a"]',
      title: 'placement: "center"',
      body: "The spotlight still frames the target, but the card ignores it and centres on screen. The buttons below drive the engine from app code.",
      placement: "center",
      action: (
        <Row>
          <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={prev}>
            prev()
          </Button>
          <Button
            variant="secondary"
            className="px-2.5 py-1 text-xs"
            onClick={async () => {
              // e.g. after a save resolves — `next()` is how app code moves the tour on.
              await beat(400);
              next();
            }}
          >
            Save, then next()
          </Button>
        </Row>
      ),
    },
    {
      target: '[data-tour="showcase-place-c"]',
      title: "beforeStep",
      body: "This target did not exist until the step's async beforeStep revealed it and waited 500ms. The tour awaits it, then goes looking.",
      placement: "top",
      beforeStep: async () => {
        setBeforeCalls((n) => n + 1);
        setRevealed(true);
        await beat(500);
      },
    },
    {
      target: '[data-tour="showcase-nowhere"]',
      title: "A target that is never found",
      body: "Nothing matches this selector, so after ~45 frames the card falls back to the centre. It is an awaitClick step, but with no target to click the Next button stays — otherwise there would be no way on.",
      awaitClick: true,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span
          data-tour="showcase-place-a"
          className="rounded-md border border-subtle px-3 py-1.5 text-xs text-primary"
        >
          Target A
        </span>
        {revealed && (
          <span
            data-tour="showcase-place-c"
            className="rounded-md border border-brand px-3 py-1.5 text-xs text-primary"
          >
            Target C (revealed by beforeStep)
          </span>
        )}
        <span
          data-tour="showcase-place-b"
          className="rounded-md border border-subtle px-3 py-1.5 text-xs text-primary"
        >
          Target B
        </span>
      </div>
      <div dir="rtl" className="flex justify-center">
        <span
          data-tour="showcase-place-rtl"
          className="rounded-md border border-subtle px-3 py-1.5 text-xs text-primary"
        >
          الهدف د — <bdi dir="ltr">Target D, dir=&quot;rtl&quot;</bdi>
        </span>
      </div>
      <Row>
        {/* The select is as wide as its longest option; held to the row, it ran 73 px
            past a 360 px phone at Extra large otherwise (0.32.1). */}
        <label className="flex min-w-0 max-w-full flex-wrap items-center gap-2 text-xs text-secondary">
          startIndex
          <select
            value={from}
            onChange={(e) => setFrom(Number(e.target.value))}
            className="min-w-0 max-w-full rounded-md border border-subtle bg-surface-2 px-1 py-0.5 text-primary"
          >
            {steps.map((st, i) => (
              <option key={st.title} value={i}>
                {i} — {st.title}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="accent"
          disabled={active}
          onClick={() => {
            setRevealed(false);
            setOutcome(null);
            start(steps, {
              id: "showcase-placements",
              startIndex: from,
              onFinish: () => setOutcome("finished"),
              onSkip: () => setOutcome("skipped"),
            });
          }}
        >
          Start the labelled tour
        </Button>
      </Row>
      <OutTable
        rows={[
          ["index / total", active ? `${index + 1} / ${total}` : "—"],
          ["beforeStep calls", String(beforeCalls)],
          ["last outcome", outcome ?? "—"],
          ["labels.step(2, 5)", `"${TOUR_LABELS_DE.step!(2, 5)}" (default "${DEFAULT_TOUR_LABELS.step(2, 5)}")`],
        ]}
      />
      <Note>
        Without a <code className="font-mono">labels</code> prop the tour reads the{" "}
        <code className="font-mono">tour</code> namespace of the nearest{" "}
        <code className="font-mono">UiKitProvider</code>, then English. On this page the
        page-level tour&apos;s provider sits ABOVE the showcase&apos;s{" "}
        <code className="font-mono">UiKitProvider</code>, which is why its card stays English
        whatever the language menu says; this nested one sits below it.
      </Note>
      <Note>
        Keys follow the reading direction of the step&apos;s target (the document&apos;s for a
        centred step): Enter and the forward arrow advance — → in LTR, ← in RTL, as on Target D
        above — the other arrow goes back, Esc skips. Enter on a focused control belongs to that
        control: Tab to <strong>Zurück</strong> or <strong>Überspringen</strong> and press Enter,
        and only that button runs (it used to run AND step forward). The page is blocked outside
        the card and the spotlit target — try clicking <strong>Start the labelled tour</strong>{" "}
        mid-tour — while the target itself stays clickable for{" "}
        <code className="font-mono">awaitClick</code>.
      </Note>
    </div>
  );
}

/* ── since 0.22 ─────────────────────────────────────────────────────────── */

const STALE_STEPS: TourStep[] = [
  {
    target: '[data-tour="showcase-stale-a"]',
    title: "A spotlighted step",
    body: "Next goes to a step with no target.",
  },
  { title: "A centred step", body: "Centred, with no hole left over from the step before." },
  {
    target: '[data-tour="showcase-stale-missing"]',
    title: "A missing anchor",
    body: "Its target is not on the page: it reads as untargeted, not as the last thing that was lit.",
  },
  { target: '[data-tour="showcase-stale-a"]', title: "Lit again", body: "Back and Next keep each step its own." },
];

export function TourStaleSpotlight022Demo() {
  const { start } = useTour();
  return (
    <Example
      label="Tour — the step after a spotlighted one"
      hint="a step without a target draws no hole and centres its card"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" data-tour="showcase-stale-a" onClick={() => start(STALE_STEPS)}>
          Run: spotlit → centred → missing → spotlit
        </Button>
      </div>
      <Note>
        A step with no target (or a missing one) right after a spotlighted step draws no hole and centres its card,
        Back→Next included: the located rect carries the step it was found for, and a rect from another step is never
        drawn, even while the follow interval has an update queued. Walk it with the arrows too.
      </Note>
    </Example>
  );
}

/* ── since 0.43: the tours page ─────────────────────────────────────────── */

const CATALOGUE_GROUPS: TourGroup[] = [
  { id: "start", title: "Getting started", help: "The first steps, in the order most people take them.", icon: <GraduationCap /> },
  { id: "budgeting", title: "Everyday budgeting", help: "Plan a month, and see where it went.", icon: <Wallet /> },
  { id: "import", title: "Importing", help: "Bring transactions in from your bank.", icon: <FileUp /> },
  { id: "reports", title: "Reports", help: "The charts, and what they answer.", icon: <BarChart3 /> },
];

const CATALOGUE_TOURS: TourInfo[] = [
  {
    id: "showcase-welcome",
    title: "Welcome",
    description: "The app in two minutes.",
    about: "Visits the dashboard, the budget and the top bar, and changes nothing.",
    icon: <GraduationCap />,
    group: "start",
    route: "/",
    points: 20,
    steps: 2,
    duration: 2,
  },
  {
    id: "showcase-budget",
    title: "Your first budget",
    description: "Plan a month, category by category.",
    about: "Opens the budget page, explains the columns and how money moves between categories.",
    icon: <Wallet />,
    group: "budgeting",
    route: "/budget",
    since: "2026-10-05",
    points: 30,
    steps: 2,
    duration: 4,
  },
  {
    id: "showcase-goals",
    title: "Goals",
    description: "Save towards something.",
    about: "Shows where a goal lives, and what the progress bar counts.",
    icon: <Target />,
    group: "budgeting",
    route: "/budget",
    updated: { date: "2026-10-10", reason: "The goals editor moved into the category." },
    points: 40,
    steps: 2,
  },
  {
    id: "showcase-import",
    title: "Bank import",
    description: "A CSV from your bank, in four steps.",
    icon: <FileUp />,
    group: "import",
    points: 30,
    steps: 2,
    duration: 3,
    badge: (
      <Chip size="sm" tone="warning" icon={FlaskConical}>
        Practice: nothing is saved
      </Chip>
    ),
  },
];

const CATALOGUE_STEPS: TourStep[] = [
  { title: "A demo tour", body: "Every card here runs this same two-step tour." },
  { title: "Done", body: "Finish it and the card turns completed — the menu above agrees without a reload." },
];

/** The device key is the app's, always (§6.2). This one is the showcase's own. */
const SHOWCASE_PROGRESS_KEY = "showcase.tours.completed";
/** Declared once, at module level: the provider and every reader share one snapshot (§9.6.3). */
const SHOWCASE_PROGRESS: UseTourProgressOptions = { storageKey: SHOWCASE_PROGRESS_KEY };

export function TourCatalogueDemo() {
  const [toast, setToast] = useState<string | null>(null);
  // Since 0.44 the provider records the finished tour and reports it (§9.6): the app's
  // points toast lives here, once, and no launch wires `onFinish` + `complete()`.
  return (
    <>
      <TourProvider
        progress={SHOWCASE_PROGRESS}
        onComplete={(tour, { awarded }) => {
          if (awarded && tour) setToast(`You earned ${tour.points} points!`);
        }}
      >
        <TourCatalogueBody toast={toast} />
      </TourProvider>
      <TourAccountDemo />
    </>
  );
}

/* ── 0.45: progress on the account (§10) ─────────────────────────────────── */

/** A pretend `GET`/`PATCH /tours/progress`: server-kit's merge, the later completion wins. */
const ACCOUNT_SERVER: Record<string, string> = { "showcase-budget": "2026-10-02T08:00:00Z" };
const accountState = { online: true, requests: [] as string[] };
const laterOf = (a: string | undefined, b: string) =>
  a === undefined || a === "" ? b : b === "" ? a : Date.parse(b) > Date.parse(a) ? b : a;
const unreachable = () => Object.assign(new Error("Failed to fetch"), { status: undefined });

/** The stub's account, defined once at module level as an app's is. */
const SHOWCASE_ACCOUNT: TourProgressAccount = {
  load: async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (!accountState.online) throw unreachable();
    accountState.requests.push("GET");
    return { completed: { ...ACCOUNT_SERVER } };
  },
  save: async (body: TourProgressBody) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (!accountState.online) throw unreachable();
    accountState.requests.push(`PATCH ${JSON.stringify(body)}`);
    for (const [id, at] of Object.entries(body.completed ?? {})) ACCOUNT_SERVER[id] = laterOf(ACCOUNT_SERVER[id], at);
    for (const id of body.forget ?? []) delete ACCOUNT_SERVER[id];
    return { completed: { ...ACCOUNT_SERVER } };
  },
};
/** Per account: a prefix plus the user id (§10.2.6). */
const ACCOUNT_KEY = "showcase.tours.account:ada";
const ACCOUNT_PROGRESS: UseTourProgressOptions = { storageKey: ACCOUNT_KEY, account: SHOWCASE_ACCOUNT };

function TourAccountDemo() {
  const [signedIn, setSignedIn] = useState(true);
  const [online, setOnline] = useState(true);
  return (
    <Example
      label="useTourProgress with an account"
      hint="the device key as the account's cache, the :pending record, signOutTourProgress (docs/tours-harmonization.md §10)"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            if (signedIn) signOutTourProgress(ACCOUNT_KEY);
            setSignedIn(!signedIn);
          }}
        >
          {signedIn ? "Sign out" : "Sign in as Ada"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            accountState.online = !online;
            setOnline(!online);
            if (!online) window.dispatchEvent(new Event("online"));
          }}
        >
          {online ? "Make the server unreachable" : "Reach the server again"}
        </Button>
      </div>
      {signedIn ? <TourAccountBody /> : <Note>Signed out: the cache is gone, the pending record stays for Ada.</Note>}
      <Note>
        With {"`account: {load, save, adopt?}`"} the device key is the account&apos;s cache: the page paints from it,
        loads the account on the first reader, on `online` and after each save. A completion goes to the cache and to
        `&lt;key&gt;:pending`, sent as one PATCH; a failure with no answer keeps it, a 403 or 422 drops it.
        `signOutTourProgress(key)` removes the cache only and keeps the pending record for its owner. An app moving off a device-wide record passes
        `adopt: {"{"}storageKey, discard: true{"}"}` to drop it. Nothing leaves this page.
      </Note>
    </Example>
  );
}

function TourAccountBody() {
  const progress = useTourProgress(ACCOUNT_PROGRESS);
  const [, setTick] = useState(0);
  const pending = typeof window === "undefined" ? null : window.localStorage.getItem(`${ACCOUNT_KEY}:pending`);
  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap gap-2">
        {CATALOGUE_TOURS.slice(0, 3).map((tour) => (
          <Button
            key={tour.id}
            size="sm"
            variant={progress.completed[tour.id] !== undefined ? "default" : "secondary"}
            onClick={() => {
              if (progress.completed[tour.id] !== undefined) progress.reset(tour.id);
              else progress.complete(tour);
              setTimeout(() => setTick((t) => t + 1), 800);
            }}
          >
            {progress.completed[tour.id] !== undefined ? `${tour.title}: done` : `Complete ${tour.title}`}
          </Button>
        ))}
      </div>
      <OutTable
        rows={[
          ["completed (cache)", JSON.stringify(progress.completed)],
          ["pending", pending ?? "—"],
          ["account", JSON.stringify(ACCOUNT_SERVER)],
          ["requests", accountState.requests.slice(-3).join(" · ") || "—"],
        ]}
      />
    </div>
  );
}

function TourCatalogueBody({ toast }: { toast: string | null }) {
  const { start } = useTour();
  const progress = useTourProgress(SHOWCASE_PROGRESS);
  const [filter, setFilter] = useState<TourCatalogueFilter>({ query: "", group: null, state: "all" });
  // Seeded once, so the reset tour is there to see: "Goals" was taken before its update.
  const completed: TourCompletions = { "showcase-goals": "2026-09-20T10:00:00Z", ...progress.completed };

  const launch = (id: string) => {
    const tour = CATALOGUE_TOURS.find((t) => t.id === id);
    if (!tour) return;
    // The start carries its tour; the provider writes the completion and calls onComplete.
    start(CATALOGUE_STEPS, { tour });
  };
  // Counted by isTourDone: a tour reset by its update counts again once taken again.
  const done = doneCount(CATALOGUE_TOURS, completed);
  const earned = earnedPoints(CATALOGUE_TOURS, completed);
  const total = CATALOGUE_TOURS.reduce((sum, t) => sum + (t.points ?? 0), 0);

  return (
    <Example
      label="TourCatalogue — the tours page body"
      hint="an app's /tours (docs/tours-harmonization.md): sections per group, the filter bar, the tour card"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted">
        The same list in the top bar&apos;s menu:
        <TourMenu tours={CATALOGUE_TOURS} completed={completed} joined="2026-10-01" onLaunch={launch} list="all" />
        {/* What "Reset this device's settings" calls, where an app registers the key. */}
        <Button variant="ghost" size="sm" onClick={() => resetTourProgress(SHOWCASE_PROGRESS_KEY)}>
          Forget this device&apos;s progress
        </Button>
        {/* The writer outside a page (tests, seeds, scripts): every reader here moves at once. */}
        <Button variant="ghost" size="sm" onClick={() => completeTour(SHOWCASE_PROGRESS_KEY, "showcase-import")}>
          Seed &ldquo;Bank import&rdquo; as done
        </Button>
      </div>
      <TourCatalogue
        tours={CATALOGUE_TOURS}
        groups={CATALOGUE_GROUPS}
        completed={completed}
        joined="2026-10-01"
        {...filter}
        onChange={(patch) => setFilter((f) => ({ ...f, ...patch }))}
        onLaunch={launch}
        onReset={progress.reset}
        header={
          <PageHeader
            size="compact"
            mobileLayout="inline"
            actionsAlign="start"
            as="h2"
            title="Guided tours"
            description={`${done} of ${CATALOGUE_TOURS.length} completed`}
            actions={
              <StatTile
                size="sm"
                tone="brand"
                icon={<Trophy />}
                className="w-36 shrink-0"
                label="Bonus points"
                value={earned}
                unit={`/ ${total}`}
              />
            }
          />
        }
      />
      {toast && <Note>{toast}</Note>}
      <Note>
        The page header, the points tile and the toast are the app&apos;s; the kit draws the body. The filters are
        controlled — an app keeps them in its URL with `useTourCatalogueUrlState()` (`?q`, `?topic`, `?state`), and
        `useTourUrlSync` starts a tour from `?tour=` and mirrors `&tourStep=`. Progress is `useTourProgress` on this
        device; &quot;Goals&quot; was completed before its update, so it is to do again, with the reason. The header
        counts with `doneCount` and `earnedPoints`, and &ldquo;Forget&rdquo; is `resetTourProgress`, what the device
        reset calls. The `TourProvider` takes `progress` and `onComplete(tour, {'{'}awarded{'}'})`:
        a launch passes `start(steps, {'{'} tour {'}'})`, the provider writes the completion once and the app shows its
        toast there. &ldquo;Seed&rdquo; is `completeTour`, for an app&apos;s tests and seeds.
      </Note>
    </Example>
  );
}
