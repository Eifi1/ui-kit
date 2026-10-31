import { render, screen } from "@testing-library/react";
import { matchRoutes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { DataTableColumn } from "../../components/data-table";
import { DEFAULT_FEEDBACK_CATEGORY_LABELS, DEFAULT_FEEDBACK_STATUS_LABELS } from "../feedback-labels";
import { isOneShotPage } from "../feedback-page-link";
import type { FeedbackRecord } from "../feedback-record";
import { FeedbackRowDetail } from "../feedback-row-detail";
import { DEFAULT_FEEDBACK_PAGE_LABELS, feedbackColumns } from "../feedback-table";

vi.mock("../../components/toast", () => ({
  toast: Object.assign(vi.fn(), { undo: vi.fn(), success: vi.fn(), error: vi.fn() }),
}));

/**
 * 0.52 code review, feedback-page-link.ts: the one-shot guard (refactor audit 2026-10-30,
 * FLW-7) compared the reporter's path case-sensitively and still percent-encoded, but React
 * Router matches a route case-insensitively (`caseSensitive` defaults to false) and on the
 * DECODED path (`decodePath` in `matchRoutesImpl`). `/Join?token=XYZ` or `/j%6Fin?token=XYZ`
 * went out as a link, and the admin's click rendered the invitation route all the same.
 *
 * Each form is checked against the router itself first, so the test fails if a router
 * release changes the rule the guard has to follow.
 */

const BYPASSES = [
  "/Join?token=XYZ",
  "/JOIN?token=XYZ",
  "/j%6Fin?token=XYZ",
  "/%4A%4F%49%4E?token=XYZ",
  "/Register?invite=abc",
  "/VERIFY-EMAIL?token=1",
  "/verify%2Demail?token=1",
  "/Reset-Password/abc",
  "/join/?token=XYZ",
];

const ROUTES = [
  { path: "/join" },
  { path: "/register" },
  { path: "/verify-email" },
  { path: "/reset-password/:token" },
];

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

describe("the one-shot guard matches a path the way React Router does", () => {
  it.each(BYPASSES)("%s reaches a one-shot route in the router, and the guard says one-shot", (href) => {
    expect(matchRoutes(ROUTES, href)).not.toBeNull();
    expect(isOneShotPage(href)).toBe(true);
  });

  it("the app's own patterns are read the same way: case-insensitive, decoded", () => {
    expect(isOneShotPage("/Banks/Callback?code=1", ["/banks/callback"])).toBe(true);
    expect(isOneShotPage("/banks/c%61llback?code=1", ["/banks/callback"])).toBe(true);
    expect(isOneShotPage("/Share-Target", [/^\/share-target$/])).toBe(true);
  });

  it("other pages stay links: no decoding turns them into a one-shot route", () => {
    expect(isOneShotPage("/Joined-Teams")).toBe(false);
    // An encoded slash stays inside its segment, as in the router: not /join/abc.
    expect(isOneShotPage("/join%2Fabc")).toBe(false);
    expect(matchRoutes([{ path: "/join" }], "/join%2Fabc")).toBeNull();
    // A malformed escape does not throw; the path is read as it stands.
    expect(isOneShotPage("/accounts/%E0%A4%A?p=2")).toBe(false);
  });

  it("the detail and the table's URL cell show every bypass form as text, not a link", () => {
    const columns = feedbackColumns<FeedbackRecord>({
      canEdit: true,
      onStatus: () => {},
      renderDate: (iso) => iso,
      labels: DEFAULT_FEEDBACK_PAGE_LABELS,
      statusLabels: DEFAULT_FEEDBACK_STATUS_LABELS,
      categoryLabels: DEFAULT_FEEDBACK_CATEGORY_LABELS,
    });
    const cell = columns.find((c) => c.key === "url") as DataTableColumn<FeedbackRecord>;
    for (const href of BYPASSES) {
      const detail = render(
        <FeedbackRowDetail row={record(href)} canEdit={false} viewerId={99} onUpdate={() => Promise.resolve()} />,
      );
      expect(detail.queryByRole("link"), href).toBeNull();
      detail.unmount();
      const table = render(<>{cell.cell(record(href))}</>);
      expect(table.queryByRole("link"), href).toBeNull();
      expect(screen.getByRole("button", { name: "Copy URL" })).toBeInTheDocument();
      table.unmount();
    }
  });
});
