import { useCallback, useId, useRef, useState } from "react";
import {
  AmountInput,
  Button,
  Checkbox,
  Combobox,
  FullBleedDialog,
  Input,
  TourGuideButton,
  TourProvider,
  useTour,
  useTourGate,
  useTourGateRelease,
} from "@eifi1/ui-kit";
import type { TourInfo, TourLauncher, TourStep, TourStepContext } from "@eifi1/ui-kit";
import { Example, Note, OutTable } from "../lib/section";

/**
 * GUIDED FORM TOUR (0.50, docs/tours-harmonization.md §11) — a tour that walks a person
 * through a REAL form: value gates (`useTourGate` + `gate`), an optional field, a branch
 * (`when`), the save as `awaitGate` with `release`/`refuse`, "Guide me" (`TourGuideButton`,
 * `start(id, { at })`), the layer order over a full-screen sheet and the docked card on a
 * phone. It is also the page the phone e2e (scripts/e2e-tour-phone.mjs) drives, so its
 * anchors are kept stable: `gt-*`.
 */

const CATEGORIES = ["Groceries", "Rent", "Transport", "Eating out", "Health"];
const INFO: TourInfo = { id: "showcase-book", title: "Book a transaction", group: "start", points: 10 };

type Row = { amount: string; category: string; memo: string; transfer: boolean };

function steps(): TourStep[] {
  const transfer = (c: TourStepContext) => c.gate("gt.transfer") === true;
  return [
    {
      title: "Book a transaction",
      body: "A guided walk through the real form below: each field unlocks Next once it holds a value.",
    },
    {
      target: '[data-tour="gt-new"]',
      title: "Open the form",
      body: "Press New transaction.",
      awaitClick: true,
    },
    {
      target: '[data-tour="gt-amount"]',
      gate: "gt.amount",
      title: "The amount",
      body: "Type an amount. On a phone the number pad opens above this card, and its Done moves on.",
    },
    {
      target: '[data-tour="gt-category"]',
      gate: "gt.category",
      when: (c) => !transfer(c),
      title: "The category",
      body: "Pick one from the list: its list opens above this card, and a pick unlocks Next.",
    },
    {
      target: '[data-tour="gt-transfer"]',
      title: "A transfer instead",
      body: "Shown only because Transfer is ticked: a `when` on a published fact.",
      when: transfer,
    },
    {
      target: '[data-tour="gt-memo"]',
      gate: "gt.memo",
      optional: true,
      title: "A note",
      body: "Optional: Leave empty moves on without one. The field sits low in the sheet, so the sheet's body scrolls it into view.",
    },
    {
      target: '[data-tour="gt-save"]',
      awaitGate: "gt.saved",
      title: "Save it",
      body: "Press Save. The tour moves on only once the (simulated) server says yes.",
    },
    { title: "Booked", body: "Saved for real: the row is in the list, and the completion is recorded." },
  ];
}

export function GuidedFormTourDemo() {
  const [outcome, setOutcome] = useState<string | null>(null);
  // What the form's Close calls: the launcher's engine, kept from the last launch.
  const stopRef = useRef<() => void>(() => {});
  // The launcher gets the provider's own `start` as its third argument and the whole engine
  // as its fourth (0.50.1), so it lives here, above the provider, with no ref to a component
  // below it. The engine is read live: the form's Close stops the run through it.
  const launch = useCallback<TourLauncher>((id, opts, start, engine) => {
    if (id !== INFO.id) return;
    setOutcome(null);
    stopRef.current = () => {
      if (engine.active) engine.stop();
    };
    start(steps(), {
      id: INFO.id,
      tour: INFO,
      at: opts.at,
      startIndex: opts.startIndex,
      onFinish: () => setOutcome("finished"),
      onSkip: () => setOutcome("skipped"),
    });
  }, []);
  return (
    <>
      <Example
        label="Guided form tour — gates, awaitGate and Guide me"
        hint="A TourProvider of its own with `launch`; the form is a FullBleedDialog, as on a phone."
      >
        <TourProvider launch={launch}>
          <BookingDemo outcome={outcome} onClose={() => stopRef.current()} />
        </TourProvider>
      </Example>
      <Example
        label="The form's side — one line per field"
        hint="useTourGate beside each field, release/refuse from the save"
      >
        <OutTable
          rows={[
            [
              'useTourGate("gt.amount", amount !== "")',
              "Publishes whether the field holds what the tour waits for. A no-op without a provider.",
            ],
            ['useTourGate("gt.transfer", transfer)', "A fact no step names as `gate`: a step's `when` asks it."],
            ['release("gt.saved")', "From the save's onSuccess: the awaitGate step moves on (the form may stay open)."],
            [
              'refuse("gt.saved", reason)',
              "From onError: the step stays, shows the reason and offers Back to an emptied field.",
            ],
            [
              '<TourGuideButton tour="…" at="gt-amount" />',
              "Starts the tour inside the open form: no intro, no Back past the amount.",
            ],
            [
              "<TourProvider launch={(id, opts, start, engine) => …}>",
              "The app's launcher builds the steps and calls start, the provider's own (third argument): no ref. The fourth is the whole engine, read live: engine.stop() ends the run (0.50.1).",
            ],
          ]}
        />
        <Note>
          The step&apos;s side is `gate`, `optional`, `when` and `awaitGate`. On a phone the field steps dock their card
          at the edge away from the field; inside the full-screen sheet there is no scrim, only the ring.
        </Note>
      </Example>
    </>
  );
}

function BookingDemo({ outcome, onClose }: { outcome: string | null; onClose: () => void }) {
  const tour = useTour();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [refuseNext, setRefuseNext] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="accent" disabled={tour.active} onClick={() => tour.start(INFO.id)}>
          Take the guided tour
        </Button>
        <Button variant="secondary" data-tour="gt-new" onClick={() => setOpen(true)}>
          New transaction
        </Button>
        <Checkbox label="The server refuses the next save" checked={refuseNext} onCheckedChange={setRefuseNext} />
      </div>
      <p className="text-sm text-muted" data-testid="gt-status">
        {tour.active && tour.activeId === INFO.id
          ? `Step ${tour.position} of ${tour.count} (index ${tour.index})`
          : outcome
            ? `Tour ${outcome}`
            : "No tour running"}
        {" · "}
        {rows.length} booked
      </p>
      {open && (
        <BookingForm
          onClose={() => {
            // Closing the form mid-tour ends the run, through the launcher's engine.
            onClose();
            setOpen(false);
          }}
          refuse={refuseNext}
          onRefused={() => setRefuseNext(false)}
          onSaved={(row) => {
            setRows((r) => [...r, row]);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function BookingForm({
  onClose,
  onSaved,
  refuse,
  onRefused,
}: {
  onClose: () => void;
  onSaved: (row: Row) => void;
  refuse: boolean;
  onRefused: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const noteId = useId();
  const [memo, setMemo] = useState("");
  const [transfer, setTransfer] = useState(false);
  const [saving, setSaving] = useState(false);
  const gates = useTourGateRelease();
  useTourGate("gt.amount", amount !== "");
  useTourGate("gt.category", CATEGORIES.includes(category));
  useTourGate("gt.memo", memo.trim() !== "");
  useTourGate("gt.transfer", transfer);
  const save = () => {
    setSaving(true);
    // A pretend server round trip.
    window.setTimeout(() => {
      setSaving(false);
      if (refuse || amount === "") {
        onRefused();
        setAmount("");
        gates.refuse(
          "gt.saved",
          amount === "" ? "Enter an amount first." : "The server said no (simulated). Try again.",
        );
        return;
      }
      gates.release("gt.saved");
      onSaved({ amount, category, memo, transfer });
    }, 300);
  };
  return (
    <FullBleedDialog
      open
      onClose={onClose}
      title="New transaction"
      closeLabel="Close"
      header={<TourGuideButton tour={INFO.id} at="gt-amount" />}
      footer={
        <Button variant="accent" data-tour="gt-save" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      }
    >
      <div className="mx-auto max-w-lg space-y-4">
        <div data-tour="gt-amount">
          <AmountInput label="Amount" value={amount} onChange={setAmount} currency="CHF" />
        </div>
        <div data-tour="gt-transfer">
          <Checkbox label="Transfer" checked={transfer} onCheckedChange={setTransfer} />
        </div>
        {!transfer && (
          <div>
            <div data-tour="gt-category">
              <Combobox
                label="Category"
                value={category}
                onChange={setCategory}
                options={CATEGORIES}
                placeholder="Pick a category"
                searchPlaceholder="Search categories"
                closeLabel="Close"
                sheetTitle="Category"
                aria-describedby={category === "" ? noteId : undefined}
              />
            </div>
            {/* The app's own line under the field, outside its `data-tour` box, named by
                the field's aria-describedby: the step's ring frames field and line
                (keksdose S1, §11.6). */}
            {category === "" && (
              <p id={noteId} data-testid="gt-category-note" className="mt-1 text-xs text-warning">
                No category chosen — booked as Uncategorised
              </p>
            )}
          </div>
        )}
        {/* Room, so the note sits below the first screen on a phone and the sheet's body
            has to scroll it into view (the e2e's step 7). */}
        <div className="h-[70vh] rounded-md border border-dashed border-subtle p-3 text-sm text-muted">
          More fields would go here.
        </div>
        <div data-tour="gt-memo">
          <Input label="Note" value={memo} onChange={(e) => setMemo(e.target.value)} />
        </div>
      </div>
    </FullBleedDialog>
  );
}
