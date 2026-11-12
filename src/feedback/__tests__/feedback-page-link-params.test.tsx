import { render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DataTableColumn } from "../../components/data-table";
import { RedirectIfAuthed } from "../../landing/routing";
import { useFeedbackInbox } from "../feedback-inbox-page";
import { DEFAULT_FEEDBACK_CATEGORY_LABELS, DEFAULT_FEEDBACK_STATUS_LABELS } from "../feedback-labels";
import type { FeedbackRecord } from "../feedback-record";
import { FeedbackRowDetail } from "../feedback-row-detail";
import { DEFAULT_FEEDBACK_PAGE_LABELS, feedbackColumns, type FeedbackColumnsOptions } from "../feedback-table";

vi.mock("../../components/toast", () => ({
  toast: Object.assign(vi.fn(), { undo: vi.fn(), success: vi.fn(), error: vi.fn() }),
}));

/**
 * 0.61 (Kurvenschmiede production feedback #7): a report filed on `/curves/2?profile=5`
 * linked `/curves/2` alone, `?profile=5` beside it as text, so the admin's click opened
 * another view than the one reported. The page link keeps the params the app lists in
 * `pageLinkParams` — the list its crash reporter and `useFeedbackSubmit` already take as
 * `allowParams` — reduced as those two reduce theirs. Everything else stays what 0.52 made
 * it: any other param is text, never followed (`/login?next=%2Fjoin%3Ftoken%3D…`), and a
 * one-shot path is no link at all.
 */

function record(url: string): FeedbackRecord {
  return {
    id: 7,
    user_id: 7,
    title: "The profile is gone after the link",
    body: "",
    category: "BUG",
    status: "OPEN",
    context: { url },
    screenshot_url: null,
    attachment_urls: null,
    outcome: null,
    resolved_at: null,
    created_at: "2026-11-10T09:12:00Z",
    updated_at: "2026-11-10T09:12:00Z",
  };
}

/** Kurvenschmiede's list with the param of its report — and `tab`, which every app keeps. */
const PARAMS = ["profile", "tab"] as const;

const onUpdate = () => Promise.resolve();

function detail(url: string, more: { pageLinkParams?: Iterable<string>; pageLinkExclude?: string[] } = {}) {
  return render(<FeedbackRowDetail row={record(url)} canEdit={false} viewerId={99} onUpdate={onUpdate} {...more} />);
}

function urlCell(options: Partial<FeedbackColumnsOptions> = {}): DataTableColumn<FeedbackRecord> {
  const columns = feedbackColumns<FeedbackRecord>({
    canEdit: true,
    onStatus: () => {},
    renderDate: (iso) => iso,
    labels: DEFAULT_FEEDBACK_PAGE_LABELS,
    statusLabels: DEFAULT_FEEDBACK_STATUS_LABELS,
    categoryLabels: DEFAULT_FEEDBACK_CATEGORY_LABELS,
    ...options,
  });
  return columns.find((c) => c.key === "url") as DataTableColumn<FeedbackRecord>;
}

/** The detail's URL line, link and text beside it. */
const pageLine = () => document.querySelector<HTMLElement>("[data-feedback-page]");

/** Where a signed-in admin lands who follows `href` in an app wired as the kit's docs say
 *  (feedback-page-link-path-only.test.tsx). */
function follow(href: string): string {
  const { container, unmount } = render(
    <MemoryRouter initialEntries={[href]}>
      <Routes>
        <Route element={<RedirectIfAuthed session="user" allowDemo fallback="/home" />}>
          <Route path="/login" element={<p>login</p>} />
          <Route path="/forgot-password" element={<p>forgot</p>} />
        </Route>
        <Route path="/join" element={<p>invitation accepted</p>} />
        <Route path="/register" element={<p>invitation accepted</p>} />
        <Route path="/home" element={<p>home</p>} />
      </Routes>
    </MemoryRouter>,
  );
  const text = container.textContent ?? "";
  unmount();
  return text;
}

afterEach(() => vi.restoreAllMocks());

describe("the page link keeps the params the app lists (pageLinkParams)", () => {
  it("the detail links the path with them, and shows only the rest as text", () => {
    const parsed = vi.spyOn(globalThis, "URL");
    detail("https://app.example.test/curves/2?q=Kurve%20A&profile=5#chart", { pageLinkParams: PARAMS });
    const link = screen.getByRole("link", { name: "/curves/2?profile=5" });
    expect(link).toHaveAttribute("href", "/curves/2?profile=5");
    // The link says what it opens; beside it what it does not carry, reading on from its `?`.
    expect(pageLine()).toHaveTextContent(/^\/curves\/2\?profile=5&q=Kurve\+A#chart$/);
    // Still one reading of the page per open report (0.52 code review, efficiency).
    expect(parsed).toHaveBeenCalledTimes(1);
  });

  it("the table's URL cell links and shows the path with them, from one reading per cell", () => {
    const cell = urlCell({ pageLinkParams: PARAMS });
    const rows = ["/curves/2?profile=5&q=Kurve%20A#chart", "/curves/3?tab=wheels&profile=1"].map(record);
    const parsed = vi.spyOn(globalThis, "URL");
    render(<>{rows.map((row) => cell.cell(row))}</>);
    expect(screen.getByRole("link", { name: "Open page /curves/2?profile=5" })).toHaveAttribute(
      "href",
      "/curves/2?profile=5",
    );
    // In the page's own order.
    expect(screen.getByRole("link", { name: "Open page /curves/3?tab=wheels&profile=1" })).toHaveAttribute(
      "href",
      "/curves/3?tab=wheels&profile=1",
    );
    expect(parsed).toHaveBeenCalledTimes(rows.length);
  });

  it("the inbox hands its list to the URL column and the detail alike", () => {
    const update = { mutateAsync: vi.fn(async () => undefined) };
    const row = record("/curves/2?profile=5&q=Kurve%20A");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={["/feedback"]}>{children}</MemoryRouter>
    );
    const { result } = renderHook(
      () => useFeedbackInbox({ rows: [row], canEdit: true, viewerId: 1, update, pageLinkParams: PARAMS }),
      { wrapper },
    );
    const cell = result.current.table.columns.find((c) => c.key === "url") as DataTableColumn<FeedbackRecord>;
    const table = render(<>{cell.cell(row)}</>);
    expect(screen.getByRole("link", { name: "Open page /curves/2?profile=5" })).toBeInTheDocument();
    table.unmount();
    render(<FeedbackRowDetail {...result.current.detailProps(row)} />);
    expect(screen.getByRole("link", { name: "/curves/2?profile=5" })).toHaveAttribute("href", "/curves/2?profile=5");
  });

  it("never carries a param the app did not list: /login?next= stays a bare /login", () => {
    for (const url of [
      "/login?next=%2Fjoin%3Ftoken%3DXYZ",
      "/login?tab=a&next=%2Fjoin%3Ftoken%3DXYZ",
      "https://app.example.test/forgot-password?next=/register?invite=abc&profile=5",
    ]) {
      const view = detail(url, { pageLinkParams: PARAMS });
      const fromDetail = screen.getByRole("link").getAttribute("href")!;
      view.unmount();
      const cell = render(<>{urlCell({ pageLinkParams: PARAMS }).cell(record(url))}</>);
      const fromTable = screen.getByRole("link").getAttribute("href")!;
      cell.unmount();
      for (const href of [fromDetail, fromTable]) {
        expect(href).not.toMatch(/next|#/);
        expect(follow(href)).not.toMatch(/accepted/);
      }
    }
    // The listed one is kept, the forward target beside it stays text.
    detail("/login?tab=a&next=%2Fjoin%3Ftoken%3DXYZ", { pageLinkParams: PARAMS });
    expect(screen.getByRole("link")).toHaveAttribute("href", "/login?tab=a");
    expect(pageLine()).toHaveTextContent(/^\/login\?tab=a&next=%2Fjoin%3Ftoken%3DXYZ$/);
  });

  it("leaves a one-shot path unlinked, whatever the list holds", () => {
    const listed = { pageLinkParams: ["token", "invite", "code", ...PARAMS], pageLinkExclude: ["/banks/callback"] };
    for (const url of [
      "https://app.example.test/join?token=abc&profile=5",
      "/register?invite=xyz&tab=a",
      "/banks/callback?code=1&tab=a",
    ]) {
      const path = url.replace("https://app.example.test", "");
      const view = detail(url, listed);
      expect(screen.queryByRole("link")).toBeNull();
      // As text, whole, with Copy — as 0.52 shows it.
      expect(pageLine()).toHaveTextContent(path);
      expect(pageLine()).toHaveAttribute("data-feedback-page-unlinked");
      view.unmount();
      const cell = render(<>{urlCell(listed).cell(record(url))}</>);
      expect(screen.queryByRole("link")).toBeNull();
      expect(screen.getByRole("button", { name: "Copy URL" })).toBeInTheDocument();
      cell.unmount();
    }
  });

  it("without the list, links the path alone, as before", () => {
    detail("https://app.example.test/curves/2?profile=5&q=Kurve%20A#chart");
    expect(screen.getByRole("link", { name: "/curves/2" })).toHaveAttribute("href", "/curves/2");
    // The query and hash as the reporter's browser wrote them.
    expect(pageLine()).toHaveTextContent(/^\/curves\/2\?profile=5&q=Kurve%20A#chart$/);
    render(<>{urlCell().cell(record("/curves/2?profile=5"))}</>);
    expect(screen.getByRole("link", { name: "Open page /curves/2" })).toHaveAttribute("href", "/curves/2");
  });

  it("with a list the page holds none of, shows its query as the reporter's browser wrote it", () => {
    detail("/curves/2?q=Kurve%20A#chart", { pageLinkParams: PARAMS });
    expect(screen.getByRole("link", { name: "/curves/2" })).toHaveAttribute("href", "/curves/2");
    expect(pageLine()).toHaveTextContent(/^\/curves\/2\?q=Kurve%20A#chart$/);
  });
});
