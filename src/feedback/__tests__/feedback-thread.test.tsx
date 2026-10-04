import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { FeedbackComposer, FeedbackThread } from "../feedback-thread";
import type { FeedbackThreadMessage } from "../feedback-thread";
import { FeedbackDialog } from "../feedback-dialog";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";

const NOW = new Date("2026-09-26T12:00:00Z");
const MESSAGES: FeedbackThreadMessage[] = [
  {
    id: 1,
    author: "Ada",
    createdAt: new Date(NOW.getTime() - 5 * 60_000),
    body: "The chart is empty.\n\nSince Monday.",
    attachments: [
      { id: "a", name: "shot.png", url: "https://example.com/shot.png", type: "image/png" },
      { id: "b", name: "log.txt", url: "https://example.com/log.txt", type: "text/plain", size: 2048 },
    ],
  },
  { id: 2, author: "Marcel", staff: true, createdAt: "2026-09-25T12:00:00Z", body: "Fixed, please check." },
  { id: 3, own: true, createdAt: NOW, body: "שלום, works now" },
];

describe("FeedbackThread", () => {
  it("shows the full date in the kit Tooltip, not a native title (keksdose F0)", () => {
    const { container } = render(<FeedbackThread messages={MESSAGES} now={NOW} locale="en" />);
    expect(container.querySelector("[title]")).toBeNull();
    const time = screen.getByText("5 minutes ago");
    const tip = document.getElementById(time.getAttribute("aria-describedby") ?? "");
    expect(tip).toHaveTextContent(/Saturday, September 26, 2026/);
  });

  it("renders author, relative time, body and attachments per message", () => {
    render(<FeedbackThread messages={MESSAGES} now={NOW} locale="en" />);
    const [first, second, third] = within(screen.getByRole("list", { name: "Comments" })).getAllByRole(
      "article",
    );
    expect(first).toHaveTextContent("Ada");
    const time = within(first).getByText("5 minutes ago");
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("dateTime", new Date(NOW.getTime() - 5 * 60_000).toISOString());
    expect(within(first).getByText(/The chart is empty/)).toHaveTextContent(
      "The chart is empty. Since Monday.",
      { normalizeWhitespace: true },
    );
    expect(within(first).getByRole("img", { name: "shot.png" })).toHaveAttribute(
      "src",
      "https://example.com/shot.png",
    );
    expect(within(first).getByRole("link", { name: /log\.txt/ })).toHaveTextContent("2 kB");

    expect(within(second).getByText("Staff")).toBeInTheDocument();
    expect(within(second).getByText("yesterday")).toBeInTheDocument();
    // An own message without an author reads "You".
    expect(within(third).getByText("You")).toBeInTheDocument();
    expect(within(third).getByText("now")).toBeInTheDocument();
  });

  it("swaps a failed image thumbnail for a named placeholder, not an empty box", () => {
    render(<FeedbackThread messages={MESSAGES} now={NOW} locale="en" />);
    const img = screen.getByRole("img", { name: "shot.png" });
    // The glyph under the picture is there from the start, for the lazy-load wait.
    expect(img.parentElement?.querySelector("svg")).not.toBeNull();
    fireEvent.error(img);
    expect(screen.queryByRole("img", { name: "shot.png" })).toBeNull();
    expect(screen.getByRole("link", { name: "shot.png" })).toHaveAttribute("href", "https://example.com/shot.png");
  });

  it("puts own messages at the end side and lets each body set its own direction", () => {
    render(<FeedbackThread messages={MESSAGES} now={NOW} />);
    const items = screen.getAllByRole("listitem").filter((li) => li.querySelector("article"));
    expect(items[0]).toHaveClass("justify-start");
    expect(items[2]).toHaveClass("justify-end");
    expect(items[2]).toHaveAttribute("data-own");
    expect(screen.getByText(/שלום/)).toHaveAttribute("dir", "auto");
  });

  it("tags bodies, authors and attachments data-private unless redact={false}", () => {
    const { rerender } = render(<FeedbackThread messages={MESSAGES} now={NOW} />);
    expect(screen.getByText("Fixed, please check.")).toHaveAttribute("data-private");
    expect(screen.getByText("Ada")).toHaveAttribute("data-private");
    expect(screen.getAllByRole("list", { name: "Attachments" })[0]).toHaveAttribute("data-private");
    rerender(<FeedbackThread messages={MESSAGES} now={NOW} redact={false} />);
    expect(screen.getByText("Fixed, please check.")).not.toHaveAttribute("data-private");
  });

  it("hands attachments to renderAttachment when given", () => {
    render(
      <FeedbackThread
        messages={MESSAGES.slice(0, 1)}
        now={NOW}
        renderAttachment={(a) => <span>custom {a.name}</span>}
      />,
    );
    expect(screen.getByText("custom shot.png")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("shows loading, then empty states, in the provider's language", () => {
    const { rerender } = render(<FeedbackThread messages={[]} loading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading comments…");
    rerender(
      <UiKitProvider labels={{ feedbackThread: UI_KIT_LABELS_DE_CH.feedbackThread }}>
        <FeedbackThread messages={[]} />
      </UiKitProvider>,
    );
    expect(screen.getByText("Noch keine Kommentare")).toBeInTheDocument();
  });

  it("dates anything older than a week instead of counting days", () => {
    render(
      <FeedbackThread
        messages={[{ id: 1, author: "Ada", createdAt: "2026-08-01T12:00:00Z", body: "old" }]}
        now={NOW}
        locale="en-US"
      />,
    );
    expect(screen.getByText("Aug 1, 2026")).toBeInTheDocument();
  });
});

describe("FeedbackComposer", () => {
  it("sends the trimmed body with Ctrl/Cmd+Enter and clears once the send resolves", async () => {
    let resolve!: () => void;
    const onSend = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    render(<FeedbackComposer onSend={onSend} />);
    const box = screen.getByRole("textbox", { name: "Write a comment" });
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

    fireEvent.change(box, { target: { value: "  Still broken  " } });
    fireEvent.keyDown(box, { key: "Enter" }); // plain Enter is a new line
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: "Enter", metaKey: true });
    expect(onSend).toHaveBeenCalledWith("Still broken", null);
    expect(box).toHaveValue("  Still broken  ");
    await act(async () => resolve());
    expect(box).toHaveValue("");
  });

  it("keeps text typed while the send was in flight, and everything on a rejection", async () => {
    let resolve!: () => void;
    const onSend = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const { rerender } = render(<FeedbackComposer onSend={onSend} />);
    const box = screen.getByRole("textbox", { name: "Write a comment" });
    fireEvent.change(box, { target: { value: "one" } });
    fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
    fireEvent.change(box, { target: { value: "one and two" } });
    await act(async () => resolve());
    expect(box).toHaveValue("one and two");

    const failing = vi.fn(() => Promise.reject(new Error("offline")));
    rerender(<FeedbackComposer onSend={failing} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Send" })));
    expect(failing).toHaveBeenCalled();
    expect(box).toHaveValue("one and two");
  });

  it("is busy while pending and sends nothing more", () => {
    const onSend = vi.fn();
    render(<FeedbackComposer onSend={onSend} pending />);
    const box = screen.getByRole("textbox", { name: "Write a comment" });
    fireEvent.change(box, { target: { value: "hi" } });
    const button = screen.getByRole("button", { name: "Send" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("offers the attachment field only when asked, and a reason instead of the box", () => {
    const { rerender } = render(<FeedbackComposer onSend={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Add attachment/ })).toBeNull();
    rerender(<FeedbackComposer onSend={vi.fn()} attachment />);
    expect(screen.getByRole("button", { name: /Add attachment/ })).toBeInTheDocument();
    rerender(<FeedbackComposer onSend={vi.fn()} disabledReason="This report is closed." />);
    expect(screen.getByText("This report is closed.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("names the shortcut with the platform's modifier, translated", () => {
    render(
      <UiKitProvider labels={{ feedbackComposer: UI_KIT_LABELS_DE_CH.feedbackComposer }}>
        <FeedbackComposer onSend={vi.fn()} />
      </UiKitProvider>,
    );
    // jsdom is not a Mac, so the modifier is Ctrl — which German keyboards call Strg.
    expect(screen.getByText("Strg + Enter zum Senden")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Kommentar schreiben" })).toBeInTheDocument();
  });
});

describe("FeedbackDialog labels (0.12.0)", () => {
  const base = {
    open: true,
    onClose: () => {},
    categories: [{ value: "BUG", label: "Bug" }],
    category: "BUG",
    onCategoryChange: () => {},
    onSubmit: () => {},
  };

  it("renders in English without labels, and in the provider's language with them", () => {
    const { unmount } = render(<FeedbackDialog {...base} />);
    expect(screen.getByRole("heading", { name: "Send feedback" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    // The single-mode heading — "Attachment" since 0.27.0 (the feedback contract, §4.2).
    expect(screen.getByText("Attachment")).toBeInTheDocument();
    unmount();

    render(
      <UiKitProvider
        labels={{
          feedbackDialog: UI_KIT_LABELS_DE_CH.feedbackDialog,
          feedbackAttachment: UI_KIT_LABELS_DE_CH.feedbackAttachment,
        }}
      >
        <FeedbackDialog {...base} labels={{ save: "Abschicken" }} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("heading", { name: "Feedback senden" })).toBeInTheDocument();
    expect(screen.getByLabelText("Betreff")).toBeInTheDocument();
    // From the catalogue rather than spelled out, so the canon wording (0.27.0) can land
    // in it without this test having to follow.
    expect(
      screen.getByRole("button", { name: new RegExp(UI_KIT_LABELS_DE_CH.feedbackAttachment.attachmentAdd) }),
    ).toBeInTheDocument();
    // The prop wins over the provider.
    expect(screen.getByRole("button", { name: "Abschicken" })).toBeInTheDocument();
  });
});
