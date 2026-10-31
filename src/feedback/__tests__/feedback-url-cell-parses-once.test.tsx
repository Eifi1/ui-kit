import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DataTableColumn } from "../../components/data-table";
import { DEFAULT_FEEDBACK_CATEGORY_LABELS, DEFAULT_FEEDBACK_STATUS_LABELS } from "../feedback-labels";
import type { FeedbackRecord } from "../feedback-record";
import { FeedbackRowDetail } from "../feedback-row-detail";
import { DEFAULT_FEEDBACK_PAGE_LABELS, feedbackColumns } from "../feedback-table";

vi.mock("../../components/toast", () => ({
  toast: Object.assign(vi.fn(), { undo: vi.fn(), success: vi.fn(), error: vi.fn() }),
}));

/**
 * 0.52 code review, feedback-table.tsx (efficiency): the URL cell asked
 * `feedbackPageHref`, `feedbackPagePath` and `feedbackPageUrl` in turn, each of which
 * parsed `context.url` into a `URL` of its own — three per cell, 810 per render of a
 * 270-row inbox (keksdose's register size, dev#632), for one column. The page is parsed
 * once per cell now, and once per open report.
 */

function record(url: string): FeedbackRecord {
  return {
    id: 412,
    user_id: 7,
    title: "Chart jumps on save",
    body: "",
    category: "BUG",
    status: "OPEN",
    context: { url },
    screenshot_url: null,
    attachment_urls: null,
    outcome: null,
    resolved_at: null,
    created_at: "2026-10-04T09:12:00Z",
    updated_at: "2026-10-04T09:12:00Z",
  };
}

afterEach(() => vi.restoreAllMocks());

describe("the page a report was filed on is parsed once", () => {
  it("per URL cell, linked or one-shot", () => {
    const columns = feedbackColumns<FeedbackRecord>({
      canEdit: true,
      onStatus: () => {},
      renderDate: (iso) => iso,
      labels: DEFAULT_FEEDBACK_PAGE_LABELS,
      statusLabels: DEFAULT_FEEDBACK_STATUS_LABELS,
      categoryLabels: DEFAULT_FEEDBACK_CATEGORY_LABELS,
    });
    const cell = columns.find((c) => c.key === "url") as DataTableColumn<FeedbackRecord>;
    const rows = ["https://app.example.test/accounts?p=2#top", "/settings", "/join?token=abc"].map(record);
    const parsed = vi.spyOn(globalThis, "URL");
    render(<>{rows.map((row) => cell.cell(row))}</>);
    expect(parsed).toHaveBeenCalledTimes(rows.length);
  });

  it("per open report", () => {
    const parsed = vi.spyOn(globalThis, "URL");
    render(
      <FeedbackRowDetail
        row={record("https://app.example.test/accounts?p=2#top")}
        canEdit={false}
        viewerId={99}
        onUpdate={() => Promise.resolve()}
      />,
    );
    expect(parsed).toHaveBeenCalledTimes(1);
  });
});
