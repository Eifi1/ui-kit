import { useState } from "react";
import { Button, DEFAULT_TOUR_LABELS, TourProvider, useTour, useTourOptional } from "@eifi1/ui-kit";
import type { TourLabels, TourStep } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

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
              ["placement?", '"top" | "right" | "bottom" | "left" | "center"; omit for auto'],
              ["awaitClick?: boolean", "Advance only when the TARGET is clicked. Needs `target`."],
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
      body: "Four steps over three targets planted in this section. Esc skips, → advances, ← goes back.",
      action: (
        <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => goToStep(3)}>
          Skip ahead to the step table
        </Button>
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
          variant="brand"
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
        <Button
          variant="secondary"
          disabled={!active}
          onClick={() => {
            stop();
            // `stop()` deliberately fires NO callbacks — neither onFinish nor onSkip —
            // so an app that records completion has to record it here itself.
            setOutcome("stopped");
          }}
        >
          Stop
        </Button>
        <Button data-tour="showcase-ping" onClick={() => setPings((n) => n + 1)}>
          Ping ({pings})
        </Button>
      </Row>

      <OutTable
        rows={[
          ["active", String(active)],
          ["activeId", activeId === null ? "null" : `"${activeId}"`],
          // `index` is 0 while inactive, not -1; `total` is 0 too, so the counter the
          // card shows is meaningless until the tour is running.
          ["index / total", active ? `${index + 1} / ${total}` : "— (0 / 0 while inactive)"],
          ["last outcome", outcome ?? "—"],
          ["useTourOptional()", optional ? "a provider is above this component" : "null"],
        ]}
      />

      <Note>
        The three targets are marked with <code className="font-mono">data-tour</code>{" "}
        attributes, the same convention <code className="font-mono">AppShell</code> uses for
        its nav items. The step matches the first VISIBLE element for the selector, not the
        first in DOM order, so one selector can cover a desktop and a mobile copy of the same
        control.
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

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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
              await wait(400);
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
        await wait(500);
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
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-primary)]"
        >
          Target A
        </span>
        {revealed && (
          <span
            data-tour="showcase-place-c"
            className="rounded-md border border-[var(--brand)] px-3 py-1.5 text-xs text-[var(--text-primary)]"
          >
            Target C (revealed by beforeStep)
          </span>
        )}
        <span
          data-tour="showcase-place-b"
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-primary)]"
        >
          Target B
        </span>
      </div>
      <Row>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          startIndex
          <select
            value={from}
            onChange={(e) => setFrom(Number(e.target.value))}
            className="rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] px-1 py-0.5 text-[var(--text-primary)]"
          >
            {steps.map((st, i) => (
              <option key={st.title} value={i}>
                {i} — {st.title}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="brand"
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
        The keys are physical: → and Enter advance, ← goes back, Esc skips — in a
        right-to-left document too, where → points backwards. On a step with a spotlight the
        overlay is click-through everywhere, not only on the target, so the page behind stays
        clickable while the card holds the keyboard focus.
      </Note>
    </div>
  );
}

