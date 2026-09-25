import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import {
  Button,
  OVERLAY_EXIT_MS,
  PHONE_QUERY,
  anchoredPanelPlacement,
  buttonClasses,
  cn,
  logger,
  setStoreLog,
  useAnchoredPanel,
  useAnchoredRect,
  useBodyScrollLock,
  useCloseTransition,
  useAnnounce,
  useEscapeKey,
  useFocusTrap,
  useMediaQuery,
  useOutsideClick,
  useOverlayHistory,
  useVisualViewport,
} from "@eifi1/ui-kit";
import type { AnchorRect, FocusTrapOptions, ViewportBox } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * HOOKS & LIB — the third of the public surface with nothing to look at.
 *
 * Every specimen here is a LIVE READOUT rather than prose: the hook is called for
 * real and its current return value is printed, so resizing the window, scrolling
 * the page or pressing Escape moves the numbers on screen. A hook documented as a
 * sentence is a hook nobody can tell is broken; a hook whose output is on the page
 * fails visibly the moment it stops answering.
 *
 * Two consequences of that choice are worth knowing before reading on:
 *
 *  - The anchor-based hooks are wired to REAL buttons in this section, so the rects
 *    are this page's geometry, not a fixture. Open a panel and scroll.
 *  - The two hooks with global side effects — the scroll lock and the history
 *    sentinel — are behind explicit toggles that start off, because the render test
 *    mounts all sixteen sections into one tree and a section that locked the body on
 *    mount would take the page with it.
 */

/** Panel chrome shared by the four specimens that open something. */
const PANEL =
  "rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] p-3 text-sm text-[var(--text-primary)]";

/** Rects are fractional in a real browser (device pixel ratios that are not whole
 *  numbers) and exactly 0 in jsdom. One decimal keeps the first readable without
 *  pretending to a precision the second does not have. */
const px = (n: number) => `${Math.round(n * 10) / 10}px`;

/** A live boolean in a readout. The dot matters more than it looks: a column of
 *  `false false true false` is read one word at a time, a column of dots at a
 *  glance — and glancing is what a reader does while dragging the window edge. */
function Bool({ value }: { value: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className={cn(
          "inline-block size-2 rounded-full",
          value ? "bg-[var(--brand)]" : "bg-[var(--border)]",
        )}
      />
      {String(value)}
    </span>
  );
}

/** Trailing prose inside an `OutTable` cell, which is otherwise monospaced. */
function Aside({ children }: { children: ReactNode }) {
  return <span className="font-sans font-normal text-[var(--text-muted)]">{children}</span>;
}

/**
 * The window's current width, re-read on resize.
 *
 * Deliberately NOT a kit export, and not proposed as one: an application only ever
 * needs the boolean `useMediaQuery` already gives it. This page needs the number
 * because the reader is dragging the window across the threshold and has to see
 * where the threshold actually is — `false → true` with no width beside it is a
 * claim, not a demonstration.
 */
function useLiveWidth(): number {
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? 0 : window.innerWidth,
  );
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return width;
}

/* ── useMediaQuery ──────────────────────────────────────────────────────────── */

function MediaQueryReadout() {
  const phone = useMediaQuery(PHONE_QUERY, false);
  const coarse = useMediaQuery("(pointer: coarse)", false);
  const dark = useMediaQuery("(prefers-color-scheme: dark)", false);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", false);
  const width = useLiveWidth();

  return (
    <OutTable
      rows={[
        ["window.innerWidth", px(width)],
        ["PHONE_QUERY", `"${PHONE_QUERY}"`],
        ["useMediaQuery(PHONE_QUERY, false)", <Bool value={phone} />],
        ["useMediaQuery('(pointer: coarse)', false)", <Bool value={coarse} />],
        [
          "useMediaQuery('(prefers-color-scheme: dark)', false)",
          <>
            <Bool value={dark} /> <Aside>— the OS setting, not this page's toggle</Aside>
          </>,
        ],
        [
          "useMediaQuery('(prefers-reduced-motion: reduce)', false)",
          <>
            <Bool value={reduced} />{" "}
            <Aside>— when true, useCloseTransition below never animates</Aside>
          </>,
        ],
      ]}
    />
  );
}

/* ── useAnchoredRect ────────────────────────────────────────────────────────── */

function rectRows(rect: AnchorRect | null): Array<[string, ReactNode]> {
  if (!rect) {
    return [
      [
        "useAnchoredRect(ref, false)",
        <>
          null <Aside>— nothing is measured while closed</Aside>
        </>,
      ],
    ];
  }
  return [
    ["rect.top", px(rect.top)],
    ["rect.left", px(rect.left)],
    ["rect.right", px(rect.right)],
    ["rect.bottom", px(rect.bottom)],
    ["rect.width", px(rect.width)],
    ["rect.height", px(rect.height)],
  ];
}

function AnchoredRectReadout() {
  // A raw <button> rather than the kit's <Button>: `Button` takes
  // `ButtonHTMLAttributes` and forwards no ref, so it cannot be an anchor. That is
  // what `buttonClasses` exists for — see the note under this specimen.
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [tracking, setTracking] = useState(false);
  const rect = useAnchoredRect(anchorRef, tracking);

  return (
    <div className="space-y-3">
      <Row>
        <button
          type="button"
          ref={anchorRef}
          className={buttonClasses("secondary")}
          onClick={() => setTracking((v) => !v)}
        >
          {tracking ? "Stop measuring" : "Measure this button"}
        </button>
      </Row>
      <OutTable rows={rectRows(rect)} />
    </div>
  );
}

/* ── useAnchoredPanel + anchoredPanelPlacement ──────────────────────────────── */

function AnchoredPanelSpecimen() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  // A deliberately small `preferredHeight`, so the cap is reachable on a desktop
  // window: at the default 320 the panel fits nearly everywhere and `maxHeight`
  // never moves, which makes the interesting half of the return value invisible.
  const panel = useAnchoredPanel(triggerRef, open, { preferredHeight: 220, minHeight: 140 });
  const rect = panel.rect;

  return (
    <div className="space-y-3">
      <Row>
        <button
          type="button"
          ref={triggerRef}
          className={buttonClasses(open ? "brand" : "secondary")}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close the panel" : "Open a panel under this trigger"}
        </button>
      </Row>
      <OutTable
        rows={[
          ["panel.rect", rect ? `{ top: ${px(rect.top)}, bottom: ${px(rect.bottom)} }` : "null"],
          ["panel.top", px(panel.top)],
          [
            "panel.maxHeight",
            <>
              {px(panel.maxHeight)} <Aside>— preferredHeight 220, floor 96</Aside>
            </>,
          ],
          [
            "panel.above",
            <>
              <Bool value={panel.above} />{" "}
              <Aside>— flipped only when below is unusable AND above is roomier</Aside>
            </>,
          ],
        ]}
      />
      {open && rect &&
        createPortal(
          <div
            role="dialog"
            aria-label="Anchored panel specimen"
            // The hook returns the VERTICAL half only. Horizontal placement is the
            // caller's on purpose — the kit's pickers align to the trigger's left
            // edge and its popovers to the right — so `left`/`width` are computed
            // here from the same rect, and `maxHeight` is paired with an internal
            // `overflow-y` exactly as the hook's docblock requires.
            style={{
              position: "fixed",
              top: panel.top,
              left: rect.left,
              width: Math.max(rect.width, 240),
              maxHeight: panel.maxHeight,
              zIndex: 50,
            }}
            className="overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-2 shadow-lg"
          >
            <ul className="space-y-1">
              {Array.from({ length: 12 }, (_, i) => (
                <li
                  key={i}
                  className="rounded px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)]"
                >
                  Row {i + 1}
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}

/**
 * The pure half, evaluated live rather than transcribed.
 *
 * The expression column is built from the same data the call receives, so the two
 * cannot drift — a hand-typed "expected" column beside a helper is a second
 * implementation that nothing compares against.
 */
function PlacementMath() {
  const cases: Array<[note: string, rect: Pick<AnchorRect, "top" | "bottom">, view: ViewportBox]> =
    [
      ["room below, so no flip", { top: 100, bottom: 130 }, { top: 0, height: 800 }],
      ["trigger low on the page", { top: 700, bottom: 730 }, { top: 0, height: 800 }],
      [
        "same trigger, keyboard up: only 360px is on screen",
        { top: 500, bottom: 530 },
        { top: 0, height: 360 },
      ],
      [
        "neither side usable — takes the 96px floor and overflows the margin",
        { top: 10, bottom: 150 },
        { top: 0, height: 200 },
      ],
    ];

  const rows: Array<[string, ReactNode]> = cases.map(([note, rect, view]) => {
    const out = anchoredPanelPlacement(rect, view);
    return [
      `anchoredPanelPlacement({top:${rect.top},bottom:${rect.bottom}}, {top:${view.top},height:${view.height}})`,
      <>
        {`{ top: ${out.top}, maxHeight: ${out.maxHeight}, above: ${out.above} }`}{" "}
        <Aside>— {note}</Aside>
      </>,
    ];
  });

  return <OutTable rows={rows} />;
}

/* ── useVisualViewport ──────────────────────────────────────────────────────── */

function VisualViewportReadout() {
  // `active` is true for as long as this section is mounted, so the readout is live
  // without a toggle. The hook only subscribes to events; it writes nothing.
  const box = useVisualViewport(true);
  const [hasApi, setHasApi] = useState(false);
  // In an effect rather than during render: `window.visualViewport` is absent in
  // jsdom and under SSR, and this is a display detail, not something to branch the
  // first paint on.
  useEffect(() => {
    setHasApi(typeof window !== "undefined" && Boolean(window.visualViewport));
  }, []);

  return (
    <OutTable
      rows={[
        ["window.visualViewport", <Bool value={hasApi} />],
        [
          "useVisualViewport(true)",
          box ? (
            `{ top: ${px(box.top)}, height: ${px(box.height)} }`
          ) : (
            <>
              null <Aside>— nothing is eating the viewport, so keep the static layout</Aside>
            </>
          ),
        ],
      ]}
    />
  );
}

/* ── useEscapeKey + useOutsideClick ─────────────────────────────────────────── */

function DismissSpecimen() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState("—");

  const closeBy = useCallback((reason: string) => {
    setOpen(false);
    setLast(reason);
  }, []);

  // Inline arrows are safe here by design: both hooks keep the handler in a ref
  // that an effect refreshes every render, so the document listener re-subscribes
  // only when `enabled` flips — not on every render of this component.
  useEscapeKey(() => closeBy("useEscapeKey — Escape"), open);
  // Passing the TRIGGER's ref as well as the panel's is not belt-and-braces: without
  // it a click on the trigger while open would fire the outside-click on pointerdown
  // and the toggle on click, closing and immediately reopening the panel.
  useOutsideClick(
    [triggerRef, panelRef],
    () => closeBy("useOutsideClick — a press that landed outside"),
    open,
  );

  return (
    <div className="space-y-3">
      <Row>
        <button
          type="button"
          ref={triggerRef}
          className={buttonClasses(open ? "brand" : "secondary")}
          onClick={() => (open ? closeBy("the trigger") : setOpen(true))}
        >
          {open ? "Close" : "Open a dismissible panel"}
        </button>
        <span className="text-xs text-[var(--text-muted)]">
          then press Escape, or click anywhere off the panel
        </span>
      </Row>
      {open && (
        <div ref={panelRef} className={cn(PANEL, "max-w-sm")}>
          <p>
            Rendered inline, not portalled, so &ldquo;outside&rdquo; is somewhere you can see.
          </p>
          <Row className="mt-3">
            <Button variant="secondary" onClick={() => closeBy("a button inside the panel")}>
              Close from inside
            </Button>
          </Row>
        </div>
      )}
      <OutTable
        rows={[
          ["enabled (both hooks)", <Bool value={open} />],
          ["last dismissal", last],
        ]}
      />
    </div>
  );
}

/* ── useOverlayHistory ──────────────────────────────────────────────────────── */

function OverlayHistorySpecimen() {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState("—");

  // The hook only ever calls this for a pop it has proved is ITS entry, so the
  // label is safe: a Back press that consumed somebody else's sentinel does not
  // reach here.
  const onHistoryClose = useCallback(() => {
    setOpen(false);
    setLast("the Back gesture (a popstate this hook claimed)");
  }, []);
  useOverlayHistory(open, onHistoryClose);

  return (
    <div className="space-y-3">
      <Row>
        <Button variant="secondary" onClick={() => setOpen(true)} disabled={open}>
          Open, then press Back
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setOpen(false);
            setLast("the panel's own button — the pushed entry is unwound on cleanup");
          }}
          disabled={!open}
        >
          Close normally
        </Button>
      </Row>
      {open && (
        <div className={cn(PANEL, "max-w-sm")}>
          A same-URL history entry is on the stack while this is open. Press the browser&rsquo;s
          Back gesture: the address does not change and the page underneath does not re-render
          — only this panel closes.
        </div>
      )}
      <OutTable
        rows={[
          ["open (the hook's first argument)", <Bool value={open} />],
          ["last close", last],
        ]}
      />
    </div>
  );
}

/* ── useCloseTransition + OVERLAY_EXIT_MS ───────────────────────────────────── */

function CloseTransitionSpecimen() {
  const [open, setOpen] = useState(false);
  const { closing, requestClose } = useCloseTransition(() => setOpen(false));
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", false);

  return (
    <div className="space-y-3">
      <Row>
        <Button variant={open ? "brand" : "secondary"} onClick={() => setOpen(true)} disabled={open}>
          Open
        </Button>
        {/* `requestClose`, never the raw setter — that is the whole contract. Calling
            `setOpen(false)` here would unmount the panel on the spot and the exit
            keyframes would never run, which is exactly the bug the hook exists to
            make impossible for the affordances a user dismisses with. */}
        <Button variant="secondary" onClick={requestClose} disabled={!open}>
          requestClose()
        </Button>
      </Row>
      {open && (
        <div
          className={cn(
            PANEL,
            "max-w-sm",
            closing ? "animate-overlay-out" : "animate-overlay",
          )}
        >
          Still mounted while <code className="font-mono">closing</code> is true — that is what
          buys the exit its {OVERLAY_EXIT_MS}ms.
        </div>
      )}
      <OutTable
        rows={[
          ["OVERLAY_EXIT_MS", String(OVERLAY_EXIT_MS)],
          ["open", <Bool value={open} />],
          [
            "closing",
            <>
              <Bool value={closing} />{" "}
              {reduced && <Aside>— reduced motion is on, so this never turns true</Aside>}
            </>,
          ],
        ]}
      />
    </div>
  );
}

/* ── useFocusTrap ───────────────────────────────────────────────────────────── */

function FocusTrapSpecimen() {
  const [open, setOpen] = useState(false);
  const [nested, setNested] = useState(false);
  const [restoreFocus, setRestoreFocus] = useState(true);
  const [initialFocus, setInitialFocus] = useState<"container" | "first" | "save">("container");
  const panel = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const save = useRef<HTMLButtonElement>(null);
  const options: FocusTrapOptions = {
    active: open,
    restoreFocus,
    // The thunk form: any element, found when the trap engages.
    initialFocus: initialFocus === "save" ? () => save.current : initialFocus,
  };
  useFocusTrap(panel, options);
  useFocusTrap(inner, { active: nested, initialFocus: "first" });
  useEscapeKey(() => (nested ? setNested(false) : setOpen(false)), open);

  return (
    <div className="space-y-3">
      <Row>
        <Button variant="secondary" onClick={() => setOpen(true)} disabled={open}>
          Open a trapped panel
        </Button>
        <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={restoreFocus}
            onChange={(e) => setRestoreFocus(e.target.checked)}
          />
          restoreFocus
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          initialFocus
          <select
            value={initialFocus}
            onChange={(e) => setInitialFocus(e.target.value as typeof initialFocus)}
            className="rounded border border-[var(--border)] bg-[var(--bg-surface)] px-1 py-0.5 text-xs"
          >
            <option value="container">&quot;container&quot;</option>
            <option value="first">&quot;first&quot;</option>
            <option value="save">{"() => saveButton"}</option>
          </select>
        </label>
      </Row>
      {open && (
        // tabIndex -1: the default `initialFocus` focuses the container itself.
        <div ref={panel} tabIndex={-1} className={cn(PANEL, "max-w-md space-y-2 outline-none")}>
          <p className="text-xs text-[var(--text-secondary)]">
            Tab and Shift+Tab cycle inside this box; Escape closes it.
          </p>
          <input
            aria-label="Name"
            placeholder="A field"
            className="w-full rounded border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-sm"
          />
          <Row>
            {/* A native button: the kit's Button takes no ref, and the thunk needs one. */}
            <button
              ref={save}
              type="button"
              className={buttonClasses("brand")}
              onClick={() => setOpen(false)}
            >
              Save
            </button>
            <Button variant="secondary" onClick={() => setNested(true)} disabled={nested}>
              Open a nested trap
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
          </Row>
          {nested && (
            <div ref={inner} className={cn(PANEL, "space-y-2 bg-[var(--bg-surface)]")}>
              <p className="text-xs text-[var(--text-secondary)]">
                The innermost trap owns Tab now; closing it hands control back.
              </p>
              <Row>
                <Button variant="secondary">One</Button>
                <Button variant="secondary">Two</Button>
                <Button variant="ghost" onClick={() => setNested(false)}>
                  Close nested
                </Button>
              </Row>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── useAnnounce ────────────────────────────────────────────────────────────── */

function AnnounceSpecimen() {
  const polite = useAnnounce();
  const assertive = useAnnounce({ politeness: "assertive" });
  const [page, setPage] = useState(1);
  const [said, setSaid] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <Row>
        <Button
          variant="secondary"
          onClick={() => {
            const next = page + 1;
            setPage(next);
            const text = `Page ${next} of 14`;
            polite.announce(text);
            setSaid(`polite: "${text}"`);
          }}
        >
          Next page (polite)
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            assertive.announce("Upload failed");
            setSaid('assertive: "Upload failed"');
          }}
        >
          Fail (assertive)
        </Button>
      </Row>
      {/* The two live regions: visually hidden, read by a screen reader. */}
      <span {...polite.regionProps} />
      <span {...assertive.regionProps} />
      <OutTable
        rows={[
          ["last announce()", said ?? "(none yet)"],
          ["useAnnounce().regionProps.role", polite.regionProps.role],
          [
            'useAnnounce({ politeness: "assertive" }).regionProps.role',
            assertive.regionProps.role,
          ],
          ["regionProps.className", polite.regionProps.className],
        ]}
      />
    </div>
  );
}

/* ── logger ─────────────────────────────────────────────────────────────────── */

/** A real store behind the kit's middleware, created once at module scope like any
 *  zustand store. Creating it logs nothing; only a `set` does. */
const useDemoCounter = create<{ count: number; bump: () => void }>()(
  logger((set) => ({ count: 0, bump: () => set((s) => ({ count: s.count + 1 })) }), "showcase-demo"),
);

function LoggerSpecimen() {
  const count = useDemoCounter((s) => s.count);
  const bump = useDemoCounter((s) => s.bump);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  return (
    <Row>
      <Button variant="secondary" onClick={bump}>
        bump() — count {count}
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          setStoreLog(true);
          setEnabled(true);
        }}
      >
        setStoreLog(true)
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          setStoreLog(false);
          setEnabled(false);
        }}
      >
        setStoreLog(false)
      </Button>
      <span className="font-mono text-xs text-[var(--text-muted)]">
        {enabled === null ? "default for this build" : `logging ${enabled ? "on" : "off"}`} — open
        the console and bump
      </span>
    </Row>
  );
}

/* ── useBodyScrollLock ──────────────────────────────────────────────────────── */

function ScrollLockSpecimen() {
  const [dialog, setDialog] = useState(false);
  const [sheet, setSheet] = useState(false);
  // Two calls, unconditionally, from one component — which is precisely the shape
  // the hook was rewritten for: a dialog whose amount field opens a numpad sheet.
  // Neither caller knows about the other, so the count that reconciles them lives in
  // the hook's module. Release them in EITHER order and the page scrolls again; the
  // old save/restore idiom left the body locked with nothing on screen.
  useBodyScrollLock(dialog);
  useBodyScrollLock(sheet);

  const [body, setBody] = useState({ overflow: "", paddingRight: "" });
  // Declared after both locks, so it reads the style they have just written: React
  // runs effects in declaration order within a commit.
  useEffect(() => {
    setBody({
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
    });
  }, [dialog, sheet]);

  return (
    <div className="space-y-3">
      <Row>
        <Button variant={dialog ? "brand" : "secondary"} onClick={() => setDialog((v) => !v)}>
          {dialog ? "Release lock A" : "Lock A (a dialog)"}
        </Button>
        <Button variant={sheet ? "brand" : "secondary"} onClick={() => setSheet((v) => !v)}>
          {sheet ? "Release lock B" : "Lock B (a sheet on top of it)"}
        </Button>
      </Row>
      <OutTable
        rows={[
          ["locks held", String(Number(dialog) + Number(sheet))],
          [
            "document.body.style.overflow",
            body.overflow === "" ? (
              <>
                "" <Aside>— restored</Aside>
              </>
            ) : (
              `"${body.overflow}"`
            ),
          ],
          [
            "document.body.style.paddingRight",
            body.paddingRight === "" ? (
              <>
                "" <Aside>— nothing to compensate (overlay scrollbars)</Aside>
              </>
            ) : (
              <>
                {`"${body.paddingRight}"`}{" "}
                <Aside>— replacing the classic scrollbar's width</Aside>
              </>
            ),
          ],
        ]}
      />
    </div>
  );
}

/* ── cn ─────────────────────────────────────────────────────────────────────── */

/**
 * Evaluated at module scope, with each call sitting beside the source text that
 * produced it, so a reader can see the input and the real output together and the
 * pair cannot drift the way a hand-written result column does.
 */
const CN_CASES: Array<[string, string]> = [
  ['cn("px-2", "px-4")', cn("px-2", "px-4")],
  ['cn("px-2 py-1", "p-4")', cn("px-2 py-1", "p-4")],
  [
    'cn("text-[var(--text-muted)]", "text-[var(--text-primary)]")',
    cn("text-[var(--text-muted)]", "text-[var(--text-primary)]"),
  ],
  [
    'cn("rounded-md", false && "shadow-lg", undefined)',
    // The constantly-false argument IS the specimen: it shows cn dropping falsy values.
    // eslint-disable-next-line no-constant-binary-expression -- deliberate, see above
    cn("rounded-md", false && "shadow-lg", undefined),
  ],
  [
    'cn(["border", { "border-[var(--border)]": true, "opacity-50": false }])',
    cn(["border", { "border-[var(--border)]": true, "opacity-50": false }]),
  ],
  ['cn("p-2", "")', cn("p-2", "")],
];

/* ── the section ────────────────────────────────────────────────────────────── */

export function HooksLib() {
  return (
    <>
      <Example
        label="useMediaQuery(query, fallback)"
        hint="Drag the window across 768px and watch the first two rows."
      >
        <MediaQueryReadout />
        <Note>
          <code className="font-mono">fallback</code> is required, not optional, because there is
          a real moment when there is no answer: SSR, and any environment without{" "}
          <code className="font-mono">matchMedia</code>. Every phone branch in the kit —
          the sheet pickers, the numpad, the mobile feedback dialog — reads{" "}
          <code className="font-mono">PHONE_QUERY</code> through this hook with{" "}
          <code className="font-mono">false</code>, so &ldquo;not known yet&rdquo; renders the
          desktop path rather than flashing a sheet.
        </Note>
      </Example>

      <Example
        label="useAnchoredRect(ref, open)"
        hint="Measures while open; scroll or resize and the numbers follow."
      >
        <AnchoredRectReadout />
        <Note>
          The hook publishes a rect only when one of the six fields actually changed. That guard
          is not a micro-optimisation: it listens for scroll on the CAPTURE phase so nested
          scroll containers are caught too, every measurement allocates a fresh object, and
          React compares state by identity — so without it a momentum scroll re-rendered the
          anchored panel roughly once a frame whether or not the anchor had moved.
        </Note>
      </Example>

      <Example
        label="useAnchoredPanel(ref, open, options)"
        hint="Scroll until the trigger is near the bottom of the window, then open it — above flips."
      >
        <AnchoredPanelSpecimen />
        <Note>
          The returned <code className="font-mono">maxHeight</code> is what makes the flip
          sufficient rather than merely different: a tall panel placed above without a cap just
          runs off the top instead of the bottom. Apply it together with an internal{" "}
          <code className="font-mono">overflow-y</code>, as the portal above does.
        </Note>
      </Example>

      <Example
        label="anchoredPanelPlacement(rect, viewport, options)"
        hint="The pure geometry, called live — no DOM, no keyboard."
      >
        <PlacementMath />
        <Note>
          Split out of the hook so the geometry is testable without a browser and a fake
          keyboard. The third row is the case the whole thing exists for (feedback #135): on
          Android the layout viewport does NOT shrink when the on-screen keyboard opens, so a
          panel pinned below a trigger in the lower half of the screen ends up behind it with
          nothing the user can do — <code className="font-mono">position: fixed</code> does not
          scroll.
        </Note>
      </Example>

      <Example
        label="useVisualViewport(active)"
        hint="null on a desktop, and on this page — that is the correct answer."
      >
        <VisualViewportReadout />
        <Note>
          The same measurement <code className="font-mono">useAnchoredPanel</code> caps a
          dropdown with, handed over as a box for the callers that need it — a full-screen sheet
          cannot use <code className="font-mono">inset-0</code>, because that still spans the
          whole screen while the keyboard is up. It returns null wherever there is nothing to
          correct, so the caller keeps its static layout and the desktop renders exactly the
          markup it always did. The 1px slack in the comparison is not superstition:{" "}
          <code className="font-mono">visualViewport.height</code> is fractional on a
          non-integer device pixel ratio, and a strict test would report a 0.4px
          &ldquo;keyboard&rdquo; on every phone.
        </Note>
      </Example>

      <Example
        label="useEscapeKey(handler, enabled) · useOutsideClick(refs, handler, enabled)"
        hint="One document listener each, shared by every dismissible surface in the kit."
      >
        <DismissSpecimen />
        <Note>
          The outside-click listens for <code className="font-mono">pointerdown</code>, not{" "}
          <code className="font-mono">mousedown</code>: one event covering mouse, touch and pen.
          A tap that begins a scroll, or one on an element that preventDefaults the touch
          sequence, may never synthesise a mousedown at all — and every picker, menu and flyout
          in a phone-first app dismisses through this hook. The deliberate consequence is that a
          touch-drag starting outside an open panel now dismisses it at touch-down.
        </Note>
      </Example>

      <Example
        label="useOverlayHistory(open, onClose)"
        hint="Needs a real browser history; the Back gesture is the specimen."
      >
        <OverlayHistorySpecimen />
        <Note>
          A throwaway SAME-URL entry, not a URL parameter — deliberately. Encoding &ldquo;a
          dialog is open&rdquo; in the address bar makes it shareable and restorable, which is
          wrong for a confirm dialog, and it would fight the page-owned{" "}
          <code className="font-mono">?row=</code> and <code className="font-mono">f.*</code>{" "}
          params that ARE meaningful state. A pop is only claimed when the entry we land on is
          no longer ours, so a second sentinel stacked on top by an app&rsquo;s own unsaved-edit
          guard cannot close the overlay underneath it.
        </Note>
      </Example>

      <Example
        label="useCloseTransition(onClose, ms) · OVERLAY_EXIT_MS"
        hint="Watch closing go true for 220ms before the panel leaves."
      >
        <CloseTransitionSpecimen />
        <Note>
          It deliberately does not intercept a close the CALLER decides on. A dialog that closes
          itself after a successful save unmounts with no exit animation, and that is the right
          trade — otherwise every overlay would need an{" "}
          <code className="font-mono">open</code> prop and every caller would wait on a callback
          to learn when its own state took effect. What gets animated is what the user
          dismissed. Under reduced motion it closes immediately and the{" "}
          <code className="font-mono">-out</code> classes are never applied, which is why
          tokens.css needs no reduced-motion rule for them.
        </Note>
      </Example>

      <Example
        label="useBodyScrollLock(locked)"
        hint="Hold one lock and try to scroll the page. Then hold both and release either."
      >
        <ScrollLockSpecimen />
        <Note>
          The count is module-level because the lockers do not know about each other, and that
          is the only place they can agree. Per-locker save/restore composes only if releases
          are strictly nested in reverse order of acquisition — and React runs unmount cleanups
          PARENT FIRST, which is the opposite. The gesture that broke it was ordinary: open a
          dialog, tap the amount so the numpad sheet opens and captures the
          &ldquo;hidden&rdquo; the dialog had already set, press Save. Both unmounted together,
          the dialog restored first, the sheet put &ldquo;hidden&rdquo; back, and the page was
          left unscrollable with no overlay on it. Only a reload cleared it.
        </Note>
      </Example>

      <Example
        label="useFocusTrap(ref, { active, restoreFocus, initialFocus })"
        hint="Open the panel and press Tab repeatedly — focus never leaves it."
      >
        <FocusTrapSpecimen />
        <Note>
          The tabbable list is recomputed on every Tab, so fields that appear later are included.
          With <code className="font-mono">restoreFocus</code> on, closing puts focus back on the
          button that opened the panel. <code className="font-mono">&quot;container&quot;</code>{" "}
          is the default because focusing a field first pops the phone keyboard before the user
          has asked to type.
        </Note>
      </Example>

      <Example
        label="useAnnounce({ politeness })"
        hint="For a change that moves no focus — use a screen reader to hear it."
      >
        <AnnounceSpecimen />
        <Note>
          <code className="font-mono">announce</code> clears the region and sets the text a tick
          later, so saying the same sentence twice is still read twice.
        </Note>
      </Example>

      <Example
        label="cn(...inputs)"
        hint="clsx for the conditionals, tailwind-merge for the conflicts."
      >
        <OutTable rows={CN_CASES.map(([expr, out]) => [expr, `"${out}"`])} />
        <Note>
          The first two rows are the reason this is not just{" "}
          <code className="font-mono">clsx</code>. A plain join would emit{" "}
          <code className="font-mono">&quot;px-2 px-4&quot;</code> and leave the winner to CSS
          source order — i.e. to the order Tailwind happened to generate the utilities in, which
          a caller cannot see and cannot influence. tailwind-merge makes LATER WIN, which is
          what a <code className="font-mono">className</code> prop has to mean if a consumer is
          to override anything a component sets by default. Row two shows it understands
          shorthand: <code className="font-mono">p-4</code> supersedes both{" "}
          <code className="font-mono">px-2</code> and <code className="font-mono">py-1</code>.
        </Note>
      </Example>

      <Example
        label="logger · setStoreLog(enabled)"
        hint="Its only output is a console.debug line per set — open devtools."
      >
        <LoggerSpecimen />
        <pre className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] p-3 font-mono text-xs text-[var(--text-secondary)]">
          {`import { create } from "zustand";
import { logger } from "@eifi1/ui-kit";

export const useTx = create<TxState>()(
  logger((set) => ({ rows: [], setRows: (rows) => set({ rows }) }), "transactions"),
);`}
        </pre>
        <OutTable
          rows={[
            ['localStorage["store_log"] === "0"', "off"],
            ['localStorage["store_log"] === "1"', "on, even in a production build"],
            ["unset, dev build", "on"],
            [
              "unset, vitest run",
              <>
                off <Aside>— vitest also sets DEV, and this is not a dev build</Aside>
              </>,
            ],
            ["unset, production build", "off"],
            ["setStoreLog(true)", "on for the rest of the session"],
          ]}
        />
        <Note>
          The middleware wraps a zustand store&rsquo;s <code className="font-mono">set</code>: the
          counter above is a real store built with it, and each bump logs{" "}
          <code className="font-mono">{"{ prev, next }"}</code> while logging is on. The decision above is read
          ONCE at module scope rather than on every <code className="font-mono">set</code> — the
          stores this wraps transition per pointer event, and the override cannot change without
          a reload anyway. <code className="font-mono">setStoreLog</code> is the console escape
          hatch that per-call read was really buying.
        </Note>
      </Example>

      <Note>
        The rest of the non-visual surface, and what is deliberately not on this page:{" "}
        <code className="font-mono">useRowSwipe</code> is exported and is shown with{" "}
        <code className="font-mono">SwipeableRow</code> under &ldquo;Tour, palette &amp;
        files&rdquo;; the <code className="font-mono">lib/calc</code> helpers are exported and
        shown under &ldquo;Numbers &amp; money&rdquo;, where the fields that parse with them
        are. Two things a reader may go looking for are NOT exported from the barrel at all:{" "}
        <code className="font-mono">useMobileReveal</code> (src/components/use-mobile-reveal.ts,
        imported only by DataTable) and{" "}
        <code className="font-mono">readStored</code>/<code className="font-mono">writeStored</code>{" "}
        (src/lib/safe-storage.ts, the localStorage guard the logger and AppShell read through).
        They cannot be demonstrated from a consumer&rsquo;s import, so they are not demonstrated
        here.
      </Note>
    </>
  );
}
