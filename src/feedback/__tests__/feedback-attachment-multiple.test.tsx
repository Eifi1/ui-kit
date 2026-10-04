import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_MAX_ATTACHMENTS,
  FeedbackAttachmentField,
  type FeedbackAttachmentError,
  type FeedbackAttachmentErrorInfo,
} from "../feedback-attachment";
import { FeedbackDialog, type FeedbackMultipleSubmission, type FeedbackSubmission } from "../feedback-dialog";

/**
 * keksdose N3 (dev#578: "pasted two photos, the second overwrote the first"):
 * `<FeedbackAttachmentField multiple>` and `<FeedbackDialog attachments="multiple">`
 * ADD every pick, paste and capture, up to `max`, each a removable chip.
 */

const png = (name: string, size = 10) => new File(["x".repeat(size)], name, { type: "image/png" });
const pdf = (name: string) => new File(["%PDF"], name, { type: "application/pdf" });

let urls = 0;
beforeEach(() => {
  urls = 0;
  // jsdom has no object URLs; each call gets its own so revocation can be traced.
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => `blob:${++urls}`);
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

function Harness({
  initial = [],
  max,
  onError,
  accept,
}: {
  initial?: File[];
  max?: number;
  onError?: (kind: FeedbackAttachmentError, info: FeedbackAttachmentErrorInfo) => void;
  accept?: string[];
}) {
  const [files, setFiles] = useState<File[]>(initial);
  return (
    <>
      <FeedbackAttachmentField multiple value={files} onChange={setFiles} max={max} onError={onError} accept={accept} />
      <output data-testid="names">{files.map((f) => f.name).join(",")}</output>
    </>
  );
}

const names = () => screen.getByTestId("names").textContent;
const fileInput = (container: HTMLElement) => container.querySelector<HTMLInputElement>('input[type="file"]')!;
const pick = (container: HTMLElement, files: File[]) => fireEvent.change(fileInput(container), { target: { files } });
const clipboard = (...files: File[]) => ({
  clipboardData: {
    items: files.map((file) => ({ kind: "file", type: file.type, getAsFile: () => file })),
  },
});

describe("FeedbackAttachmentField multiple", () => {
  it("adds picked files as chips in a named list, each with its own remove button", () => {
    const { container } = render(<Harness accept={["image/png", "application/pdf"]} />);
    expect(fileInput(container)).toHaveAttribute("multiple");
    pick(container, [png("a.png"), pdf("b.pdf")]);
    pick(container, [png("c.png")]);
    expect(names()).toBe("a.png,b.pdf,c.png");
    const list = screen.getByRole("list", { name: "Attachments" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    for (const name of ["a.png", "b.pdf", "c.png"]) {
      expect(screen.getByRole("button", { name: `Remove ${name}` })).toBeInTheDocument();
    }
    // A PDF gets a glyph, not an object URL.
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
  });

  it("defaults max to DEFAULT_MAX_ATTACHMENTS and drops the surplus with onError('count')", () => {
    const onError = vi.fn();
    const { container } = render(<Harness max={3} initial={[png("a.png")]} onError={onError} />);
    pick(container, [png("b.png"), png("c.png"), png("d.png")]);
    expect(names()).toBe("a.png,b.png,c.png");
    expect(onError).toHaveBeenCalledWith("count", expect.objectContaining({ max: 3 }));
    // Full: no add button, no paste hint, the limit said instead.
    expect(screen.queryByRole("button", { name: /Add attachment/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/paste a screenshot/)).not.toBeInTheDocument();
    expect(screen.getByText("Up to 3 attachments — remove one to add another.")).toBeInTheDocument();
    expect(DEFAULT_MAX_ATTACHMENTS).toBe(5);
  });

  it("validates type and size per file and still adds the good ones", () => {
    const onError = vi.fn();
    const { container } = render(<Harness onError={onError} />);
    pick(container, [pdf("no.pdf"), png("big.png", 11 * 1024 * 1024), png("ok.png")]);
    expect(onError.mock.calls.map(([kind]) => kind)).toEqual(["type", "size"]);
    expect(names()).toBe("ok.png");
  });

  it("adds a paste rather than replacing, with a name that does not collide", () => {
    const { container } = render(<Harness initial={[png("photo.png")]} />);
    const root = container.firstElementChild!;
    fireEvent.paste(root, clipboard(png("image.png")));
    fireEvent.paste(root, clipboard(png("image.png"), png("image.png")));
    expect(names()).toBe("photo.png,pasted.png,pasted-2.png,pasted-3.png");
  });

  it("removes a chip, moves focus to the next chip, and to the add button after the last", () => {
    render(<Harness initial={[png("a.png"), png("b.png"), png("c.png")]} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove a.png" }));
    expect(names()).toBe("b.png,c.png");
    expect(screen.getByRole("button", { name: "Remove b.png" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Remove c.png" }));
    expect(names()).toBe("b.png");
    expect(screen.getByRole("button", { name: /Add attachment/ })).toHaveFocus();
  });

  it("revokes a chip's object URL when it is removed, and the rest on unmount", () => {
    const { unmount } = render(<Harness initial={[png("a.png"), png("b.png")]} />);
    const madeFor = (name: string) => {
      const calls = vi.mocked(URL.createObjectURL).mock.calls;
      const index = calls.findIndex(([file]) => (file as File).name === name);
      return vi.mocked(URL.createObjectURL).mock.results[index].value as string;
    };
    const a = madeFor("a.png");
    const b = madeFor("b.png");
    fireEvent.click(screen.getByRole("button", { name: "Remove a.png" }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(a);
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(b);
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(b);
  });

  it("keeps single mode as it was: one file, its buttons gone, a paste replacing it", () => {
    function Single() {
      const [file, setFile] = useState<File | null>(null);
      return (
        <>
          <FeedbackAttachmentField value={file} onChange={setFile} />
          <output data-testid="names">{file?.name ?? ""}</output>
        </>
      );
    }
    const { container } = render(<Single />);
    expect(fileInput(container)).not.toHaveAttribute("multiple");
    pick(container, [png("a.png"), png("b.png")]);
    expect(names()).toBe("a.png");
    expect(screen.queryByRole("button", { name: /Add attachment/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove attachment" })).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    fireEvent.paste(container.firstElementChild!, clipboard(png("image.png")));
    expect(names()).toBe("pasted.png");
  });
});

describe("FeedbackDialog attachments", () => {
  const base = {
    open: true,
    onClose: () => {},
    categories: [{ value: "bug", label: "Bug" }],
    category: "bug",
    onCategoryChange: () => {},
    requireBody: false,
  };
  const fill = () => fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Broken" } });
  const send = () => act(async () => fireEvent.click(screen.getByRole("button", { name: "Send" })));

  it("multiple: keeps the screenshot apart from the photos, and offers one capture", async () => {
    const onSubmit = vi.fn();
    const shot = png("screenshot.png");
    render(
      <FeedbackDialog
        {...base}
        attachments="multiple"
        onSubmit={onSubmit}
        onCaptureScreenshot={async () => shot}
      />,
    );
    expect(screen.getByText("Attachments")).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Capture screenshot/ })));
    expect(screen.getByRole("button", { name: "Remove Screenshot" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Capture screenshot/ })).not.toBeInTheDocument();

    fireEvent.paste(document, clipboard(png("image.png")));
    fireEvent.paste(document, clipboard(png("image.png")));
    fill();
    await send();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const data = onSubmit.mock.calls[0][0];
    expect(Object.keys(data).sort()).toEqual(["attachments", "body", "category", "screenshot", "title"]);
    expect(data.screenshot).toBe(shot);
    expect(data.attachments.map((f: File) => f.name)).toEqual(["pasted.png", "pasted-2.png"]);
  });

  it("multiple: maxAttachments caps the photos, not the screenshot", async () => {
    render(
      <FeedbackDialog
        {...base}
        attachments="multiple"
        maxAttachments={1}
        onSubmit={() => {}}
        onCaptureScreenshot={async () => png("screenshot.png")}
      />,
    );
    fireEvent.paste(document, clipboard(png("image.png")));
    expect(screen.queryByRole("button", { name: /Add attachment/ })).not.toBeInTheDocument();
    // Still capturable: the screenshot has its own slot.
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Capture screenshot/ })));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("single (the default): submits `attachment`, as before", async () => {
    const onSubmit = vi.fn();
    render(<FeedbackDialog {...base} onSubmit={onSubmit} />);
    expect(screen.getByText("Attachment")).toBeInTheDocument();
    fireEvent.paste(document, clipboard(png("image.png")));
    fill();
    await send();
    const data = onSubmit.mock.calls[0][0];
    expect(Object.keys(data).sort()).toEqual(["attachment", "body", "category", "title"]);
    expect(data.attachment.name).toBe("pasted.png");
  });
});

// Compile-time: the submission's type follows the mode, and an existing caller's
// one-file handler still fits the default.
export function typeChecks(single: (d: FeedbackSubmission) => void, many: (d: FeedbackMultipleSubmission) => void) {
  const base = { open: true, onClose: () => {}, categories: [], category: "", onCategoryChange: () => {} };
  return [
    <FeedbackDialog key="a" {...base} onSubmit={single} />,
    <FeedbackDialog key="b" {...base} attachments="multiple" onSubmit={many} />,
    // @ts-expect-error -- a one-file handler cannot take the multiple submission
    <FeedbackDialog key="c" {...base} attachments="multiple" onSubmit={single} />,
    // @ts-expect-error -- nor the other way round
    <FeedbackDialog key="d" {...base} onSubmit={many} />,
    // @ts-expect-error -- `max` belongs to multiple mode
    <FeedbackAttachmentField key="e" value={null} onChange={() => {}} max={2} />,
  ];
}
