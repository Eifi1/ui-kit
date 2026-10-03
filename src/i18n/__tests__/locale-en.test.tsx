import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DEFAULT_UI_KIT_LABELS } from "../defaults";
import { UiKitProvider, formatFileSize, missingKitLabels } from "../kit-labels";
import { uiKitLabelsEn } from "../locales/en";
import { BulkActionBar } from "../../components/bulk-action-bar";

/** Every leaf, as text: functions are called with `arg` for every parameter. */
function leaves(tree: unknown, arg: number, path = ""): Array<[string, string]> {
  if (typeof tree === "string") return [[path, tree]];
  if (typeof tree === "function") {
    const args = Array.from({ length: tree.length }, () => arg);
    const out = (tree as (...a: unknown[]) => unknown)(...args);
    return typeof out === "string" ? [[path, out]] : [];
  }
  if (tree && typeof tree === "object") {
    return Object.entries(tree).flatMap(([k, v]) => leaves(v, arg, path ? `${path}.${k}` : k));
  }
  return [];
}

const fmt = (locale: string, value: number) => new Intl.NumberFormat(locale).format(value);

describe("uiKitLabelsEn (@eifi1/ui-kit/i18n/en)", () => {
  it("covers every key of the defaults", () => {
    expect(missingKitLabels(uiKitLabelsEn(), DEFAULT_UI_KIT_LABELS)).toEqual([]);
    expect(missingKitLabels(uiKitLabelsEn("en-CH"), DEFAULT_UI_KIT_LABELS)).toEqual([]);
  });

  it("formats counts in en-CH (kastlan: 12’345 rows)", () => {
    const l = uiKitLabelsEn("en-CH");
    const big = fmt("en-CH", 12345);
    expect(big).not.toBe("12345");
    expect(l.dataTable.rowCount(12345)).toBe(big);
    expect(l.dataTable.pageRange(1, 50, 12345)).toBe(`1–50 / ${big}`);
    expect(l.dataTable.filterResults(12345, 12345)).toBe(`${big} of ${big} rows`);
    expect(l.dataTable.columnsCount(3, 12)).toBe("Columns (3/12)");
    expect(l.combobox.selectedCount(12345)).toBe(`${big} selected`);
    expect(l.combobox.resultCount(12345)).toBe(`${big} results`);
    expect(l.combobox.resultCount(1)).toBe("1 result");
    expect(l.multiSelect.selectedCount(12345)).toBe(big);
    expect(l.bulkActionBar.selected(12345)).toBe(`${big} selected`);
    expect(l.filePicker.selected(12345, "a.pdf")).toBe(`${big} files selected`);
    expect(l.filePicker.selected(1, "a.pdf")).toBe("“a.pdf” selected");
    expect(l.filePicker.rejectedCount("a.pdf", 12345)).toBe(
      `“a.pdf” was not added: at most ${big} files`,
    );
    expect(l.file.size(3_400_000)).toBe(formatFileSize(3_400_000, "en-CH"));
  });

  it("formats counts in en-US by default", () => {
    const l = uiKitLabelsEn();
    expect(l.dataTable.rowCount(12345)).toBe("12,345");
    expect(l.dataTable.pageChanged(2, 1234)).toBe("Page 2 of 1,234");
    expect(l.wizard.step(1, 1000)).toBe("Step 1 of 1,000");
    expect(l.lightbox.counter(1, 1234)).toBe("1 / 1,234");
    expect(l.file.size(1_234)).toBe(formatFileSize(1_234, "en-US"));
  });

  it("formats exactly the labels that print a count", () => {
    // Row and line numbers (lineItems.row, measuredGrid.cell, …) are positions and stay
    // raw, as in the other catalogues; everything that prints a count is grouped.
    const english = new Map(leaves(DEFAULT_UI_KIT_LABELS, 12345));
    const changed = leaves(uiKitLabelsEn("en-US"), 12345)
      .filter(([k, v]) => k !== "file.size" && english.get(k) !== v)
      .map(([k]) => k);
    expect(changed.sort()).toEqual([
      "bulkActionBar.selected",
      "calendarHeatmap.truncated",
      "characterCount.count",
      "characterCount.remaining",
      "chipInput.atLimit",
      "columnMapper.previewOf",
      "columnMapper.summary",
      "columnMapper.unreadCount",
      "columnMapper.unreadMore",
      "combobox.minChars",
      "combobox.resultCount",
      "combobox.selectedCount",
      "dataTable.columnsCount",
      "dataTable.filterResults",
      "dataTable.pageChanged",
      "dataTable.pageRange",
      "dataTable.rowCount",
      "feedbackAttachment.attachmentLimit",
      "filePicker.rejectedCount",
      "filePicker.rejectedMany",
      "filePicker.rejectedPick",
      "filePicker.selected",
      "floatingPanel.badge",
      "ibanInput.length",
      "iconPicker.resultCount",
      "imageGrid.item",
      "lightbox.counter",
      "lightbox.position",
      "measuredGrid.points",
      "measuredGrid.problems",
      "multiSelect.selectedCount",
      "passwordStrength.ruleLength",
      "passwordStrength.tooLong",
      "tour.step",
      "translationReview.approveGroup",
      "translationReview.approvedToast",
      "translationReview.clearedToast",
      "translationReview.confirmGroup",
      "translationReview.exportCorrections",
      "translationReview.filterCount",
      "translationReview.groupCount",
      "translationReview.localeProgress",
      "translationReview.placeholdersOnly",
      "translationReview.progress",
      "wizard.step",
    ]);
  });

  it("keeps the default's words: only the digit grouping differs", () => {
    const ungroup = (pairs: Array<[string, string]>) =>
      pairs.filter(([k]) => k !== "file.size").map(([k, v]) => [k, v.replace(/,/g, "")]);
    // 12345 so a grouped figure appears wherever a count is printed; the defaults'
    // own commas (none in a count) are stripped from both sides alike.
    expect(ungroup(leaves(uiKitLabelsEn("en-US"), 12345))).toEqual(
      ungroup(leaves(DEFAULT_UI_KIT_LABELS, 12345)),
    );
    // And the singular branches are untouched.
    expect(ungroup(leaves(uiKitLabelsEn("en-US"), 1))).toEqual(
      ungroup(leaves(DEFAULT_UI_KIT_LABELS, 1)),
    );
  });

  it("reaches components through the provider", () => {
    render(
      <UiKitProvider labels={uiKitLabelsEn("en-CH")}>
        <BulkActionBar count={12345} onClear={() => {}} />
      </UiKitProvider>,
    );
    expect(screen.getAllByText(`${fmt("en-CH", 12345)} selected`).length).toBeGreaterThan(0);
  });
});

describe("DEFAULT_UI_KIT_LABELS is unchanged: counts print raw", () => {
  it("prints 12345, not a grouped figure", () => {
    const d = DEFAULT_UI_KIT_LABELS;
    expect(d.dataTable.rowCount(12345)).toBe("12345");
    expect(d.dataTable.pageRange(1, 50, 12345)).toBe("1–50 / 12345");
    expect(d.dataTable.filterResults(12, 12345)).toBe("12 of 12345 rows");
    expect(d.dataTable.columnsCount(3, 12)).toBe("Columns (3/12)");
    expect(d.combobox.selectedCount(12345)).toBe("12345 selected");
    expect(d.combobox.resultCount(12345)).toBe("12345 results");
    expect(d.multiSelect.selectedCount(12345)).toBe("12345");
    expect(d.bulkActionBar.selected(12345)).toBe("12345 selected");
    expect(d.filePicker.selected(12345, "a.pdf")).toBe("12345 files selected");
    expect(d.wizard.step(1, 12345)).toBe("Step 1 of 12345");
  });
});
