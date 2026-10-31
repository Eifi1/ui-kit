import { render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { UiKitProvider, type KitDateFormatter } from "../../i18n/kit-labels";
import { formatDate } from "../../lib/format";
import type { FeedbackReply } from "../feedback-public-types";
import type { FeedbackRecord } from "../feedback-record";
import { FeedbackReplyTimeline } from "../feedback-replies";
import { FeedbackRowDetail } from "../feedback-row-detail";
import { useFeedbackRenderDate } from "../feedback-table";

vi.mock("../../components/toast", () => ({
  toast: Object.assign(vi.fn(), { undo: vi.fn(), success: vi.fn(), error: vi.fn() }),
}));

/**
 * DUP-2 (refactor audit 2026-10-30): every date the feedback parts print goes down the
 * kit's one day ladder — the part's own prop, else `<UiKitProvider formatDate>` (the app's
 * date-format preference), else the kit's date in the provider's locale AND time zone.
 * The replies' times and the detail's "Resolved" date skipped the provider until 0.52,
 * which is why keksdose passed its preference into them by hand. The suite runs in
 * Europe/Berlin (vitest.config.ts).
 */

const pref: KitDateFormatter = (iso, { weekday }) => `pref:${iso}${weekday ? ":wd" : ""}`;

function wrap(props: { formatDate?: KitDateFormatter; locale?: string; timeZone?: string }) {
  return ({ children }: { children: ReactNode }) => <UiKitProvider {...props}>{children}</UiKitProvider>;
}

const reply: FeedbackReply = {
  id: 1,
  author_name: "Marcel",
  body: "Looking into it.",
  status_to: null,
  created_at: "2026-10-04T09:00:00Z",
};

function record(over: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: 412,
    user_id: 7,
    title: "Chart jumps on save",
    body: "",
    category: "BUG",
    status: "DONE",
    context: null,
    screenshot_url: null,
    attachment_urls: null,
    outcome: "Fixed.",
    resolved_at: "2026-10-05T23:30:00Z",
    created_at: "2026-10-04T09:12:00Z",
    updated_at: "2026-10-04T09:12:00Z",
    ...over,
  };
}

describe("the feedback parts' dates follow the provider (DUP-2)", () => {
  it("the reply timeline: the provider's day with the language's clock", () => {
    render(<FeedbackReplyTimeline replies={[reply]} />, { wrapper: wrap({ formatDate: pref, locale: "en" }) });
    // 09:00Z is 11:00 in Berlin; English is the 24-hour British clock.
    expect(screen.getByText("pref:2026-10-04, 11:00")).toBeInTheDocument();
  });

  it("the reply timeline without a provider formatter: the kit's date and time in its time zone", () => {
    render(<FeedbackReplyTimeline replies={[reply]} />, {
      wrapper: wrap({ locale: "en-GB", timeZone: "America/New_York" }),
    });
    const expected = formatDate(
      reply.created_at,
      { dateStyle: "medium", timeStyle: "short" },
      { locale: "en-GB", timeZone: "America/New_York" },
    );
    expect(expected).toContain("05:00");
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("the detail's Resolved date: the provider's day, in a sentence (no weekday), in its time zone", () => {
    const { unmount } = render(
      <FeedbackRowDetail row={record()} canEdit={false} onUpdate={() => Promise.resolve()} />,
      {
        wrapper: wrap({ formatDate: pref }),
      },
    );
    // 23:30Z on the 5th is the 6th in Berlin.
    expect(screen.getByText("Resolved: pref:2026-10-06")).toBeInTheDocument();
    unmount();
    render(<FeedbackRowDetail row={record()} canEdit={false} onUpdate={() => Promise.resolve()} />, {
      wrapper: wrap({ formatDate: pref, timeZone: "America/New_York" }),
    });
    expect(screen.getByText("Resolved: pref:2026-10-05")).toBeInTheDocument();
  });

  it("a part's own prop still wins", () => {
    render(
      <FeedbackRowDetail
        row={record()}
        canEdit={false}
        onUpdate={() => Promise.resolve()}
        renderDate={(iso) => `own:${iso.slice(0, 10)}`}
      />,
      { wrapper: wrap({ formatDate: pref }) },
    );
    expect(screen.getByText("Resolved: own:2026-10-05")).toBeInTheDocument();
  });

  it("useFeedbackRenderDate: the column's date with the weekday, in the provider's time zone", () => {
    const withPref = renderHook(() => useFeedbackRenderDate(), {
      wrapper: wrap({ formatDate: pref, timeZone: "America/New_York" }),
    });
    expect(withPref.result.current("2026-10-05T03:00:00Z")).toBe("pref:2026-10-04:wd");
    const kit = renderHook(() => useFeedbackRenderDate(), {
      wrapper: wrap({ locale: "en-GB", timeZone: "America/New_York" }),
    });
    expect(kit.result.current("2026-10-05T03:00:00Z")).toBe("Sun, 4 Oct 2026");
    // Nothing to print, and a value that does not parse, as before.
    expect(kit.result.current("")).toBe("—");
    expect(kit.result.current("soon")).toBe("soon");
  });
});
