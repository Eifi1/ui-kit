import { fireEvent, render as rtlRender, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import { translationRows } from "../../lib/translation-review";
import type { TranslationReview, TranslationRow } from "../../lib/translation-review";
import {
  ReviewStatusChip,
  TranslationExportButton,
  TranslationLocaleTabs,
  TranslationProgress,
  TranslationReviewEditor,
  TranslationReviewPanel,
} from "../translation-review";
import type { TranslationReviewPanelProps } from "../translation-review";
import { WriteLockProvider } from "../write-lock";
import type { WriteLockHold } from "../write-lock";

/**
 * keksdose's /translations page and kastlan's copy of it, as kit parts. What has to hold
 * is the contract with the app: the panel shows what the rows say, every write goes
 * through a callback with the wording it was given on, a refused write leaves the
 * reviewer's work where it was, and the export is the file both apps already hand a
 * developer. The page tests both apps had (keksdose's translations-page.test.tsx) are
 * here in the panel's terms.
 */

// The panel's DataTable reads the URL (a Router is required either way, as for every
// DataTable); the apps render it inside theirs.
const render = (ui: ReactElement) => rtlRender(ui, { wrapper: MemoryRouter });

function review(overrides: Partial<TranslationReview>): TranslationReview {
  return {
    locale: "fr",
    key: "common.save",
    text: "Enregistrer",
    referenceText: "Save",
    verdict: "APPROVED",
    note: null,
    suggestion: null,
    reviewerName: "Amélie",
    reviewedAt: "2026-10-02T10:00:00Z",
    ...overrides,
  };
}

const ROWS = translationRows({
  locale: "fr",
  strings: {
    "budget.rta": "À attribuer",
    "common.save": "Enregistrer",
    "common.items": "des éléments",
    "legal.terms": "Conditions d’utilisation",
  },
  reference: {
    "budget.rta": "Ready to Assign",
    "common.save": "Save",
    "common.items": "{{count}} items",
    "legal.terms": "Terms of Service",
  },
  reviews: [
    review({}),
    // Judged on an older wording, so it has to be read again.
    review({ key: "budget.rta", text: "A attribuer", referenceText: "Ready to Assign" }),
  ],
});

function setup(props: Partial<TranslationReviewPanelProps> = {}) {
  const onSave = vi.fn();
  const onClear = vi.fn();
  const utils = render(
    <TranslationReviewPanel
      rows={ROWS}
      localeLabel="Français"
      referenceLabel="English"
      onSave={onSave}
      onClear={onClear}
      {...props}
    />,
  );
  return { onSave, onClear, ...utils };
}

const table = () => screen.getByRole("table");
const rowOf = (text: string) => within(table()).getByText(text).closest("tr") as HTMLElement;

describe("TranslationReviewPanel", () => {
  it("lists every string beside its reference, with what is known about it", () => {
    setup();
    expect(within(rowOf("Enregistrer")).getByText("Approved")).toBeInTheDocument();
    expect(within(rowOf("À attribuer")).getByText("Changed since review")).toBeInTheDocument();
    expect(within(rowOf("des éléments")).getByText("Unreviewed")).toBeInTheDocument();
    // `{{count}}` is gone from the French: a machine can see that much.
    expect(within(rowOf("des éléments")).getByText("Placeholders")).toBeInTheDocument();
    expect(within(rowOf("Enregistrer")).queryByText("Placeholders")).toBeNull();
    expect(within(table()).getByText("Ready to Assign")).toBeInTheDocument();
    expect(screen.getByText("1 of 4 approved")).toBeInTheDocument();
  });

  it("narrows by status in the work queue's order, and offers no 'Missing' where nothing is", () => {
    setup();
    const radios = within(screen.getByRole("radiogroup", { name: "Status" })).getAllByRole("radio");
    expect(radios.map((r) => r.textContent)).toEqual([
      "All · 4",
      "Unreviewed · 2",
      "Changed since review · 1",
      "Needs a change · 0",
      "Approved · 1",
    ]);
    fireEvent.click(radios[2]);
    expect(within(table()).queryByText("Enregistrer")).toBeNull();
    expect(within(table()).getByText("À attribuer")).toBeInTheDocument();
  });

  it("narrows by namespace, by placeholder problems and by a search over key, text and reference", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Area"), { target: { value: "common" } });
    expect(within(table()).queryByText("À attribuer")).toBeNull();
    expect(within(table()).getByText("Enregistrer")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Area"), { target: { value: "all" } });
    fireEvent.click(screen.getByLabelText("Only placeholder problems (1)"));
    expect(within(table()).getAllByRole("row").filter((r) => r.closest("tbody"))).toHaveLength(1);
    expect(within(table()).getByText("des éléments")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Only placeholder problems (1)"));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search keys and text" }), { target: { value: "terms of" } });
    expect(within(table()).getByText("Conditions d’utilisation")).toBeInTheDocument();
    expect(within(table()).queryByText("Enregistrer")).toBeNull();
  });

  it("reports filter changes to an app that keeps them in the URL", () => {
    const onFilterChange = vi.fn();
    setup({ filter: { status: "unreviewed" }, onFilterChange });
    // Controlled: the app's status wins.
    expect(within(table()).queryByText("Enregistrer")).toBeNull();
    fireEvent.change(screen.getByLabelText("Area"), { target: { value: "common" } });
    expect(onFilterChange).toHaveBeenLastCalledWith(expect.objectContaining({ status: "unreviewed", namespace: "common" }));
  });

  it("stores a row's approval together with the wording it was given on", async () => {
    const { onSave } = setup();
    fireEvent.click(within(rowOf("À attribuer")).getByRole("button", { name: "Approve" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith([
        {
          locale: "fr",
          key: "budget.rta",
          text: "À attribuer",
          referenceText: "Ready to Assign",
          verdict: "APPROVED",
          note: null,
          suggestion: null,
        },
      ], { origin: "row", toasted: false }),
    );
    // The row's own click opens the editor; the button only approves.
    expect(screen.queryByLabelText("Better wording")).toBeNull();
    // Nothing to approve on an approved row.
    expect(within(rowOf("Enregistrer")).queryByRole("button", { name: "Approve" })).toBeNull();
  });

  it("opens the editor on the current text, and sends a string back with the reviewer's wording", async () => {
    const { onSave } = setup();
    fireEvent.click(rowOf("des éléments"));
    const suggestion = screen.getByLabelText("Better wording");
    // It opens on the current text, so a one-word fix is a one-word edit.
    expect(suggestion).toHaveValue("des éléments");
    // Nothing said yet: a "needs a change" would tell whoever fixes it nothing.
    expect(screen.getByRole("button", { name: "Needs a change" })).toBeDisabled();
    fireEvent.change(suggestion, { target: { value: "{{count}} éléments" } });
    fireEvent.click(screen.getByRole("button", { name: "Needs a change" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith([
        expect.objectContaining({ key: "common.items", verdict: "NEEDS_CHANGE", suggestion: "{{count}} éléments" }),
      ], { origin: "editor", toasted: false }),
    );
    // Resolved: the editor closes.
    await waitFor(() => expect(screen.queryByLabelText("Better wording")).toBeNull());
  });

  it("shows what changed since the verdict, and the placeholders that differ", () => {
    setup();
    fireEvent.click(rowOf("À attribuer"));
    expect(screen.getByText("This string changed after it was reviewed. Please read it again.")).toBeInTheDocument();
    expect(screen.getByText("Wording when reviewed")).toBeInTheDocument();
    expect(screen.getByText("A attribuer")).toBeInTheDocument();
    expect(screen.getByText(/^Approved by Amélie on .*2026/)).toBeInTheDocument();
    fireEvent.click(rowOf("des éléments"));
    expect(screen.getByText(/reference: \{\{count\}\}; this text: —/)).toBeInTheDocument();
  });

  it("keeps the editor open with what was typed and the error when a save is refused", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("403"));
    setup({ onSave, formatError: (error) => `Refused: ${(error as Error).message}` });
    fireEvent.click(rowOf("des éléments"));
    fireEvent.change(screen.getByLabelText("Note (optional)"), { target: { value: "accord" } });
    fireEvent.click(screen.getByRole("button", { name: "Needs a change" }));
    expect(await screen.findByText("Refused: 403")).toBeInTheDocument();
    expect(screen.getByLabelText("Note (optional)")).toHaveValue("accord");
    expect(screen.getByRole("button", { name: "Needs a change" })).toBeEnabled();
  });

  it("bulk-approves the selected rows that are neither approved nor missing, and resets the reviewed ones", async () => {
    const { onSave, onClear } = setup();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve selected" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].map((w: { key: string }) => w.key)).toEqual([
      "budget.rta",
      "common.items",
      "legal.terms",
    ]);
    // Resolved: the selection is gone with the bar.
    await waitFor(() => expect(screen.queryByRole("button", { name: "Approve selected" })).toBeNull());

    fireEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark selected unreviewed" }));
    await waitFor(() =>
      expect(onClear).toHaveBeenCalledWith([
        { locale: "fr", key: "budget.rta" },
        { locale: "fr", key: "common.save" },
      ], { origin: "selection", toasted: false }),
    );
  });

  it("keeps the selection and says so when a bulk save is refused", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("nope"));
    setup({ onSave });
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve selected" }));
    expect(await screen.findByText("That did not work. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve selected" })).toBeInTheDocument();
  });

  it("shows a legal-only reviewer the legal pages and says so", () => {
    setup({ areas: ["legal"], areaLabels: { legal: "the legal pages" } });
    expect(screen.getByText("Your review is limited to: the legal pages.")).toBeInTheDocument();
    expect(within(table()).getByText("Conditions d’utilisation")).toBeInTheDocument();
    expect(within(table()).queryByText("Enregistrer")).toBeNull();
    // Not counted either.
    expect(screen.getByText("0 of 1 approved")).toBeInTheDocument();
  });

  it("is read-only for a locale the viewer may only read", () => {
    setup({ readOnly: true });
    expect(screen.getByText("You can read this language but not review it.")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Select all rows" })).toBeNull();
    expect(within(rowOf("des éléments")).queryByRole("button", { name: "Approve" })).toBeNull();
    fireEvent.click(rowOf("des éléments"));
    expect(screen.queryByLabelText("Better wording")).toBeNull();
    expect(screen.queryByRole("button", { name: "Needs a change" })).toBeNull();
  });

  it("offers 'Missing' and a source filter once kastlan's rows need them", () => {
    const rows = translationRows({
      locale: "fr",
      strings: { "common:save": "Enregistrer", "doc_text.invoice:due": "Payable jusqu’au {date}." },
      reference: { "common:save": "Speichern", "common:cancel": "Abbrechen", "doc_text.invoice:due": "Zahlbar bis {date}." },
      sourceOf: (key) => (key.startsWith("doc_text.") ? "documents" : "screen"),
    });
    setup({ rows, referenceLabel: "Deutsch", sourceLabels: { screen: "Screen", documents: "PDFs and emails" } });
    expect(screen.getByRole("radio", { name: "Missing · 1" })).toBeInTheDocument();
    expect(within(rowOf("Abbrechen")).getByText("Missing in this language")).toBeInTheDocument();
    // Nothing to approve where there is no text.
    expect(within(rowOf("Abbrechen")).queryByRole("button", { name: "Approve" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Texts"), { target: { value: "documents" } });
    expect(within(table()).queryByText("Enregistrer")).toBeNull();
    expect(screen.getByRole("option", { name: "PDFs and emails" })).toBeInTheDocument();
    // The namespace filter follows the source.
    expect(within(screen.getByLabelText("Area")).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "All areas",
      "doc_text.invoice",
    ]);
  });

  it("takes its words from the provider; the prop wins", () => {
    render(
      <UiKitProvider labels={{ translationReview: { statusApproved: "Bestätigt", empty: "Nichts" } }}>
        <TranslationReviewPanel
          rows={ROWS.slice(1, 2)}
          localeLabel="Français"
          referenceLabel="English"
          labels={{ statusApproved: "Prop" }}
        />
      </UiKitProvider>,
    );
    expect(within(table()).getByText("Prop")).toBeInTheDocument();
    expect(screen.queryByText("Bestätigt")).toBeNull();
  });
});

describe("TranslationReviewEditor", () => {
  const missingRow: TranslationRow = translationRows({
    locale: "it",
    strings: {},
    reference: { "common:cancel": "Abbrechen" },
  })[0];

  it("asks for the translation of a missing string, and cannot approve it", async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(
      <TranslationReviewEditor row={missingRow} referenceLabel="Deutsch" localeLabel="Italiano" onSave={onSave} onClose={onClose} />,
    );
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    const field = screen.getByLabelText("Translation");
    expect(field).toHaveValue("");
    fireEvent.change(field, { target: { value: "Annulla" } });
    fireEvent.click(screen.getByRole("button", { name: "Suggest translation" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ key: "common:cancel", text: "", verdict: "NEEDS_CHANGE", suggestion: "Annulla" }),
      ),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("resets a verdict through onClear, with the row's key", async () => {
    const onClear = vi.fn();
    const row = ROWS.find((r) => r.key === "common.save")!;
    render(<TranslationReviewEditor row={row} referenceLabel="English" localeLabel="Français" onSave={vi.fn()} onClear={onClear} />);
    fireEvent.click(screen.getByRole("button", { name: "Mark unreviewed" }));
    await waitFor(() => expect(onClear).toHaveBeenCalledWith({ locale: "fr", key: "common.save" }));
  });

  it("names an erased reviewer, and shows a sent-back verdict's words when read-only", () => {
    const [row] = translationRows({
      locale: "fr",
      strings: { a: "Un" },
      reference: { a: "One" },
      reviews: [review({ key: "a", text: "Un", referenceText: "One", verdict: "NEEDS_CHANGE", suggestion: "Une", note: "féminin", reviewerName: null })],
    });
    render(<TranslationReviewEditor row={row} referenceLabel="English" localeLabel="Français" formatDate={() => "today"} />);
    expect(screen.getByText("Marked as needing a change by a deleted account on today")).toBeInTheDocument();
    expect(screen.getByText("Une")).toBeInTheDocument();
    expect(screen.getByText("féminin")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});

describe("TranslationReview under a write lock (0.33, billing §12.13, §12.36)", () => {
  const PLAN = "Your plan has ended.";
  const DEMO = "Not possible in the demo.";
  const BOTH: WriteLockHold[] = [
    { kind: "demo", reason: DEMO },
    { kind: "billing", reason: PLAN },
  ];

  it("a lapsed plan's lock leaves the verdicts live: a review is an admin route", async () => {
    const onSave = vi.fn();
    render(
      <WriteLockProvider locked kind="billing" reason={PLAN}>
        <TranslationReviewPanel rows={ROWS} localeLabel="Français" referenceLabel="English" onSave={onSave} />
      </WriteLockProvider>,
    );
    const approve = within(rowOf("À attribuer")).getByRole("button", { name: "Approve" });
    expect(approve).not.toHaveAttribute("aria-disabled");
    fireEvent.click(approve);
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toEqual([expect.objectContaining({ key: "budget.rta", verdict: "APPROVED" })]);
  });

  it("a demo's lock beside it holds them, with the demo's reason", () => {
    const onSave = vi.fn();
    render(
      <WriteLockProvider locked holds={BOTH}>
        <TranslationReviewPanel rows={ROWS} localeLabel="Français" referenceLabel="English" onSave={onSave} />
      </WriteLockProvider>,
    );
    const approve = within(rowOf("À attribuer")).getByRole("button", { name: "Approve" });
    expect(approve).toHaveAttribute("aria-disabled", "true");
    expect(approve).toHaveAccessibleDescription(DEMO);
    fireEvent.click(approve);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("the editor's verdicts: live under billing, held under the demo", async () => {
    const row = ROWS.find((r) => r.key === "common.items")!;
    const onSave = vi.fn();
    const onClear = vi.fn();
    const { unmount } = render(
      <WriteLockProvider locked kind="billing" reason={PLAN}>
        <TranslationReviewEditor row={row} referenceLabel="English" localeLabel="Français" onSave={onSave} onClear={onClear} />
      </WriteLockProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    unmount();
    render(
      <WriteLockProvider locked holds={BOTH}>
        <TranslationReviewEditor row={row} referenceLabel="English" localeLabel="Français" onSave={onSave} onClear={onClear} />
      </WriteLockProvider>,
    );
    const approve = screen.getByRole("button", { name: "Approve" });
    expect(approve).toHaveAccessibleDescription(DEMO);
    fireEvent.click(approve);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

describe("ReviewStatusChip", () => {
  it("draws each status in its tone and word, with data-status", () => {
    const { container } = render(
      <>
        <ReviewStatusChip status="missing" />
        <ReviewStatusChip status="needs_change" />
        <ReviewStatusChip status="approved" labels={{ statusApproved: "OK" }} />
      </>,
    );
    expect(container.querySelector('[data-status="missing"]')?.textContent).toBe("Missing");
    expect(container.querySelector('[data-status="needs_change"]')?.textContent).toBe("Needs a change");
    expect(container.querySelector('[data-status="approved"]')?.textContent).toBe("OK");
  });
});

describe("TranslationProgress and TranslationLocaleTabs", () => {
  it("labels the bar with approved of total and lists each part with its count", () => {
    render(<TranslationProgress rows={ROWS} />);
    expect(screen.getByText("1 of 4 approved")).toBeInTheDocument();
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", expect.stringContaining("Approved"));
  });

  it("shows each locale's approved/total, and nothing for one locale", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TranslationLocaleTabs
        locales={[
          { value: "fr", label: "Français", rows: ROWS },
          { value: "it", label: "Italiano", rows: [] },
        ]}
        active="fr"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("tab", { name: /Français/ })).toHaveTextContent("1/4");
    fireEvent.click(screen.getByRole("tab", { name: /Italiano/ }));
    expect(onChange).toHaveBeenCalledWith("it");
    rerender(<TranslationLocaleTabs locales={[{ value: "fr", label: "Français", rows: ROWS }]} active="fr" onChange={onChange} />);
    expect(screen.queryByRole("tab")).toBeNull();
  });
});

describe("TranslationExportButton", () => {
  it("hands over every string sent back, and the file both apps write", async () => {
    const rows = translationRows({
      locale: "fr",
      strings: { "common.save": "Enregistrer" },
      reference: { "common.save": "Save" },
      reviews: [review({ verdict: "NEEDS_CHANGE", suggestion: "Sauvegarder", note: "plus courant" })],
    });
    const onExport = vi.fn();
    render(<TranslationExportButton rows={rows} onExport={onExport} />);
    fireEvent.click(screen.getByRole("button", { name: "Export corrections (1)" }));
    const [corrections, file] = onExport.mock.calls[0] as [unknown[], Blob];
    expect(corrections).toEqual([
      expect.objectContaining({ key: "common.save", suggestion: "Sauvegarder", note: "plus courant", reviewed_at: "2026-10-02T10:00:00Z" }),
    ]);
    expect(file.type).toBe("application/json");
    const json = JSON.parse(await file.text());
    expect(json.locales).toEqual(["fr"]);
    expect(json.corrections).toEqual(corrections);
    expect(typeof json.exported_at).toBe("string");
  });

  it("is disabled while nothing was sent back", () => {
    render(<TranslationExportButton rows={ROWS} onExport={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Export corrections (0)" })).toBeDisabled();
  });
});

describe("on a phone (390px: classes only, jsdom has no layout)", () => {
  const phone = (query: string) => ({
    matches: !query.includes("min-width"),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });

  it("shows cards with the key, breaks what cannot wrap, and reaches the bulk actions through 'Select all shown'", async () => {
    vi.stubGlobal("matchMedia", vi.fn(phone));
    try {
      const { onSave } = setup();
      // The card list, not the table — and no checkboxes on it.
      expect(screen.queryByRole("table")).toBeNull();
      expect(screen.getByText("budget.rta").className).toContain("break-all");
      expect(screen.getByRole("radiogroup", { name: "Status" }).className).toContain("flex-wrap");
      fireEvent.click(screen.getByText("des éléments"));
      expect(screen.getByLabelText("Better wording")).toBeInTheDocument();
      expect(screen.getAllByText("common.items").every((el) => el.className.includes("break-all"))).toBe(true);

      fireEvent.click(screen.getByRole("button", { name: "Select all shown" }));
      fireEvent.click(screen.getByRole("button", { name: "Approve selected" }));
      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
      expect(onSave.mock.calls[0][0]).toHaveLength(3);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
