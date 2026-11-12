import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FILL_HEIGHT_CLASS } from "../../shell/fill-height";
import { DESKTOP_WIDTH, stubViewportWidth } from "../../test/viewport";
import { FeedbackInbox, type FeedbackInboxMutation, type FeedbackInboxProps } from "../feedback-inbox-page";
import { FeedbackPageFrame } from "../feedback-page-frame";
import type { FeedbackRecord } from "../feedback-record";
import type { FeedbackDetailPatch } from "../feedback-row-detail";

vi.mock("../../components/toast", () => ({
  toast: Object.assign(vi.fn(), { undo: vi.fn(), success: vi.fn(), error: vi.fn() }),
}));

/**
 * The feedback pages' frame (0.61; Marcel 2026-11-12: Kurvenschmiede's feedback area is to
 * look and work exactly like keksdose's). keksdose's `/feedback`, `/my-feedback` and
 * `/all-feedback` sit in `py-4 md:p-6` under a `compact` header inset on the phone
 * (`mb-4 px-4 md:px-0`), the list edge to edge; Kurvenschmiede wrote its own, a 12px gutter
 * and a smaller title. The frame is keksdose's, and the title has one place: the frame's
 * when it is given one, else the kit page's inside it.
 */

const ROWS: FeedbackRecord[] = [
  {
    id: 1,
    user_id: 7,
    user_email: null,
    title: "Chart jumps on save",
    body: "It jumps.",
    category: "BUG",
    status: "OPEN",
    context: null,
    screenshot_url: null,
    attachment_urls: null,
    outcome: null,
    resolved_at: null,
    created_at: "2026-10-04T09:12:00Z",
    updated_at: "2026-10-04T09:12:00Z",
  },
];

const update: FeedbackInboxMutation<FeedbackDetailPatch> = { mutateAsync: async () => undefined };

function Inbox(props: Partial<FeedbackInboxProps<FeedbackRecord>>) {
  return <FeedbackInbox rows={ROWS} canEdit viewerId={1} update={update} renderDate={(iso) => iso} {...props} />;
}

const tokens = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const frame = () => document.querySelector("[data-feedback-page-frame]");
/** The header's root: PageHeader's outer `div` — above the heading's title block and its row. */
const headerOf = (heading: HTMLElement) => heading.parentElement!.parentElement!.parentElement!;

let restore: (() => void) | undefined;
afterEach(() => {
  restore?.();
  restore = undefined;
  localStorage.clear();
});

describe("FeedbackPageFrame", () => {
  it("is keksdose's frame: py-4 md:p-6 with no side padding on the phone, in the fill-height column", () => {
    render(
      <FeedbackPageFrame title="Feedback discussion" className="extra">
        <p>list</p>
      </FeedbackPageFrame>,
    );
    const root = tokens(frame());
    expect(root).toEqual(expect.arrayContaining([...FILL_HEIGHT_CLASS.split(" "), "py-4", "md:p-6", "extra"]));
    // The list runs edge to edge on the phone: nothing pads the sides below md.
    expect(root.filter((c) => /^(p|px|ps|pe|pl|pr)-/.test(c))).toEqual([]);
  });

  it("draws the title as the compact header, the phone's gutter on the header alone", () => {
    render(
      <FeedbackPageFrame title="Feedback discussion" headerProps={{ "data-tour": "public-header", className: "own" }}>
        <p>list</p>
      </FeedbackPageFrame>,
    );
    const heading = screen.getByRole("heading", { level: 1, name: "Feedback discussion" });
    // `compact`: text-xl at every width, no step up to text-2xl (page-header-layout.ts).
    expect(tokens(heading)).toEqual(expect.arrayContaining(["text-xl", "font-semibold"]));
    expect(tokens(heading)).not.toContain("sm:text-2xl");
    const header = headerOf(heading);
    expect(tokens(header)).toEqual(expect.arrayContaining(["mb-4", "px-4", "md:px-0", "md:shrink-0", "own"]));
    expect(header).toHaveAttribute("data-tour", "public-header");
    expect(header.parentElement).toBe(frame());
    expect(screen.getByText("list")).toBeInTheDocument();
  });

  it("draws no header without a title", () => {
    render(
      <FeedbackPageFrame>
        <p>list</p>
      </FeedbackPageFrame>,
    );
    expect(screen.queryByRole("heading")).toBeNull();
  });
});

describe("FeedbackPageFrame around FeedbackInbox", () => {
  const renderFramed = (ui: ReactNode) => {
    restore = stubViewportWidth(DESKTOP_WIDTH);
    return render(<MemoryRouter initialEntries={["/feedback"]}>{ui}</MemoryRouter>);
  };

  it("the inbox draws its own title in the frame's header: one header, the inbox's words", () => {
    const { unmount } = renderFramed(
      <FeedbackPageFrame headerProps={{ "data-tour": "feedback-header" }}>
        <Inbox />
      </FeedbackPageFrame>,
    );
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings.map((h) => h.textContent)).toEqual(["Feedback inbox"]);
    expect(tokens(headings[0])).toEqual(expect.arrayContaining(["text-xl", "font-semibold"]));
    expect(tokens(headings[0])).not.toContain("sm:text-2xl");
    const header = headerOf(headings[0]);
    expect(tokens(header)).toEqual(expect.arrayContaining(["mb-4", "px-4", "md:px-0", "md:shrink-0"]));
    expect(header).toHaveAttribute("data-tour", "feedback-header");
    expect(frame()).toContainElement(document.querySelector("[data-feedback-inbox]") as HTMLElement);
    unmount();

    renderFramed(
      <FeedbackPageFrame>
        <Inbox mine />
      </FeedbackPageFrame>,
    );
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["My feedback"]);
  });

  it("a frame with a title of its own: the inbox draws none, so there are never two", () => {
    renderFramed(
      <FeedbackPageFrame title="Reports">
        <Inbox />
      </FeedbackPageFrame>,
    );
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["Reports"]);
  });

  it("the inbox's own header still wins inside the frame", () => {
    renderFramed(
      <FeedbackPageFrame>
        <Inbox header={(title) => <h2>{title}!</h2>} />
      </FeedbackPageFrame>,
    );
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Feedback inbox!" })).toBeInTheDocument();
  });

  it("outside a frame the inbox's default header is as before", () => {
    renderFramed(<Inbox />);
    const heading = screen.getByRole("heading", { level: 1, name: "Feedback inbox" });
    expect(tokens(heading)).toContain("sm:text-2xl");
    expect(tokens(headerOf(heading))).not.toContain("px-4");
  });
});
