import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DataTableColumn } from "../../components/data-table";
import { DEFAULT_FEEDBACK_CATEGORY_LABELS, DEFAULT_FEEDBACK_STATUS_LABELS } from "../feedback-labels";
import type { FeedbackRecord } from "../feedback-record";
import { FeedbackRowDetail } from "../feedback-row-detail";
import { DEFAULT_FEEDBACK_PAGE_LABELS, feedbackColumns } from "../feedback-table";

vi.mock("../../components/toast", () => ({
  toast: Object.assign(vi.fn(), { undo: vi.fn(), success: vi.fn(), error: vi.fn() }),
}));

/**
 * FLW-7 (refactor audit 2026-10-30): the page a report was filed on is the reporter's to
 * write — path and query come from their client context. A signed-in user could file a
 * report whose link sends the admin to a route that ACTS on load: keksdose's
 * `/join?token=` accepts an invitation, kastlan's and Kurvenschmiede's
 * `/register?invite=` likewise. Such a page is shown as text with Copy, never a link.
 */

function record(over: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: 412,
    user_id: 7,
    title: "Chart jumps on save",
    body: "",
    category: "BUG",
    status: "OPEN",
    context: { url: "https://app.example.test/join?token=abc" },
    screenshot_url: null,
    attachment_urls: null,
    outcome: null,
    resolved_at: null,
    created_at: "2026-10-04T09:12:00Z",
    updated_at: "2026-10-04T09:12:00Z",
    ...over,
  };
}

const onUpdate = () => Promise.resolve();

describe("the feedback page link: one-shot routes are text, not links (FLW-7)", () => {
  it("the detail shows /join, /register, /verify-email and /reset-password as text with Copy", () => {
    for (const url of [
      "https://app.example.test/join?token=abc",
      "/register?invite=xyz",
      "/verify-email?token=1",
      "/reset-password/abc",
    ]) {
      const { unmount } = render(
        <FeedbackRowDetail row={record({ context: { url } })} canEdit={false} viewerId={99} onUpdate={onUpdate} />,
      );
      expect(screen.queryByRole("link")).toBeNull();
      expect(screen.getByText(url.replace("https://app.example.test", ""))).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Copy URL" })).toBeInTheDocument();
      unmount();
    }
  });

  it("the detail still links any other page, and takes the app's own one-shot routes on top", () => {
    const { unmount } = render(
      <FeedbackRowDetail
        row={record({ context: { url: "/joined-teams" } })}
        canEdit={false}
        viewerId={99}
        onUpdate={onUpdate}
      />,
    );
    // "/join" is the path and everything under it, not every path that starts with it.
    expect(screen.getByRole("link", { name: "/joined-teams" })).toHaveAttribute("href", "/joined-teams");
    unmount();
    render(
      <FeedbackRowDetail
        row={record({ context: { url: "/banks/callback?code=1" } })}
        canEdit={false}
        viewerId={99}
        onUpdate={onUpdate}
        pageLinkExclude={["/banks/callback", /^\/share-target$/]}
      />,
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("/banks/callback?code=1")).toBeInTheDocument();
  });

  it("the table's URL cell shows a one-shot path as text with Copy", () => {
    const columns = feedbackColumns<FeedbackRecord>({
      canEdit: true,
      onStatus: () => {},
      renderDate: (iso) => iso,
      labels: DEFAULT_FEEDBACK_PAGE_LABELS,
      statusLabels: DEFAULT_FEEDBACK_STATUS_LABELS,
      categoryLabels: DEFAULT_FEEDBACK_CATEGORY_LABELS,
      pageLinkExclude: ["/banks/callback"],
    });
    const url = columns.find((c) => c.key === "url") as DataTableColumn<FeedbackRecord>;
    const { unmount } = render(<>{url.cell(record())}</>);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("/join")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy URL" })).toBeInTheDocument();
    unmount();
    const custom = render(<>{url.cell(record({ context: { url: "/banks/callback" } }))}</>);
    expect(custom.queryByRole("link")).toBeNull();
    custom.unmount();
    render(<>{url.cell(record({ context: { url: "/accounts?p=2" } }))}</>);
    expect(screen.getByRole("link", { name: "Open page /accounts" })).toHaveAttribute("href", "/accounts?p=2");
  });
});
