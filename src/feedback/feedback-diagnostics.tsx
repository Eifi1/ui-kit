/**
 * `context.diagnostics` (§3.2), drawn one way wherever it shows: in the submit dialog's
 * context box, to the reporter before it goes (§4.2), and in the row detail, to the admin
 * and the author afterwards (§4.4.2). One module for both, so the reporter is shown the
 * very lines the admin will read (keksdose live #481).
 *
 * Internal: neither `@eifi1/ui-kit/feedback` nor the barrel names it.
 */

/** `diagnostics` as [key, text] pairs, in the app's order: a string, number or boolean as
 *  written, an object or a list as JSON, nothing as "—". Empty for no diagnostics, and for
 *  a value that is not a plain object — the server stores whatever the client sent. */
export function diagnosticsEntries(diagnostics: unknown): Array<[string, string]> {
  if (!diagnostics || typeof diagnostics !== "object" || Array.isArray(diagnostics)) return [];
  return Object.entries(diagnostics).map(([key, v]) => [
    key,
    v === null || v === undefined || v === ""
      ? "—"
      : typeof v === "object"
        ? JSON.stringify(v)
        : String(v as string | number | boolean | bigint),
  ]);
}

/** The pairs as a definition list: each key beside its value, in monospace. Read-only in
 *  both places; the heading over it is the caller's. */
export function FeedbackDiagnosticsList({ entries }: { entries: ReadonlyArray<readonly [string, string]> }) {
  return (
    <dl
      className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 font-mono text-xs"
      data-feedback-diagnostics=""
    >
      {entries.map(([key, text]) => (
        <div key={key} className="contents">
          <dt className="text-muted">{key}</dt>
          <dd className="min-w-0 break-words text-secondary">{text}</dd>
        </div>
      ))}
    </dl>
  );
}
