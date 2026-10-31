import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { DataTableColumn } from "../../components/data-table";
import { RedirectIfAuthed } from "../../landing/routing";
import { DEFAULT_FEEDBACK_CATEGORY_LABELS, DEFAULT_FEEDBACK_STATUS_LABELS } from "../feedback-labels";
import type { FeedbackRecord } from "../feedback-record";
import { FeedbackRowDetail } from "../feedback-row-detail";
import { DEFAULT_FEEDBACK_PAGE_LABELS, feedbackColumns } from "../feedback-table";

vi.mock("../../components/toast", () => ({
  toast: Object.assign(vi.fn(), { undo: vi.fn(), success: vi.fn(), error: vi.fn() }),
}));

/**
 * 0.52 code review, feedback-page-link.ts: the one-shot guard (refactor audit 2026-10-30,
 * FLW-7) read the PATH of the reporter's page, but the link carried its query too — and a
 * public page forwards a signed-in visitor to its `?next=`. A report filed on
 * `/login?next=%2Fjoin%3Ftoken%3DXYZ` passed as a link; the admin's click reached
 * `RedirectIfAuthed`, which navigated to `/join?token=XYZ` and accepted the invitation.
 * A list of forwarders would miss the next one an app adds (`?returnTo=`, a share target),
 * so the link now goes to the PATH alone: the query and hash, where the tokens and the
 * forward targets travel, are shown as text and copied with "Copy URL", never followed.
 */

const FORWARDS = [
  "/login?next=%2Fjoin%3Ftoken%3DXYZ",
  "https://app.example.test/forgot-password?next=/join?token=XYZ",
  "/demo?next=%2Fregister%3Finvite%3Dabc",
  "/welcome?next=%2Fverify-email%3Ftoken%3D1#top",
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

/** Where a signed-in admin lands who follows `href` in an app wired as the kit's docs say. */
function follow(href: string): string {
  const { container, unmount } = render(
    <MemoryRouter initialEntries={[href]}>
      <Routes>
        <Route element={<RedirectIfAuthed session="user" allowDemo fallback="/home" />}>
          <Route path="/login" element={<p>login</p>} />
          <Route path="/forgot-password" element={<p>forgot</p>} />
          <Route path="/demo" element={<p>demo</p>} />
          <Route path="/welcome" element={<p>welcome</p>} />
        </Route>
        <Route path="/join" element={<p>invitation accepted</p>} />
        <Route path="/register" element={<p>invitation accepted</p>} />
        <Route path="/verify-email" element={<p>address verified</p>} />
        <Route path="/home" element={<p>home</p>} />
      </Routes>
    </MemoryRouter>,
  );
  const text = container.textContent ?? "";
  unmount();
  return text;
}

const columns = feedbackColumns<FeedbackRecord>({
  canEdit: true,
  onStatus: () => {},
  renderDate: (iso) => iso,
  labels: DEFAULT_FEEDBACK_PAGE_LABELS,
  statusLabels: DEFAULT_FEEDBACK_STATUS_LABELS,
  categoryLabels: DEFAULT_FEEDBACK_CATEGORY_LABELS,
});
const urlColumn = columns.find((c) => c.key === "url") as DataTableColumn<FeedbackRecord>;

describe("the feedback page link goes to the path alone (a forwarder's ?next= is never followed)", () => {
  it.each(FORWARDS)("the detail's link for %s lands on no one-shot route", (url) => {
    const { unmount } = render(
      <FeedbackRowDetail row={record(url)} canEdit={false} viewerId={99} onUpdate={() => Promise.resolve()} />,
    );
    const href = screen.getByRole("link").getAttribute("href")!;
    unmount();
    expect(follow(href)).not.toMatch(/accepted|verified/);
    expect(href).not.toMatch(/[?#]/);
  });

  it.each(FORWARDS)("the table's link for %s lands on no one-shot route", (url) => {
    const { unmount } = render(<>{urlColumn.cell(record(url))}</>);
    const href = screen.getByRole("link").getAttribute("href")!;
    unmount();
    expect(follow(href)).not.toMatch(/accepted|verified/);
    expect(href).not.toMatch(/[?#]/);
  });

  it("the detail still shows the query and hash as text, and copies the full URL", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const url = "https://app.example.test/accounts?p=2#top";
    render(<FeedbackRowDetail row={record(url)} canEdit={false} viewerId={99} onUpdate={() => Promise.resolve()} />);
    const link = screen.getByRole("link", { name: "/accounts" });
    expect(link).toHaveAttribute("href", "/accounts");
    expect(link.closest("[data-feedback-page]")).toHaveTextContent("/accounts?p=2#top");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy URL" }));
    });
    expect(writeText).toHaveBeenCalledWith(url);
  });
});
