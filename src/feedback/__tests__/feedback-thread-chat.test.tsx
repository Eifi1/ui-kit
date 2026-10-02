import { fireEvent, render, screen, within } from "@testing-library/react";
import { FeedbackComposer, FeedbackThread } from "../feedback-thread";
import type { FeedbackThreadItem } from "../feedback-thread";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";

// keksdose G4/G5: the support chat on FeedbackThread + FeedbackComposer. Times are
// local (vitest pins TZ=Europe/Berlin), so the calendar days below are Berlin's.
const NOW = new Date(2026, 8, 26, 12, 0);
const at = (day: number, hour: number, minute = 0) => new Date(2026, 8, day, hour, minute);

const CHAT: FeedbackThreadItem[] = [
  { id: 1, author: "Ada", createdAt: at(20, 9, 5), body: "Export is broken." },
  { id: 2, author: "Marcel", staff: true, createdAt: at(25, 23, 50), body: "Looking into it." },
  { kind: "event", id: "e1", createdAt: at(25, 23, 55), body: "Marked as resolved" },
  { id: 3, own: true, createdAt: at(26, 0, 10), body: "Still broken for me." },
  { kind: "event", id: "e2", createdAt: at(26, 0, 11), body: "Reopened" },
];

describe("FeedbackThread — chat rows (keksdose G4)", () => {
  it("draws an event as a centred list item with its time, not an authored article", () => {
    render(<FeedbackThread messages={CHAT} now={NOW} locale="en" />);
    const list = screen.getByRole("list", { name: "Comments" });
    expect(within(list).getAllByRole("article")).toHaveLength(3);
    const event = within(list).getByText("Reopened").closest("li")!;
    expect(event).toHaveAttribute("data-event");
    expect(event.querySelector("article")).toBeNull();
    expect(event.querySelector("time")).toHaveAttribute("dateTime", at(26, 0, 11).toISOString());
    // App wording, not somebody's words about their data.
    expect(event.querySelector("[data-private]")).toBeNull();
    // No "You" / author line on an event.
    expect(event).not.toHaveTextContent("You");
  });

  it("keeps the relative times by default and shows the clock with timeFormat=clock", () => {
    const { rerender } = render(<FeedbackThread messages={CHAT} now={NOW} locale="en-GB" />);
    expect(screen.getAllByText("12 hours ago")).toHaveLength(4); // 23:50 to 00:11
    rerender(<FeedbackThread messages={CHAT} now={NOW} locale="en-GB" timeFormat="clock" />);
    expect(screen.getByText("23:50")).toBeInTheDocument();
    expect(screen.getByText("00:10")).toBeInTheDocument();
    // The full date stays in the Tooltip.
    const time = screen.getByText("00:10");
    const tip = document.getElementById(time.getAttribute("aria-describedby") ?? "");
    expect(tip).toHaveTextContent(/Saturday, 26 September 2026/);
  });

  it("puts a day line before the first row and at each calendar-day change", () => {
    const { container } = render(
      <FeedbackThread messages={CHAT} now={NOW} locale="en-GB" daySeparators timeFormat="clock" />,
    );
    const lines = [...container.querySelectorAll("[data-day-separator]")];
    expect(lines.map((li) => li.textContent)).toEqual(["Sunday 20 September", "Yesterday", "Today"]);
    expect(lines[2]!.querySelector("time")).toHaveAttribute("dateTime", "2026-09-26");
    // Calendar days, not 24-hour spans: 23:55 and 00:10 are fifteen minutes and a day apart.
    const rows = [...container.querySelectorAll("ol > li")];
    expect(rows.indexOf(lines[2]!)).toBe(rows.findIndex((li) => li.textContent?.includes("Still broken")) - 1);
  });

  it("words the day line in the kit locale, capitalised, with the year when not this one", () => {
    const old: FeedbackThreadItem = { id: 0, author: "Ada", createdAt: new Date(2025, 11, 31, 8), body: "Hi" };
    const { container } = render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH} locale="de-CH">
        <FeedbackThread messages={[old, ...CHAT]} now={NOW} daySeparators />
      </UiKitProvider>,
    );
    const lines = [...container.querySelectorAll("[data-day-separator]")].map((li) => li.textContent);
    expect(lines).toEqual(["Mittwoch, 31. Dezember 2025", "Sonntag, 20. September", "Gestern", "Heute"]);
  });

  it("draws no day lines unless asked", () => {
    const { container } = render(<FeedbackThread messages={CHAT} now={NOW} locale="en" />);
    expect(container.querySelector("[data-day-separator]")).toBeNull();
  });
});

describe("FeedbackComposer — chat sending (keksdose G5)", () => {
  const box = () => screen.getByRole("textbox", { name: "Write a comment" });

  it("keeps Ctrl/⌘+Enter as the default: plain Enter does not send", () => {
    const onSend = vi.fn();
    render(<FeedbackComposer onSend={onSend} />);
    fireEvent.change(box(), { target: { value: "hello" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(box(), { key: "Enter", ctrlKey: true });
    expect(onSend).toHaveBeenCalledWith("hello", null);
    expect(screen.getByText("Ctrl + Enter to send")).toBeInTheDocument();
  });

  it('sendOn="enter": Enter sends, Shift+Enter does not, nor an Enter ending an IME composition', () => {
    const onSend = vi.fn();
    render(<FeedbackComposer onSend={onSend} sendOn="enter" />);
    fireEvent.change(box(), { target: { value: "你好" } });

    fireEvent.keyDown(box(), { key: "Enter", shiftKey: true });
    fireEvent.keyDown(box(), { key: "Enter", isComposing: true });
    fireEvent.keyDown(box(), { key: "Enter", keyCode: 229 });
    expect(onSend).not.toHaveBeenCalled();

    const enter = fireEvent.keyDown(box(), { key: "Enter" });
    expect(enter).toBe(false); // default prevented: no stray newline
    expect(onSend).toHaveBeenCalledWith("你好", null);
    fireEvent.keyDown(box(), { key: "Enter", metaKey: true });
    expect(onSend).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Enter to send, Shift + Enter for a new line")).toBeInTheDocument();
  });

  it("translates the Enter hint", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <FeedbackComposer onSend={() => {}} sendOn="enter" />
      </UiKitProvider>,
    );
    expect(screen.getByText("Enter zum Senden, Umschalt + Enter für neue Zeile")).toBeInTheDocument();
  });

  it("renders the host's attachment slot beside Send and lets canSend decide", () => {
    const onSend = vi.fn();
    const { rerender } = render(
      <FeedbackComposer onSend={onSend} attachmentSlot={<button type="button">Attach files</button>} />,
    );
    expect(screen.getByRole("button", { name: "Attach files" })).toBeInTheDocument();
    const send = () => screen.getByRole("button", { name: "Send" });
    expect(send()).toBeDisabled();

    // Files ready, no text: an attachments-only message.
    rerender(<FeedbackComposer onSend={onSend} canSend attachmentSlot={<span>2 files</span>} />);
    expect(send()).toBeEnabled();
    fireEvent.click(send());
    expect(onSend).toHaveBeenCalledWith("", null);

    // An upload still running holds a written reply back.
    rerender(<FeedbackComposer onSend={onSend} canSend={false} attachmentSlot={<span>uploading…</span>} />);
    fireEvent.change(box(), { target: { value: "see attached" } });
    expect(send()).toBeDisabled();
    fireEvent.keyDown(box(), { key: "Enter", ctrlKey: true });
    expect(onSend).toHaveBeenCalledTimes(1);

    // pending blocks either way.
    rerender(<FeedbackComposer onSend={onSend} canSend pending />);
    expect(send()).toBeDisabled();
  });

  it("keeps the built-in single picture beside the slot", () => {
    render(<FeedbackComposer onSend={() => {}} attachment attachmentSlot={<span>refs</span>} />);
    expect(screen.getByText("refs")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /attach/i })).toBeInTheDocument();
  });
});
