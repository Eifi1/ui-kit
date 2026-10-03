import { DEFAULT_UI_KIT_LABELS } from "../defaults";
import { formatFileSize } from "../kit-labels";
import type { UiKitLabels } from "../kit-labels";

/**
 * The kit's English words with every count and file size formatted for
 * `numberLocale` — `uiKitLabelsEn("en-CH")` reads "12’345 rows", where the defaults
 * print "12345". For `<UiKitProvider labels={uiKitLabelsEn("en-CH")}>`.
 *
 * A factory and not a constant on purpose: {@link DEFAULT_UI_KIT_LABELS} prints counts
 * raw and has since 0.1, so an app that passes nothing must keep seeing exactly that.
 * Formatting is something an app asks for, by calling this.
 *
 * Derived rather than copied: every word is the default's own, spread in, and only the
 * labels that print a number are restated — with the same wording and the same
 * singular/plural split — so a key added to the defaults is here the moment it lands.
 * Row and line numbers (`lineItems.row`, `measuredGrid.cell`) are positions, not
 * counts, and stay as the defaults print them, as in the other catalogues.
 */
export function uiKitLabelsEn(numberLocale = "en-US"): UiKitLabels {
  const num = new Intl.NumberFormat(numberLocale);
  const n = (value: number) => num.format(value);
  const d = DEFAULT_UI_KIT_LABELS;

  return {
    ...d,
    feedbackAttachment: {
      ...d.feedbackAttachment,
      attachmentLimit: (max) =>
        `Up to ${n(max)} ${max === 1 ? "attachment" : "attachments"} — remove one to add another.`,
    },
    measuredGrid: {
      ...d.measuredGrid,
      points: (count) => (count === 1 ? "1 point" : `${n(count)} points`),
      problems: (count) =>
        count === 1
          ? "1 cell is not a number"
          : `${n(count)} cells are not numbers`,
    },
    dataTable: {
      ...d.dataTable,
      filterResults: (shown, total) => `${n(shown)} of ${n(total)} rows`,
      pageChanged: (page, totalPages) => `Page ${n(page)} of ${n(totalPages)}`,
      pageRange: (from, to, total) => `${n(from)}–${n(to)} / ${n(total)}`,
      rowCount: (total) => n(total),
      columnsCount: (visible, total) => `Columns (${n(visible)}/${n(total)})`,
    },
    calendarHeatmap: {
      ...d.calendarHeatmap,
      truncated: (count) =>
        `Showing the most recent days; ${n(count)} earlier ${count === 1 ? "day is" : "days are"} not shown.`,
    },
    combobox: {
      ...d.combobox,
      selectedCount: (count) => `${n(count)} selected`,
      resultCount: (count) =>
        count === 1 ? "1 result" : `${n(count)} results`,
      minChars: (count) =>
        count === 1
          ? "Type at least 1 character"
          : `Type at least ${n(count)} characters`,
    },
    multiSelect: {
      ...d.multiSelect,
      selectedCount: (count) => n(count),
    },
    chipInput: {
      ...d.chipInput,
      atLimit: (max) => `Limit of ${n(max)} reached`,
    },
    iconPicker: {
      ...d.iconPicker,
      resultCount: (count) => (count === 1 ? "1 icon" : `${n(count)} icons`),
    },
    bulkActionBar: {
      ...d.bulkActionBar,
      selected: (count) => `${n(count)} selected`,
    },
    file: {
      // The kit's own `Intl` unit formatting, pinned to this locale ("3.4 MB").
      size: (bytes) => formatFileSize(bytes, numberLocale),
    },
    filePicker: {
      ...d.filePicker,
      rejectedCount: (name, maxFiles) =>
        `“${name}” was not added: at most ${n(maxFiles)} ${maxFiles === 1 ? "file" : "files"}`,
      rejectedMany: (count) => `${n(count)} files were not added`,
      rejectedPick: (count) =>
        count === 1
          ? "The file was not added"
          : `None of the ${n(count)} files were added`,
      selected: (count, firstName) =>
        count === 1 ? `“${firstName}” selected` : `${n(count)} files selected`,
    },
    wizard: {
      ...d.wizard,
      step: (current, total) => `Step ${n(current)} of ${n(total)}`,
    },
    tour: {
      ...d.tour,
      step: (current, total) => `${n(current)} / ${n(total)}`,
    },
    passwordStrength: {
      ...d.passwordStrength,
      ruleLength: (minLength) => `At least ${n(minLength)} characters`,
      tooLong: (maxBytes) =>
        `At most ${n(maxBytes)} characters (accents and emoji count for more than one).`,
    },
    floatingPanel: {
      ...d.floatingPanel,
      badge: (count) => `${n(count)} new`,
    },
    imageGrid: {
      ...d.imageGrid,
      item: (index, count) => `Image ${n(index)} of ${n(count)}`,
    },
    lightbox: {
      ...d.lightbox,
      counter: (index, count) => `${n(index)} / ${n(count)}`,
      position: (index, count) => `Image ${n(index)} of ${n(count)}`,
    },
    translationReview: {
      ...d.translationReview,
      filterCount: (label, count) => `${label} · ${n(count)}`,
      placeholdersOnly: (count) => `Only placeholder problems (${n(count)})`,
      progress: (approved, total) => `${n(approved)} of ${n(total)} approved`,
      localeProgress: (approved, total) => `${n(approved)}/${n(total)}`,
      exportCorrections: (count) => `Export corrections (${n(count)})`,
      approvedToast: (count) => (count === 1 ? "String approved" : `${n(count)} strings approved`),
      clearedToast: (count) => (count === 1 ? "String marked unreviewed" : `${n(count)} strings marked unreviewed`),
      groupCount: (unreviewed, total) => `${n(unreviewed)} unreviewed / ${n(total)}`,
      approveGroup: (count) => `Approve unreviewed (${n(count)})`,
      confirmGroup: (count, group) =>
        count === 1
          ? `Approve the unreviewed string in ${group}?`
          : `Approve all ${n(count)} unreviewed strings in ${group}, including those not on screen?`,
    },
    characterCount: {
      ...d.characterCount,
      count: (used, max) => `${n(used)} of ${n(max)} characters`,
      remaining: (left) =>
        left === 1 ? "1 character left" : `${n(left)} characters left`,
    },
    ibanInput: {
      ...d.ibanInput,
      length: (actual, expected) =>
        `An IBAN from this country has ${n(expected)} characters — this one has ${n(actual)}.`,
    },
    columnMapper: {
      ...d.columnMapper,
      summary: (columns, rows) =>
        `${n(columns)} ${columns === 1 ? "column" : "columns"}, ${n(rows)} ${rows === 1 ? "row" : "rows"}`,
      unreadCount: (count) =>
        count === 1
          ? "1 line could not be read"
          : `${n(count)} lines could not be read`,
      unreadMore: (count) => `…and ${n(count)} more`,
      previewOf: (shown, total) =>
        shown === 1
          ? `The first of ${n(total)} rows`
          : `The first ${n(shown)} of ${n(total)} rows`,
    },
  };
}
