import { useEffect, useId, useRef, useState } from "react";
import { Disclosure, cn } from "@eifi1/ui-kit";
import { Example, Note, Stage } from "../lib/section";

/**
 * DISCLOSURE — the 0.10.0 header shapes: the figure INSIDE the trigger, the chevron
 * right after the title, and trigger-only mode with nothing to point at yet.
 */

const EUR = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" });

const RESULTS = [
  { label: "Revenue", value: 48210.5, parts: [["Rent", 45100], ["Parking", 3110.5]] },
  { label: "Operating costs", value: -21340.2, parts: [["Maintenance", -12880.2], ["Insurance", -8460]] },
  { label: "Net profit", value: 26870.3, parts: [["Before tax", 26870.3]] },
] as const;

function ResultRows() {
  return (
    <Example
      label="Disclosure — trailingInTrigger and chevronPosition after-title"
      hint="the figure is part of the button and its name; the chevron hugs the label so the labels keep one column"
    >
      <Stage>
        <div data-stage="wide" className="mx-auto w-full max-w-md divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
          {RESULTS.map((r) => (
            <Disclosure
              key={r.label}
              variant="bare"
              title={r.label}
              chevronPosition="after-title"
              trailingInTrigger
              trailing={<span className="font-medium tabular-nums text-[var(--text-primary)]">{EUR.format(r.value)}</span>}
              className="px-3 py-2"
              headerClassName="text-sm text-[var(--text-secondary)]"
            >
              <ul className="space-y-0.5 py-1 ps-3 text-xs text-[var(--text-muted)]">
                {r.parts.map(([name, v]) => (
                  <li key={name} className="flex justify-between gap-3">
                    <span>{name}</span>
                    <span className="tabular-nums">{EUR.format(v)}</span>
                  </li>
                ))}
              </ul>
            </Disclosure>
          ))}
          <div className="flex justify-between px-3 py-2 text-sm text-[var(--text-secondary)]">
            <span>Tax rate (not expandable)</span>
            <span className="font-medium tabular-nums text-[var(--text-primary)]">15.8 %</span>
          </div>
        </div>
      </Stage>
      <Note>
        <code className="font-mono">trailingInTrigger</code> renders <code className="font-mono">trailing</code> inside
        the header button: the whole row — figure included — is one click target, and the button is named
        &ldquo;Net profit €26,870.30&rdquo;, not &ldquo;Net profit&rdquo; beside an unexplained number. Only for
        content that is not interactive — an action still belongs in the default, sibling{" "}
        <code className="font-mono">trailing</code>. <code className="font-mono">chevronPosition=&quot;after-title&quot;</code>{" "}
        puts the chevron right after the label&apos;s text, pointing down and turning up, so the expandable labels
        start on the same column as the plain row below them, and the far end stays the figure&apos;s.
      </Note>
    </Example>
  );
}

const GROUP_ROWS = ["Rent", "Electricity", "Internet", "Insurance"];

function EmptyControls() {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const base = useId();
  const shown = GROUP_ROWS.filter((r) => r.toLowerCase().includes(query.trim().toLowerCase()));
  const ids = open ? shown.map((r) => `${base}-${r}`).join(" ") : "";
  const headerRef = useRef<HTMLDivElement>(null);
  const [attr, setAttr] = useState<string | null>(null);
  // Read back from the DOM, so the readout shows what the header really carries —
  // once after mount, then whenever the attribute changes.
  useEffect(() => {
    const button = headerRef.current?.querySelector("button");
    if (!button) return;
    const read = () => setAttr(button.getAttribute("aria-controls"));
    const frame = requestAnimationFrame(read);
    const observer = new MutationObserver(read);
    observer.observe(button, { attributes: true, attributeFilter: ["aria-controls"] });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);
  return (
    <Example
      label="Disclosure — an empty controls"
      hint="trigger-only with nothing to point at: no aria-controls at all rather than an empty one, and it still toggles"
    >
      <Stage>
        <div data-stage="wide" className="mx-auto w-full max-w-md space-y-2">
          <input
            aria-label="Filter the fixed costs"
            placeholder="Filter the rows (try “zzz”)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
          <div ref={headerRef}>
            <Disclosure
              variant="bare"
              title={`Fixed costs (${shown.length})`}
              controls={ids}
              open={open}
              onOpenChange={setOpen}
            />
          </div>
          <ul className="overflow-hidden rounded-md border border-[var(--border)]">
            {open &&
              shown.map((r, i) => (
                <li
                  key={r}
                  id={`${base}-${r}`}
                  className={cn("px-3 py-1.5 text-sm text-[var(--text-primary)]", i > 0 && "border-t border-[var(--border)]")}
                >
                  {r}
                </li>
              ))}
            {(!open || shown.length === 0) && (
              <li className="px-3 py-1.5 text-xs text-[var(--text-muted)]">{open ? "No rows match." : "Folded."}</li>
            )}
          </ul>
          <p className="font-mono text-xs text-[var(--text-secondary)]">
            aria-controls = {attr === null ? "(none)" : `"${attr}"`}
          </p>
        </div>
      </Stage>
      <Note>
        <code className="font-mono">controls</code> is an IDREF LIST — here each rendered row&apos;s id, joined with
        spaces, since what folds is several siblings of the header. Filter every row away (or fold the group) and
        it becomes the empty string: the header then carries no <code className="font-mono">aria-controls</code>,
        which the readout shows, and still toggles.
      </Note>
    </Example>
  );
}

export function DisclosureMore() {
  return (
    <>
      <ResultRows />
      <EmptyControls />
    </>
  );
}
