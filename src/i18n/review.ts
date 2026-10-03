import type { UiKitLabels } from "./kit-labels";

/**
 * The kit's words as a flat `key → text` list, for an app's translation review.
 *
 * keksdose reviews its own locale bundles on its /translations page — one verdict per
 * locale and key, stored with the text the reviewer saw, so a later change re-opens it.
 * The kit's words appear on the same screens but live in TypeScript, not in the app's
 * bundles, and 94 of them are functions (`(count) => "3 results"`), which a bundle
 * flattener skips. This turns a label tree into rows that page can join on.
 *
 * - A string label is one row under its dot path: `common.close`. An array of words
 *   (weekday names) is one row per entry: `miniCalendar.weekdays.0`.
 * - A function label is called with fixed samples. Text arguments are i18next-style
 *   placeholders (`{{name}}`), so a translation that drops one is caught by the same
 *   placeholder check the app runs on its own strings. Counts are real numbers, twice
 *   where the wording may depend on them — 1 and 3 — so a reviewer sees singular and
 *   plural. The key names the sample: `combobox.resultCount(1)`,
 *   `shareCard.removeConfirm(name)`, `serverWake.waking()`.
 *
 * Keys depend only on the samples, never on the locale, so the rows of `de-CH` and of the
 * English reference line up key by key. Pass exactly the tree the app hands
 * `UiKitProvider` — its overrides included — and review what users see:
 *
 *     kitLabelStrings(UI_KIT_LABELS_DE_CH)          // the rows for de-CH
 *     kitLabelStrings(DEFAULT_UI_KIT_LABELS)        // the English reference
 *
 * A label that throws on its sample becomes a row starting with "⚠", so one broken
 * override shows up on the page instead of taking the page down.
 */
export function kitLabelStrings(labels: UiKitLabels): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (node: unknown, path: string) => {
    if (typeof node === "string") {
      out[path] = node;
    } else if (typeof node === "function") {
      for (const args of KIT_LABEL_SAMPLES[path] ?? [[]]) {
        out[`${path}(${args.map(sampleName).filter((a) => a !== "").join(", ")})`] = render(
          node as (...args: unknown[]) => unknown,
          args,
        );
      }
    } else if (node !== null && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) walk(value, path ? `${path}.${key}` : key);
    }
  };
  walk(labels, "");
  return out;
}

function render(label: (...args: unknown[]) => unknown, args: readonly unknown[]): string {
  try {
    return String(label(...args));
  } catch (error) {
    return `⚠ ${error instanceof Error ? error.message : String(error)}`;
  }
}

/** How a sample argument is written in the key: a placeholder by its name, a number as
 *  itself, an empty string as `""`, a missing optional argument not at all. */
function sampleName(arg: unknown): string {
  if (arg === undefined) return "";
  if (typeof arg === "string") return /^\{\{(\w+)\}\}$/.exec(arg)?.[1] ?? JSON.stringify(arg);
  return String(arg);
}

const one = [[1], [3]] as const;

/**
 * The sample arguments of every function label in {@link UiKitLabels}, by dot path.
 * `src/i18n/__tests__/review.test.ts` fails when a function label has no entry here, so
 * a new one cannot ship un-reviewable.
 */
export const KIT_LABEL_SAMPLES: Readonly<Record<string, readonly (readonly unknown[])[]>> = {
  "common.fieldValue": [["{{field}}", "{{value}}"]],
  "dataTable.filterResults": [
    [1, 1],
    [3, 12],
  ],
  "dataTable.sortedAscending": [["{{column}}"]],
  "dataTable.sortedDescending": [["{{column}}"]],
  "dataTable.sortCleared": [["{{column}}"]],
  "dataTable.pageChanged": [[2, 5]],
  "dataTable.pageRange": [[1, 25, 1240]],
  "dataTable.rowCount": [[1], [1240]],
  "dataTable.columnsCount": [[3, 8]],
  "miniCalendar.day": [["{{date}}"]],
  "miniCalendar.startSelected": [["{{date}}"]],
  "miniCalendar.rangeSelected": [["{{from}}", "{{to}}"]],
  "calendarHeatmap.day": [["{{date}}", "{{value}}"]],
  "calendarHeatmap.truncated": one,
  "monthPicker.month": [["{{monthYear}}"]],
  "combobox.create": [["{{query}}"]],
  "combobox.selectedCount": one,
  "combobox.resultCount": one,
  "combobox.minChars": one,
  "multiSelect.selectedCount": one,
  "chipInput.added": [["{{value}}"]],
  "chipInput.removed": [["{{value}}"]],
  "chipInput.atLimit": one,
  "chipInput.duplicate": [["{{value}}"]],
  "tabs.remove": [["{{tab}}"]],
  "appShell.toggleGroup": [["{{group}}"]],
  "topBar.role": [["{{role}}"]],
  "file.size": [[2_500_000]],
  "wizard.step": [[2, 4]],
  "tour.step": [[2, 4]],
  "globalSearch.shortcut": [["{{keys}}"]],
  "pieChart.slice": [["{{label}}", "{{value}}", "{{percent}}"]],
  "sparkline.rising": [["{{first}}", "{{last}}"]],
  "sparkline.falling": [["{{first}}", "{{last}}"]],
  "sparkline.flat": [["{{value}}"]],
  "sparkline.single": [["{{value}}"]],
  "sparkline.named": [["{{name}}", "{{summary}}"]],
  "statTile.increase": [["{{amount}}"]],
  "statTile.decrease": [["{{amount}}"]],
  "statTile.better": [["{{change}}"]],
  "statTile.worse": [["{{change}}"]],
  "signaturePad.viewTyped": [["{{name}}"]],
  "passwordStrength.announcement": [["{{level}}"]],
  "passwordStrength.ruleLength": [[12]],
  "passwordStrength.optional": [["{{rule}}"]],
  "passwordStrength.tooLong": [[72]],
  "dangerConfirm.phrase": [["{{phrase}}"]],
  "dangerConfirm.needsPhrase": [["{{phrase}}"]],
  "iconPicker.resultCount": one,
  "filePicker.rejectedType": [["{{name}}"]],
  "filePicker.rejectedTypeOnly": [["{{accept}}", "{{name}}"]],
  "filePicker.rejectedSize": [["{{name}}", "{{maxSize}}"]],
  "filePicker.rejectedCount": [
    ["{{name}}", 1],
    ["{{name}}", 3],
  ],
  "filePicker.rejectedInvalid": [["{{name}}"]],
  "filePicker.rejectedMany": one,
  "filePicker.rejectedPick": one,
  "filePicker.selected": [
    [1, "{{firstName}}"],
    [3, "{{firstName}}"],
  ],
  "filePicker.remove": [["{{name}}"]],
  "filePicker.removed": [["{{name}}"]],
  "filePicker.hint": [["{{accept}}"], [""]],
  "measuredGrid.removeRow": [[3]],
  "measuredGrid.cell": [["{{column}}", 3]],
  "measuredGrid.lineError": [[3]],
  "measuredGrid.points": one,
  "measuredGrid.problems": one,
  "feedbackAttachment.attachmentRemoveFile": [["{{name}}"]],
  "feedbackAttachment.attachmentLimit": one,
  "feedbackAttachment.attachmentUploadFailed": [["{{name}}"]],
  "feedbackComposer.sendHint": [["{{modifier}}"]],
  "accountSettings.passkeys.renameItem": [["{{name}}"]],
  "accountSettings.passkeys.renameField": [["{{name}}"]],
  "accountSettings.passkeys.deleteItem": [["{{name}}"]],
  "accountSettings.passkeys.deleteConfirm": [["{{name}}"]],
  "accountSettings.passkeys.created": [["{{date}}"]],
  "accountSettings.passkeys.lastUsed": [["{{date}}"]],
  "confirmDialog.typed": [["{{text}}"]],
  "floatingPanel.badge": one,
  "bulkActionBar.selected": one,
  "form.submitShortcut": [[true], [false]],
  "lineItems.remove": [[3]],
  "lineItems.confirmRemove": [[3]],
  "lineItems.row": [[3]],
  "lineItems.cell": [["{{column}}", 3]],
  "progressBar.overLimit": [["{{amount}}"]],
  "signedAmount.positive": [["{{amount}}"]],
  "signedAmount.negative": [["{{amount}}"]],
  "errorBoundary.reportedAs": [["{{reference}}"]],
  "authedImage.failedImage": [["{{alt}}"]],
  "imageGrid.item": [[2, 5]],
  "imageGrid.actions": [["{{name}}"]],
  "lightbox.counter": [[2, 5]],
  "lightbox.position": [[2, 5]],
  "shareCard.roleOf": [["{{name}}"]],
  "shareCard.teamHint": [["{{name}}"]],
  "shareCard.removeConfirm": [["{{name}}"]],
  "shareCard.revokePendingConfirm": [["{{name}}"]],
  "serverWake.waking": [["{{appName}}"], [undefined]],
  "translationReview.filterCount": [
    ["{{status}}", 1],
    ["{{status}}", 3],
  ],
  "translationReview.placeholdersOnly": one,
  "translationReview.progress": [
    [1, 1],
    [3, 12],
  ],
  "translationReview.localeProgress": [[3, 12]],
  "translationReview.placeholderMismatch": [["{{reference}}", "{{text}}"]],
  "translationReview.lastApproved": [["{{name}}", "{{date}}"]],
  "translationReview.lastFlagged": [["{{name}}", "{{date}}"]],
  "translationReview.scope": [["{{areas}}"]],
  "translationReview.exportCorrections": [[0], [1], [3]],
  "translationReview.approvedToast": one,
  "translationReview.clearedToast": one,
  "translationReview.groupCount": [
    [1, 12],
    [3, 12],
  ],
  "translationReview.approveGroup": one,
  "translationReview.confirmGroup": [
    [1, "{{group}}"],
    [3, "{{group}}"],
  ],
  "characterCount.count": [[12, 80]],
  "characterCount.remaining": one,
  "inlineEdit.edit": [["{{label}}"]],
  "ibanInput.country": [["{{code}}"]],
  "ibanInput.length": [[20, 21]],
  "signChip.direction": [["{{current}}", "{{next}}"]],
  "columnMapper.readError": [["{{name}}"]],
  "columnMapper.summary": [
    [1, 1],
    [3, 12],
  ],
  "columnMapper.unreadCount": one,
  "columnMapper.unreadLine": [[3]],
  "columnMapper.unreadMore": one,
  "columnMapper.columnN": [[3]],
  "columnMapper.roleOf": [["{{column}}"]],
  "columnMapper.requiredRole": [["{{role}}"]],
  "columnMapper.requiredRoleShort": [["{{role}}"]],
  "columnMapper.previewOf": [
    [1, 12],
    [10, 250],
  ],
  "columnMapper.oneOf": [["{{roles}}"]],
  "columnMapper.missing": [["{{roles}}"]],
};
