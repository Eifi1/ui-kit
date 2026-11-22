import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { FeedbackAttachmentField, type FeedbackAttachmentRef } from "../feedback-attachment";
import { stubPhone } from "../../test/viewport";

/**
 * 0.66: `picker="sheet"` — the field's add and capture buttons as one AttachButton (the
 * AttachButton draft of 2026-11-16, its §4), opt-in until 0.67. The phone is stubbed, so
 * the trigger opens the sheet of tiles; a file dialog is a spied `<input>` click and a
 * fired `change`.
 */

beforeAll(() => {
  // The field previews a picked image through an object URL; jsdom has none.
  URL.createObjectURL = () => "blob:preview";
  URL.revokeObjectURL = () => {};
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function spyDialogs() {
  const opened: HTMLInputElement[] = [];
  vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (this: HTMLInputElement) {
    opened.push(this);
  });
  return opened;
}

function pickInto(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, "files", { configurable: true, value: files });
  fireEvent.change(input);
}

const png = (name = "shot.png", size = 10) => new File(["x".repeat(size)], name, { type: "image/png" });
const sheet = () => screen.queryByRole("dialog", { name: "Add attachment" });
const tileNames = () => Array.from(sheet()!.querySelectorAll("[data-attach-tile]"), (t) => t.textContent);

describe('FeedbackAttachmentField picker="sheet"', () => {
  it("is opt-in: without it the field keeps its add and capture buttons", () => {
    render(<FeedbackAttachmentField value={null} onChange={vi.fn()} onCaptureScreenshot={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Add attachment" })).not.toHaveAttribute("aria-haspopup");
    expect(screen.getByRole("button", { name: "Capture screenshot" })).toBeInTheDocument();
  });

  it("one trigger under the add button's word, a Screenshot tile beside the pickers", async () => {
    stubPhone({ coarse: true });
    const onChange = vi.fn();
    render(<FeedbackAttachmentField picker="sheet" value={null} onChange={onChange} onCaptureScreenshot={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Capture screenshot" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add attachment" }));
    await act(async () => {});
    expect(tileNames()).toEqual(["Camera", "Photos", "Screenshot"]);
  });

  it("a pick lands in the field; a refusal is the field's onError, with its sentence", () => {
    stubPhone({ coarse: true });
    const opened = spyDialogs();
    const onChange = vi.fn();
    const onError = vi.fn();
    render(
      <FeedbackAttachmentField
        picker="sheet"
        sources={["photos"]}
        value={null}
        onChange={onChange}
        onError={onError}
        maxBytes={100}
      />,
    );
    // One way in: the trigger opens the gallery directly.
    fireEvent.click(screen.getByRole("button", { name: "Add attachment" }));
    pickInto(opened[0], [png("big.png", 500)]);
    expect(onChange).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      "size",
      expect.objectContaining({ message: expect.stringContaining("big.png") }),
    );
    pickInto(opened[0], [png("ok.png")]);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: "ok.png" }));
  });

  it("multiple mode: the screenshot goes to its slot, the sheet closed first, and the tile goes once it is filled", async () => {
    stubPhone({ coarse: true });
    const shot = png("screenshot.png");
    let sheetAtCapture: Element | null | undefined;
    const capture = vi.fn(async () => {
      sheetAtCapture = document.querySelector("[data-attach-sheet]");
      return shot;
    });
    const onScreenshotChange = vi.fn();
    const field = (screenshot: File | null) => (
      <FeedbackAttachmentField
        picker="sheet"
        multiple
        value={[]}
        onChange={vi.fn()}
        screenshot={screenshot}
        onScreenshotChange={onScreenshotChange}
        onCaptureScreenshot={capture}
      />
    );
    const { rerender } = render(field(null));
    fireEvent.click(screen.getByRole("button", { name: "Add attachment" }));
    await act(async () => fireEvent.click(within(sheet()!).getByRole("button", { name: "Screenshot" })));
    expect(sheetAtCapture).toBeNull();
    expect(onScreenshotChange).toHaveBeenCalledWith(shot);
    rerender(field(shot));
    fireEvent.click(screen.getByRole("button", { name: "Add attachment" }));
    expect(tileNames()).not.toContain("Screenshot");
  });

  it("refs mode with support's sources: Photos and Files, no Camera; a pick uploads", async () => {
    stubPhone({ coarse: true });
    const opened = spyDialogs();
    const onUpload = vi.fn(async (file: File): Promise<FeedbackAttachmentRef> => ({ key: file.name, name: file.name }));
    const onChange = vi.fn();
    render(
      <FeedbackAttachmentField
        refs
        picker="sheet"
        sources={["photos", "files"]}
        accept={["image/png", "application/pdf"]}
        value={[]}
        onChange={onChange}
        onUpload={onUpload}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add attachment" }));
    expect(tileNames()).toEqual(["Photos", "Files"]);
    fireEvent.click(within(sheet()!).getByRole("button", { name: "Files" }));
    expect(opened[0]).toHaveAttribute("accept", "application/pdf");
    await act(async () => pickInto(opened[0], [new File(["%PDF"], "log.pdf", { type: "application/pdf" })]));
    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([{ key: "log.pdf", name: "log.pdf" }]);
  });

  it("refs mode under a reason: the trigger says why and opens nothing", () => {
    stubPhone({ coarse: true });
    const opened = spyDialogs();
    render(
      <FeedbackAttachmentField
        refs
        picker="sheet"
        value={[]}
        onChange={vi.fn()}
        onUpload={vi.fn()}
        disabledReason="This thread is closed."
      />,
    );
    const trigger = screen.getByRole("button", { name: "Add attachment" });
    expect(trigger).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(trigger);
    expect(sheet()).toBeNull();
    expect(opened).toHaveLength(0);
  });
});
