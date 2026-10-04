import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "../../components/toast";
import { WriteLockProvider } from "../../components/write-lock";
import { FeedbackNoteEditor } from "../feedback-inbox";
import type { FeedbackRecord } from "../feedback-record";
import {
  FeedbackReworkSection,
  FeedbackRowDetail,
  feedbackAttachmentUrls,
  feedbackPageHref,
  feedbackPagePath,
  feedbackPageUrl,
  feedbackRowAccess,
  type FeedbackDetailUpdate,
} from "../feedback-row-detail";

vi.mock("../../components/toast", () => ({
  toast: Object.assign(vi.fn(), { undo: vi.fn(), success: vi.fn(), error: vi.fn() }),
}));

/**
 * §4.4 of the feedback contract (docs/feedback-harmonization.md) — the expanded row,
 * lifted from keksdose's `FeedbackRow` (`feedback-page.tsx:329-612`). Synthetic data.
 */

const ATT = "/api/v1/feedback/attachments";
const AUTHOR = 7;
const ADMIN = 1;
const OTHER = 99;

function record(over: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: 412,
    user_id: AUTHOR,
    title: "Chart jumps on save",
    body: "The chart jumps when I save.",
    category: "BUG",
    status: "OPEN",
    context: { url: "https://app.example.test/accounts?p=2#top", route: "/accounts" },
    screenshot_url: null,
    attachment_urls: null,
    outcome: null,
    resolved_at: null,
    created_at: "2026-10-04T09:12:00Z",
    updated_at: "2026-10-04T09:12:00Z",
    ...over,
  };
}

/** A PATCH that lands at once, as TanStack's `mutate` would. */
const landing = () =>
  vi.fn<FeedbackDetailUpdate>((_patch, { onSuccess }) => {
    onSuccess();
  });

beforeAll(() => {
  URL.createObjectURL = () => "blob:file";
  URL.revokeObjectURL = () => {};
});

beforeEach(() => {
  vi.mocked(toast.error).mockClear();
  vi.mocked(toast.undo).mockClear();
});

const headings = () =>
  Array.from(document.querySelectorAll(".uppercase")).map((el) => el.textContent);

describe("FeedbackRowDetail — sections", () => {
  it("renders the contract's sections in order, the body without its file lines", () => {
    const body = `Typo here.\n\n--- REWORK 2026-10-04 09:12 ---\nStill jumps.\n[screenshot] ${ATT}/000000000000.png`;
    render(
      <FeedbackRowDetail
        row={record({ body, status: "DONE", outcome: "Fixed.", resolved_at: "2026-10-05T10:00:00Z" })}
        canEdit={false}
        viewerId={AUTHOR}
        onUpdate={landing()}
        renderDate={(iso) => iso.slice(0, 10)}
      />,
    );
    expect(headings()).toEqual(["Description", "URL", "Attachment", "Outcome", "Status"]);
    // The rounds stay in the prose (what was said after the answer); the file line goes.
    expect(screen.getByText(/Typo here\.\s+--- REWORK 2026-10-04 09:12 ---\s+Still jumps\./)).toBeInTheDocument();
    expect(screen.queryByText(/\[screenshot\]/)).toBeNull();
    expect(screen.getByText("Resolved: 2026-10-05")).toBeInTheDocument();
    expect(screen.getByText("Fixed.")).toBeInTheDocument();
  });

  it("shows a dash for an empty body and no URL section without a page", () => {
    render(
      <FeedbackRowDetail row={record({ body: "  ", context: null })} canEdit={false} viewerId={OTHER} onUpdate={landing()} />,
    );
    expect(headings()).toEqual(["Description", "Outcome", "Status"]);
    expect(screen.getAllByText("—")).toHaveLength(2); // body and outcome
  });
});

describe("FeedbackRowDetail — the author's description editor", () => {
  const body = [
    "Original text.",
    "",
    "--- REWORK 2026-10-04 09:12 ---",
    "Please also fix the legend.",
    `[screenshot] ${ATT}/0123456789abcdef0123456789abcdef_0123456789ab.png`,
    "",
    "--- COMMENT 2026-10-04 10:00 · Example Ltd ---",
    "A folded comment.",
  ].join("\n");

  it("holds ONLY the original text, and saving keeps every rework block and file line", () => {
    const onUpdate = landing();
    render(<FeedbackRowDetail row={record({ body })} canEdit={false} viewerId={AUTHOR} onUpdate={onUpdate} />);
    const edit = screen.getByRole("button", { name: "Edit description" });
    expect(edit).toHaveTextContent("Edit");
    fireEvent.click(edit);

    const box = screen.getByRole("textbox", { name: "What happened? (optional)" });
    expect(box).toHaveValue("Original text.");

    fireEvent.change(box, { target: { value: "Corrected text." } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const patch = onUpdate.mock.calls[0][0];
    expect(patch).toEqual({ id: 412, body: body.replace("Original text.", "Corrected text.") });
    // The editor closed once the PATCH landed.
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("clearing it saves the appended blocks alone; an unchanged save sends nothing", () => {
    const onUpdate = landing();
    render(<FeedbackRowDetail row={record({ body })} canEdit={false} viewerId={AUTHOR} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit description" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onUpdate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Edit description" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onUpdate.mock.calls[0][0].body).toBe(body.slice(body.indexOf("--- REWORK")));
  });

  it("is the author's, and only while OPEN or IN_PROGRESS — admin or not", () => {
    const view = (over: Partial<FeedbackRecord>, viewerId: number, canEdit = false) =>
      render(<FeedbackRowDetail row={record(over)} canEdit={canEdit} viewerId={viewerId} onUpdate={landing()} />);
    // keksdose `canAuthorEdit` is not gated on the page: the admin's own row on the
    // inbox offers it as much as /my-feedback does.
    const cases: Array<[Partial<FeedbackRecord>, number, boolean, boolean]> = [
      [{ status: "OPEN" }, AUTHOR, false, true],
      [{ status: "IN_PROGRESS" }, AUTHOR, true, true],
      [{ status: "IN_EVALUATION" }, AUTHOR, false, false],
      [{ status: "OPEN" }, ADMIN, true, false],
      [{ status: "OPEN" }, OTHER, false, false],
      // An erased author is nobody's — not even a viewer with no id.
      [{ status: "OPEN", user_id: null }, AUTHOR, false, false],
    ];
    for (const [over, viewer, canEdit, offered] of cases) {
      const { unmount } = view(over, viewer, canEdit);
      expect(Boolean(screen.queryByRole("button", { name: "Edit description" }))).toBe(offered);
      unmount();
    }
  });
});

describe("FeedbackRowDetail — the page it was filed on", () => {
  it("links path + query + hash and copies the FULL url", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<FeedbackRowDetail row={record()} canEdit={false} viewerId={OTHER} onUpdate={landing()} />);
    const link = screen.getByRole("link", { name: "/accounts?p=2#top" });
    expect(link).toHaveAttribute("href", "/accounts?p=2#top");
    expect(screen.getByRole("link", { name: "Open page" })).toHaveAttribute("href", "/accounts?p=2#top");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy URL" }));
    });
    expect(writeText).toHaveBeenCalledWith("https://app.example.test/accounts?p=2#top");
  });

  it("takes a path-only url (Kurvenschmiede's backfill) and falls back to the route", () => {
    expect(feedbackPageHref({ url: "/accounts?p=2" })).toBe("/accounts?p=2");
    expect(feedbackPagePath({ url: "/accounts?p=2" })).toBe("/accounts");
    expect(feedbackPageUrl({ url: "/accounts?p=2" })).toBe("/accounts?p=2");
    expect(feedbackPageHref({ url: "", route: "/budget" })).toBe("/budget");
    expect(feedbackPageUrl({ route: "/budget" })).toBe("/budget");
    expect(feedbackPagePath({ url: "https://app.example.test/a/b?x=1#h" })).toBe("/a/b");
    expect(feedbackPageHref(null)).toBeNull();
    expect(feedbackPageHref({ url: "", route: "" })).toBeNull();

    render(
      <FeedbackRowDetail
        row={record({ context: { url: "/accounts?p=2" } })}
        canEdit={false}
        viewerId={OTHER}
        onUpdate={landing()}
      />,
    );
    expect(screen.getByRole("link", { name: "/accounts?p=2" })).toHaveAttribute("href", "/accounts?p=2");
  });

  it("never links off the app", () => {
    expect(feedbackPageHref({ url: "javascript:alert(1)" })).toBeNull();
    expect(feedbackPageUrl({ url: "javascript:alert(1)" })).toBeNull();
    expect(feedbackPageHref({ url: "https://app.example.test//evil.example/x" })).toBe("/evil.example/x");
    expect(feedbackPageHref({ url: "//evil.example/x" })).toBe("/x");
  });
});

describe("FeedbackRowDetail — attachments", () => {
  const kastlanKey = "0123456789abcdef0123456789abcdef_0123456789ab";

  it("lists the screenshot, the files, then the rework pictures — each once, any key shape", () => {
    const row = record({
      screenshot_url: `${ATT}/aaaaaaaaaaaa.webp`,
      attachment_urls: [`${ATT}/${kastlanKey}.pdf`, `${ATT}/aaaaaaaaaaaa.webp`],
      body: `x\n\n--- REWORK 2026-10-04 09:12 ---\nn\n[screenshot] ${ATT}/${kastlanKey}.png`,
    });
    expect(feedbackAttachmentUrls(row)).toEqual([
      `${ATT}/aaaaaaaaaaaa.webp`,
      `${ATT}/${kastlanKey}.pdf`,
      `${ATT}/${kastlanKey}.png`,
    ]);
    expect(feedbackAttachmentUrls(record({ attachment_urls: undefined }))).toEqual([]);
  });

  it("shows pictures through the fetcher and downloads the rest", async () => {
    const fetcher = vi.fn(async () => new Blob(["x"], { type: "application/pdf" }));
    const row = record({
      screenshot_url: `${ATT}/${kastlanKey}.png`,
      attachment_urls: [`${ATT}/${kastlanKey}.pdf`],
    });
    render(<FeedbackRowDetail row={row} canEdit={false} viewerId={OTHER} onUpdate={landing()} fetcher={fetcher} />);
    await waitFor(() => expect(screen.getByRole("img", { name: "Attachment" })).toBeInTheDocument());
    expect(fetcher).toHaveBeenCalledWith(`${ATT}/${kastlanKey}.png`, expect.anything());

    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const download = screen.getByRole("button", { name: `Download ${kastlanKey}.pdf` });
    await act(async () => {
      fireEvent.click(download);
    });
    expect(fetcher).toHaveBeenCalledWith(`${ATT}/${kastlanKey}.pdf`, expect.anything());
    expect(click).toHaveBeenCalledTimes(1);
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe(`${kastlanKey}.pdf`);
    click.mockRestore();
  });

  it("toasts a failed download", async () => {
    const fetcher = vi.fn(async () => new Response("", { status: 404 }));
    render(
      <FeedbackRowDetail
        row={record({ attachment_urls: [`${ATT}/log.txt`] })}
        canEdit={false}
        viewerId={OTHER}
        onUpdate={landing()}
        fetcher={fetcher}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Download log.txt" }));
    });
    expect(toast.error).toHaveBeenCalledWith("The attachment could not be downloaded.");
  });
});

describe("FeedbackRowDetail — outcome", () => {
  it("lets the admin add one, update it, and clear it to null", () => {
    const onUpdate = landing();
    const { rerender } = render(
      <FeedbackRowDetail row={record()} canEdit viewerId={ADMIN} onUpdate={onUpdate} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add outcome" }));
    const box = screen.getByRole("textbox", { name: "What was done, decided, or why this won't be addressed." });
    fireEvent.change(box, { target: { value: "  Fixed in 0.4.27.  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onUpdate.mock.calls[0][0]).toEqual({ id: 412, outcome: "Fixed in 0.4.27." });

    rerender(<FeedbackRowDetail row={record({ outcome: "Fixed." })} canEdit viewerId={ADMIN} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: " " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onUpdate.mock.calls[1][0]).toEqual({ id: 412, outcome: null });
  });

  it("offers no outcome editing off the inbox — to an admin either", () => {
    render(<FeedbackRowDetail row={record({ user_id: ADMIN })} canEdit={false} viewerId={ADMIN} onUpdate={landing()} />);
    expect(screen.queryByRole("button", { name: "Add outcome" })).toBeNull();
  });
});

describe("FeedbackRowDetail — rework", () => {
  it("is offered on answered rows to the author and the admin, never to anyone else", () => {
    const cases: Array<[Partial<FeedbackRecord>, number, boolean, boolean]> = [
      [{ status: "DONE" }, AUTHOR, false, true],
      [{ status: "WONT_DO" }, AUTHOR, false, true],
      [{ status: "POSTPONED" }, AUTHOR, false, true],
      [{ status: "NEEDS_LIVE_TEST" }, ADMIN, true, true],
      [{ status: "IN_EVALUATION" }, OTHER, false, false],
      [{ status: "OPEN" }, AUTHOR, false, false],
      [{ status: "IN_PROGRESS" }, ADMIN, true, false],
    ];
    for (const [over, viewer, canEdit, offered] of cases) {
      const { unmount } = render(
        <FeedbackRowDetail row={record(over)} canEdit={canEdit} viewerId={viewer} onUpdate={landing()} />,
      );
      expect(Boolean(screen.queryByRole("button", { name: "Rework" }))).toBe(offered);
      unmount();
    }
  });

  it("needs a note, sends the body ALONE as an append, and closes once it landed", () => {
    const onUpdate = landing();
    const body = "The chart jumps when I save.";
    render(<FeedbackRowDetail row={record({ status: "DONE", body })} canEdit={false} viewerId={AUTHOR} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole("button", { name: "Rework" }));
    expect(headings()).toContain("Send for rework");
    const send = screen.getByRole("button", { name: "Send rework" });
    expect(send).toBeDisabled();
    const box = screen.getByRole("textbox", {
      name: "What still needs refinement? Any new constraints or change of direction.",
    });
    expect(box).toHaveAttribute("aria-required", "true");
    fireEvent.change(box, { target: { value: "   " } });
    expect(send).toBeDisabled();
    fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
    expect(onUpdate).not.toHaveBeenCalled();

    fireEvent.change(box, { target: { value: "  Still jumps on Safari.  " } });
    fireEvent.click(send);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    const patch = onUpdate.mock.calls[0][0];
    expect(Object.keys(patch).sort()).toEqual(["body", "id"]);
    expect(patch.body).toMatch(/^The chart jumps when I save\.\n\n--- REWORK \d{4}-\d{2}-\d{2} \d{2}:\d{2} ---\nStill jumps on Safari\.$/);
    expect(screen.queryByText("Send for rework")).toBeNull();
  });

  it("uploads the one file first and names it in the round", async () => {
    const onUpdate = landing();
    const onUpload = vi.fn(async () => `${ATT}/0123456789abcdef0123456789abcdef_0123456789ab.pdf`);
    const { container } = render(
      <FeedbackRowDetail
        row={record({ status: "IN_EVALUATION", body: "" })}
        canEdit={false}
        viewerId={AUTHOR}
        onUpdate={onUpdate}
        onUpload={onUpload}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Rework" }));
    const file = new File(["%PDF-"], "trace.pdf", { type: "application/pdf" });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toHaveAttribute("multiple");
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "See the trace." } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send rework" }));
    });
    expect(onUpload).toHaveBeenCalledWith(file);
    expect(onUpdate.mock.calls[0][0].body).toMatch(
      /^--- REWORK .+ ---\nSee the trace\.\n\[screenshot\] \/api\/v1\/feedback\/attachments\/0123456789abcdef0123456789abcdef_0123456789ab\.pdf$/,
    );
  });

  it("sends nothing when the upload fails — or answers with a foreign URL", async () => {
    for (const onUpload of [
      vi.fn(async () => {
        throw new Error("413");
      }),
      vi.fn(async () => "https://elsewhere.example/x.png"),
    ]) {
      vi.mocked(toast.error).mockClear();
      const onUpdate = landing();
      const { container, unmount } = render(
        <FeedbackReworkSection row={{ id: 9, body: "b" }} onUpdate={onUpdate} onUpload={onUpload} onCancel={vi.fn()} />,
      );
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [new File(["x"], "a.png", { type: "image/png" })] } });
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "note" } });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Send rework" }));
      });
      expect(onUpdate).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("The file could not be uploaded. The rework was not sent.");
      // The note is still there to send again.
      expect(screen.getByRole("textbox")).toHaveValue("note");
      unmount();
    }
  });

  it("refuses a file outside the contract's types with the toast's words", () => {
    const { container } = render(
      <FeedbackReworkSection row={{ id: 9, body: "b" }} onUpdate={landing()} onUpload={vi.fn()} onCancel={vi.fn()} />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["<svg/>"], "a.svg", { type: "image/svg+xml" })] } });
    expect(toast.error).toHaveBeenCalledWith("Only images, PDF or text files are allowed");
  });
});

describe("FeedbackRowDetail — status", () => {
  it("gives the admin all seven pills, through the undoable change", () => {
    const statusChange = vi.fn();
    const row = record({ status: "IN_EVALUATION" });
    render(<FeedbackRowDetail row={row} canEdit viewerId={ADMIN} onUpdate={landing()} statusChange={statusChange} />);
    const pills = within(screen.getByText("Status").parentElement!.parentElement!).getAllByRole("button");
    expect(pills).toHaveLength(7);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(statusChange).toHaveBeenCalledWith(row, "DONE");
  });

  it("builds the Undo change from onUpdate when none is given", () => {
    const onUpdate = landing();
    render(<FeedbackRowDetail row={record()} canEdit viewerId={ADMIN} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onUpdate.mock.calls[0][0]).toEqual({ id: 412, status: "DONE" });
    expect(toast.undo).toHaveBeenCalledWith("Set to “Done”: Chart jumps on save", expect.anything());
  });

  it("shows everyone else the narrow set, read-only", () => {
    const statusChange = vi.fn();
    render(
      <FeedbackRowDetail row={record()} canEdit={false} viewerId={AUTHOR} onUpdate={landing()} statusChange={statusChange} />,
    );
    const done = screen.queryByRole("button", { name: "Done" });
    expect(done).toBeNull(); // OPEN → the chain's next step and the three off it
    const pills = within(screen.getByText("Status").parentElement!.parentElement!).getAllByRole("button");
    expect(pills.every((pill) => (pill as HTMLButtonElement).disabled)).toBe(true);
  });
});

describe("FeedbackRowDetail — write lock (opt-in)", () => {
  afterEach(() => vi.mocked(toast.undo).mockClear());

  it("under a lock with `commit`, the pills and saves say why and send nothing", () => {
    const onUpdate = landing();
    const statusChange = vi.fn();
    render(
      <WriteLockProvider locked reason="Read-only demo">
        <FeedbackRowDetail row={record()} canEdit viewerId={ADMIN} onUpdate={onUpdate} statusChange={statusChange} commit />
      </WriteLockProvider>,
    );
    const done = screen.getByRole("button", { name: "Done" });
    expect(done).toHaveAttribute("aria-disabled", "true");
    expect(done).not.toBeDisabled();
    expect(done).toHaveAccessibleDescription("Read-only demo");
    fireEvent.click(done);
    expect(statusChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Add outcome" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "x" } });
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(save);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", ctrlKey: true });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("without `commit` a lock does not touch feedback (keksdose's lock is a budget's)", () => {
    const statusChange = vi.fn();
    render(
      <WriteLockProvider locked reason="Read-only demo">
        <FeedbackRowDetail row={record()} canEdit viewerId={ADMIN} onUpdate={landing()} statusChange={statusChange} />
      </WriteLockProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(statusChange).toHaveBeenCalledTimes(1);
  });
});

describe("feedbackRowAccess", () => {
  it("answers as the server would (§3.4)", () => {
    expect(feedbackRowAccess({ user_id: AUTHOR, status: "DONE" }, { canEdit: false, viewerId: AUTHOR })).toEqual({
      isAuthor: true,
      canEditDescription: false,
      canEditOutcome: false,
      canRework: true,
      canChangeStatus: false,
    });
    expect(feedbackRowAccess({ user_id: null, status: "OPEN" }, { canEdit: false, viewerId: null }).isAuthor).toBe(false);
    expect(feedbackRowAccess({ user_id: AUTHOR, status: "OPEN" }, { canEdit: true }).canEditDescription).toBe(false);
  });
});

describe("FeedbackNoteEditor (0.27 additions)", () => {
  it("names its box by the line above it; `required` holds Save on a blank box", () => {
    const onSave = vi.fn();
    render(
      <FeedbackNoteEditor
        initial=""
        pending={false}
        required
        onSave={onSave}
        onCancel={vi.fn()}
        saveLabel="Send"
        cancelLabel="Cancel"
        placeholder="What still needs doing?"
      />,
    );
    const box = screen.getByRole("textbox", { name: "What still needs doing?" });
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    fireEvent.change(box, { target: { value: "x" } });
    fireEvent.keyDown(box, { key: "Enter", metaKey: true });
    expect(onSave).toHaveBeenCalledWith("x", null);
  });
});
