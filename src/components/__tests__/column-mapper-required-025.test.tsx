import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ColumnMapper, ColumnRoleTable, DEFAULT_COLUMN_MAPPER_LABELS } from "../column-mapper";
import type { ColumnMapping, ColumnRole } from "../../lib/column-mapping";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";

/**
 * 0.25, keksdose on a phone: with a mixed role set (the booking date required, the rest
 * not), the closed role select still showed "Booking date (re…" — the "(required)" mark
 * took the room the role's own name needed. Two parts to the fix:
 *
 * - the mark is short on screen ("Booking date *") and whole for a screen reader (the
 *   option's `aria-label`, "Booking date (required)" — Chromium exposes it as the closed
 *   combobox's value too, checked in its accessibility tree);
 * - no role is cut at all: the select takes its own width (the longest option) as the
 *   column's floor, up to 14rem. jsdom lays nothing out, so that part is held as the
 *   classes that carry it; in Chromium at 390px the English bank roles keep the 9rem
 *   column ("Booking date *" in 79 of 90px), and German "Verwendungszweck" widens it to
 *   fit instead of being cut.
 */

type BankRole = "date" | "amount" | "debit" | "credit" | "payee";
const BANK: ColumnRole<BankRole>[] = [
  { value: "date", label: "Booking date", required: true },
  { value: "amount", label: "Amount", required: "money" },
  { value: "debit", label: "Debit", required: "money" },
  { value: "credit", label: "Credit", required: "money" },
  { value: "payee", label: "Payee" },
];

function Bank({ labels }: { labels?: Parameters<typeof ColumnRoleTable>[0]["labels"] }) {
  const [mapping, setMapping] = useState<ColumnMapping<BankRole>>({ date: 0, payee: 1 });
  return (
    <ColumnRoleTable
      header={["Buchungstag", "Empfänger", "Soll"]}
      rows={[["01.02.2026", "Example Ltd", "12,50"]]}
      roles={BANK}
      mapping={mapping}
      onMappingChange={setMapping}
      labels={labels}
    />
  );
}

const select = (column: string) => screen.getByRole("combobox", { name: `What does column “${column}” hold?` });

describe("ColumnRoleTable — the required mark on a phone (keksdose, 0.25)", () => {
  it("shows the short mark and names the option with the word", () => {
    render(<Bank />);
    const picker = select("Buchungstag");
    const option = within(picker).getByRole("option", { name: "Booking date (required)" });
    expect(option).toHaveTextContent(/^Booking date \*$/);
    expect(option).toHaveAttribute("aria-label", "Booking date (required)");
    // Selected: what the closed select shows is the short form.
    expect(picker).toHaveValue("date");
    expect((picker as HTMLSelectElement).selectedOptions[0].textContent).toBe("Booking date *");
  });

  it("leaves unmarked options, and a group's members, without an aria-label", () => {
    render(<Bank />);
    for (const name of ["Ignore", "Amount", "Debit", "Credit", "Payee"]) {
      const option = within(select("Soll")).getByRole("option", { name });
      expect(option).not.toHaveAttribute("aria-label");
      expect(option.textContent).toBe(name);
    }
  });

  it("marks nothing when every role is required — as in 0.24", () => {
    render(
      <ColumnMapper
        roles={[
          { value: "t", label: "Time", required: true },
          { value: "v", label: "Value", required: true },
        ]}
        defaultText={"t;v\n0;1"}
        onChange={vi.fn()}
      />,
    );
    for (const option of within(select("t")).getAllByRole("option")) {
      expect(option).not.toHaveAttribute("aria-label");
      expect(option.textContent).not.toMatch(/\*|\(required\)/);
    }
  });

  it("takes both forms from the labels: a caller's short form, a provider's spoken one", () => {
    render(
      // Only the spoken form from the Swiss German catalogue, so the select keeps its
      // English name for the query.
      <UiKitProvider labels={{ columnMapper: { requiredRole: UI_KIT_LABELS_DE_CH.columnMapper.requiredRole } }}>
        <Bank labels={{ requiredRoleShort: (role) => `${role} •` }} />
      </UiKitProvider>,
    );
    const option = within(select("Buchungstag")).getByRole("option", { name: "Booking date (erforderlich)" });
    expect(option.textContent).toBe("Booking date •");
  });

  it("falls back to the asterisk for a provider whose labels predate the short form", () => {
    const { requiredRoleShort: _omitted, ...before025 } = DEFAULT_COLUMN_MAPPER_LABELS;
    render(
      <UiKitProvider labels={{ columnMapper: { ...before025, requiredRole: (role) => `${role} (needed)` } }}>
        <Bank />
      </UiKitProvider>,
    );
    const option = within(select("Buchungstag")).getByRole("option", { name: "Booking date (needed)" });
    expect(option.textContent).toBe("Booking date *");
  });

  it("sizes each role select to its longest option, stretched to the column, capped at 14rem", () => {
    render(<Bank />);
    const picker = select("Empfänger");
    // `w-auto` wins over the field's `w-full` (twMerge), so the table cell sees the
    // select's own width; `min-w-full` still fills a wider column; `max-w-56` caps it
    // where the column's name and values stop.
    expect(picker).toHaveClass("w-auto", "min-w-full", "max-w-56");
    expect(picker).not.toHaveClass("w-full");
    // The column keeps its 9rem floor for short roles.
    expect(picker.closest("th")).toHaveClass("min-w-36");
  });
});
