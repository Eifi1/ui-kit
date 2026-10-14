import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "../../components/toast";
import { UiKitProvider, type UiKitLabelOverrides } from "../../i18n/kit-labels";
import type { FeedbackCategory } from "../feedback-inbox";
import {
  useFeedbackSubmit,
  type FeedbackCreatePayload,
  type FeedbackSubmit,
  type UseFeedbackSubmitOptions,
} from "../feedback-submit";

vi.mock("../../components/toast", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), undo: vi.fn() }),
}));
const domToBlob = vi.fn<() => Promise<Blob>>();
vi.mock("modern-screenshot", () => ({ domToBlob: () => domToBlob() }));

/**
 * §4.2 of the feedback contract: the submit dialog, wired — keksdose
 * `use-feedback-dialog.tsx` as one kit hook, so kastlan's `FeedbackButton` and
 * Kurvenschmiede's `use-feedback-dialog.tsx` can go.
 */

const ADA = { id: 7, email: "ada@example.com", display_name: "Ada Example" };
const png = (name: string, size = 10) => new File(["x".repeat(size)], name, { type: "image/png" });

/** The hook's latest `open` / `close`, handed out after each render as an app's top bar
 *  would hold them. */
const handle: { current: FeedbackSubmit | null } = { current: null };

function Host(props: Partial<UseFeedbackSubmitOptions<{ id: number }>>) {
  const feedback = useFeedbackSubmit<{ id: number }>({
    upload: async (file) => `/api/v1/feedback/attachments/${file.name}`,
    create: async () => ({ id: 412 }),
    user: ADA,
    environment: "dev",
    version: "0.4.26",
    ...props,
  });
  useEffect(() => {
    handle.current = feedback;
  });
  return <>{feedback.dialog}</>;
}

/** Open, and wait for the dialog: its module loads on the first open (0.34, MOD-1), so it
 *  is found with `findBy…` — as an app's test finds it — not `getBy…`. */
const open = async (category?: FeedbackCategory) => {
  act(() => handle.current!.open(category));
  return screen.findByRole("dialog");
};
const close = () => act(() => handle.current!.close());
const subject = (value: string) => fireEvent.change(screen.getByLabelText("Subject"), { target: { value } });
const send = () => act(async () => fireEvent.click(screen.getByRole("button", { name: "Send" })));
const pick = (files: File[]) =>
  fireEvent.change(document.querySelector<HTMLInputElement>('input[type="file"]')!, { target: { files } });
const clipboard = (...files: File[]) => ({
  clipboardData: { items: files.map((file) => ({ kind: "file", type: file.type, getAsFile: () => file })) },
});

// Loaded once up front so the first test's `findBy` does not spend its second compiling
// the dialog's modules; React.lazy still resolves it a render later, so the waits stay.
beforeAll(async () => {
  await import("../feedback-submit-dialog");
});
beforeEach(() => {
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  domToBlob.mockReset();
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => "blob:preview");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  window.history.replaceState(null, "", "/accounts?p=2");
});
afterEach(() => vi.restoreAllMocks());

describe("useFeedbackSubmit — the dialog", () => {
  it("is closed until opened, then opens on the row's category with the canon words", async () => {
    render(<Host />);
    expect(screen.queryByRole("dialog")).toBeNull();
    const dialog = await open("BUG");
    expect(within(dialog).getByRole("heading", { name: "Send feedback" })).toBeInTheDocument();
    const category = within(dialog).getByLabelText("Category") as HTMLSelectElement;
    expect(category.value).toBe("BUG");
    // The four pickable ones, in the kit's words — never Crash.
    expect(Array.from(category.options).map((o) => o.textContent)).toEqual(["Bug", "Idea", "Question", "Other"]);
    expect(within(dialog).getByLabelText("What happened? (optional)")).toBeInTheDocument();
    expect(within(dialog).getByText("Ctrl+Enter to send")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Add attachment/ })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Capture screenshot/ })).toBeInTheDocument();
    // The context box, from the same values the report will carry.
    expect(within(dialog).getByText("Ada Example (ada@example.com)")).toBeInTheDocument();
    const box = within(dialog).getByRole("checkbox", { name: "Attach current page URL" });
    expect(box).toBeChecked();
    expect(box).toHaveAccessibleDescription(window.location.href);
  });

  it("opens on Other without a category, and never on Crash", async () => {
    render(<Host />);
    await open();
    expect((screen.getByLabelText("Category") as HTMLSelectElement).value).toBe("OTHER");
    close();
    expect(screen.queryByRole("dialog")).toBeNull();
    await open("CRASH");
    expect((screen.getByLabelText("Category") as HTMLSelectElement).value).toBe("OTHER");
  });

  it("files a subject alone: no upload, the §3.4 payload, the thanks toast, closed", async () => {
    const upload = vi.fn(async () => "/api/v1/feedback/attachments/x.png");
    const create = vi.fn(async (_p: FeedbackCreatePayload) => ({ id: 412 }));
    const onSubmitted = vi.fn();
    render(<Host upload={upload} create={create} onSubmitted={onSubmitted} />);
    await open("IDEA");
    const href = window.location.href;
    subject("  Chart jumps on save  ");
    fireEvent.change(screen.getByLabelText("What happened? (optional)"), { target: { value: "   " } });
    await send();
    expect(upload).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toEqual({
      title: "Chart jumps on save",
      body: "",
      category: "IDEA",
      context: {
        url: href,
        route: "/accounts",
        origin: window.location.origin,
        environment: "dev",
        user_id: 7,
        user_email: "ada@example.com",
        user_display_name: "Ada Example",
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        ua: navigator.userAgent,
        version: "0.4.26",
      },
      screenshot_url: null,
      attachment_urls: [],
    });
    expect(toast.success).toHaveBeenCalledWith("Thanks for the feedback!");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onSubmitted).toHaveBeenCalledWith({ id: 412 });
  });

  it("uploads the screenshot and every file first, then names them in the report", async () => {
    const order: string[] = [];
    const upload = vi.fn(async (file: File) => {
      order.push(`upload ${file.name}`);
      return `/api/v1/feedback/attachments/${file.name}`;
    });
    const create = vi.fn(async (_p: FeedbackCreatePayload) => {
      order.push("create");
      return { id: 1 };
    });
    const shot = png("screenshot.webp");
    render(<Host upload={upload} create={create} capture={async () => shot} />);
    await open("BUG");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Capture screenshot/ })));
    pick([new File(["%PDF"], "log.pdf", { type: "application/pdf" }), new File(["t"], "trace.txt", { type: "text/plain" })]);
    fireEvent.paste(document, clipboard(png("image.png")));
    subject("Broken");
    await send();
    expect(upload).toHaveBeenCalledTimes(4);
    expect(order.at(-1)).toBe("create");
    const payload = create.mock.calls[0][0];
    expect(payload.screenshot_url).toBe("/api/v1/feedback/attachments/screenshot.webp");
    expect(payload.attachment_urls).toEqual([
      "/api/v1/feedback/attachments/log.pdf",
      "/api/v1/feedback/attachments/trace.txt",
      "/api/v1/feedback/attachments/pasted.png",
    ]);
  });

  it("withholds url and route when the box is unticked", async () => {
    const create = vi.fn(async (_p: FeedbackCreatePayload) => ({ id: 1 }));
    render(<Host create={create} />);
    await open("BUG");
    fireEvent.click(screen.getByRole("checkbox", { name: "Attach current page URL" }));
    expect(screen.getByText(window.location.href)).toHaveClass("line-through");
    subject("Broken");
    await send();
    expect(create.mock.calls[0][0].context).toMatchObject({ url: "", route: "", origin: window.location.origin });
  });

  it("creates nothing when an upload fails, toasts the server's words, and keeps the draft", async () => {
    const create = vi.fn(async (_p: FeedbackCreatePayload) => ({ id: 1 }));
    const failure = { response: { data: { detail: "File too large" } } };
    const errorMessage = vi.fn((error: unknown, fallback: string) =>
      (error as typeof failure).response?.data?.detail ?? fallback,
    );
    render(<Host upload={() => Promise.reject(failure)} create={create} errorMessage={errorMessage} />);
    await open("BUG");
    fireEvent.paste(document, clipboard(png("image.png")));
    subject("Broken");
    await send();
    expect(create).not.toHaveBeenCalled();
    expect(errorMessage).toHaveBeenCalledWith(failure, "Could not submit feedback");
    expect(toast.error).toHaveBeenCalledWith("File too large");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Subject")).toHaveValue("Broken");
    // And the button is back for a second try.
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  });

  it("says 'Could not submit feedback' without an errorMessage", async () => {
    render(<Host create={() => Promise.reject(new Error("500"))} />);
    await open("BUG");
    subject("Broken");
    await send();
    expect(toast.error).toHaveBeenCalledWith("Could not submit feedback");
  });

  it("sends once while a send is running", async () => {
    let resolve: (v: { id: number }) => void = () => {};
    const create = vi.fn(() => new Promise<{ id: number }>((r) => (resolve = r)));
    render(<Host create={create} />);
    await open("BUG");
    subject("Broken");
    await send();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    fireEvent.keyDown(screen.getByLabelText("Subject"), { key: "Enter", ctrlKey: true });
    expect(create).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ id: 1 }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not close a dialog opened again while the last send was running", async () => {
    let resolve: (v: { id: number }) => void = () => {};
    render(<Host create={() => new Promise((r) => (resolve = r))} />);
    await open("BUG");
    subject("First");
    await send();
    close();
    await open("IDEA");
    subject("Second");
    await act(async () => resolve({ id: 1 }));
    expect(toast.success).toHaveBeenCalledWith("Thanks for the feedback!");
    expect(screen.getByLabelText("Subject")).toHaveValue("Second");
  });
});

describe("useFeedbackSubmit — files and capture", () => {
  it("toasts a refused file's type, size and count in the contract's words", async () => {
    render(<Host />);
    await open("BUG");
    pick([new File(["x"], "page.html", { type: "text/html" })]);
    expect(toast.error).toHaveBeenLastCalledWith("Only images, PDF or text files are allowed");
    pick([png("huge.png", 10 * 1024 * 1024 + 1)]);
    expect(toast.error).toHaveBeenLastCalledWith("File is larger than 10 MB");
    pick([1, 2, 3, 4, 5, 6].map((n) => png(`p${n}.png`)));
    expect(toast.error).toHaveBeenLastCalledWith("Only 5 attachments fit — the rest were left out.");
  });

  it("captures #root by default, and toasts a failed capture", async () => {
    document.body.insertAdjacentHTML("afterbegin", '<div id="root"></div>');
    domToBlob.mockResolvedValue(new Blob(["x"], { type: "image/webp" }));
    render(<Host />);
    await open("BUG");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Capture screenshot/ })));
    expect(domToBlob).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Remove Screenshot" })).toBeInTheDocument();
    close();
    domToBlob.mockRejectedValue(new Error("tainted"));
    await open("BUG");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Capture screenshot/ })));
    expect(toast.error).toHaveBeenCalledWith("Could not capture a screenshot");
    expect(screen.queryByRole("button", { name: "Remove Screenshot" })).toBeNull();
    document.getElementById("root")?.remove();
  });

  it("offers no capture with capture={false}", async () => {
    render(<Host capture={false} />);
    await open("BUG");
    expect(screen.queryByRole("button", { name: /Capture screenshot/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Add attachment/ })).toBeInTheDocument();
  });

  it("speaks the provider's language: dialog, categories, context box and toasts", async () => {
    const labels = {
      feedbackDialog: { title: "Feedback senden", subject: "Betreff", bodyOptional: "Was ist passiert? (optional)", save: "Senden" },
      feedbackCategory: { CRASH: "Absturz", BUG: "Fehler", IDEA: "Idee", QUESTION: "Frage", OTHER: "Sonstiges" },
      feedbackContext: { user: "Nutzer", attachUrl: "Aktuelle Seiten-URL anhängen" },
      feedbackToast: { submitted: "Danke für Ihr Feedback!" },
    } as UiKitLabelOverrides;
    render(
      <UiKitProvider labels={labels}>
        <Host />
      </UiKitProvider>,
    );
    await open("QUESTION");
    expect(screen.getByRole("heading", { name: "Feedback senden" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Frage" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Aktuelle Seiten-URL anhängen" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Betreff"), { target: { value: "Wieso?" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Senden" })));
    expect(toast.success).toHaveBeenCalledWith("Danke für Ihr Feedback!");
  });
});

/** 0.38 (§9.2 decision 6): `publicNotice` shows the kit's sentence under the body. */
describe("useFeedbackSubmit — publicNotice", () => {
  const NOTICE = "Other users will see the title and text (never your screenshots or files).";

  it("says nothing about other users by default", async () => {
    render(<Host />);
    await open();
    expect(screen.queryByText(NOTICE)).toBeNull();
  });

  it("says who will read the report with publicNotice", async () => {
    render(<Host publicNotice />);
    await open();
    expect(screen.getByText(NOTICE)).toBeInTheDocument();
    expect(screen.getByLabelText("What happened? (optional)")).toHaveAccessibleDescription(NOTICE);
  });

  it("in the provider's language", async () => {
    render(
      <UiKitProvider labels={{ feedbackDialog: { publicNotice: "Andere Personen sehen Titel und Text." } } as UiKitLabelOverrides}>
        <Host publicNotice />
      </UiKitProvider>,
    );
    await open();
    expect(screen.getByText("Andere Personen sehen Titel und Text.")).toBeInTheDocument();
  });
});
