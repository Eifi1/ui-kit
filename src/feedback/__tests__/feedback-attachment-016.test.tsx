import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UiKitProvider } from "../../i18n/kit-labels";
import { FeedbackAttachmentField } from "../feedback-attachment";
import { FeedbackDialog } from "../feedback-dialog";

/**
 * 0.16.0 (keksdose): two adds in one tick both land; the screenshot chip is titled
 * "Screenshot", not its file name; and the multiple dialog's heading is ONE key,
 * `attachmentList`, with `feedbackDialog.attachments` kept as a deprecated alias.
 */

const png = (name: string) => new File(["x"], name, { type: "image/png" });

beforeEach(() => {
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => "blob:x");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

/** A native paste event, as the document listener receives it. */
function nativePaste(...files: File[]) {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    value: { items: files.map((file) => ({ kind: "file", type: file.type, getAsFile: () => file })) },
  });
  return event;
}

function Harness({ screenshot }: { screenshot?: File }) {
  const [files, setFiles] = useState<File[]>([]);
  const [shot, setShot] = useState<File | null>(screenshot ?? null);
  return (
    <>
      <FeedbackAttachmentField
        multiple
        documentPaste
        value={files}
        onChange={setFiles}
        screenshot={shot}
        onScreenshotChange={setShot}
      />
      <output data-testid="names">{files.map((f) => f.name).join(",")}</output>
    </>
  );
}
const names = () => screen.getByTestId("names").textContent;

describe("FeedbackAttachmentField multiple: adds in one tick", () => {
  it("keeps both of two pastes delivered before a re-render", () => {
    render(<Harness />);
    // One act: neither update is committed before the second paste is handled, so
    // the second add sees the first only through the field's own record of it.
    act(() => {
      document.dispatchEvent(nativePaste(png("image.png")));
      document.dispatchEvent(nativePaste(png("image.png")));
    });
    expect(names()).toBe("pasted.png,pasted-2.png");
  });

  it("keeps a paste and a pick made in the same tick", () => {
    const { container } = render(<Harness />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    act(() => {
      document.dispatchEvent(nativePaste(png("image.png")));
      Object.defineProperty(input, "files", { value: [png("photo.png")], configurable: true });
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(names()).toBe("pasted.png,photo.png");
  });

  it("follows the parent once it re-renders without taking a change", () => {
    const onChange = vi.fn();
    const field = () => <FeedbackAttachmentField multiple documentPaste value={[]} onChange={onChange} />;
    const { rerender } = render(field());
    fireEvent(document, nativePaste(png("a.png")));
    // The parent refused it — rendered again with the list it had.
    rerender(field());
    fireEvent(document, nativePaste(png("b.png")));
    expect(onChange.mock.calls.map(([files]) => (files as File[]).map((f) => f.name))).toEqual([
      ["pasted.png"],
      ["pasted.png"],
    ]);
  });
});

describe("FeedbackAttachmentField multiple: screenshot chip", () => {
  it('is titled "Screenshot", with the file name as its second line', () => {
    render(<Harness screenshot={png("screenshot.webp")} />);
    const [chip] = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(chip.firstElementChild?.nextElementSibling?.firstElementChild).toHaveTextContent(/^Screenshot$/);
    expect(chip).toHaveTextContent("screenshot.webp");
    expect(screen.getByRole("button", { name: "Remove Screenshot" })).toBeInTheDocument();
  });

  it("takes attachmentScreenshot from the provider", () => {
    render(
      <UiKitProvider labels={{ feedbackAttachment: { attachmentScreenshot: "Bildschirmfoto" } }}>
        <Harness screenshot={png("screenshot.webp")} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Remove Bildschirmfoto" })).toBeInTheDocument();
  });
});

describe("FeedbackDialog multiple: one key for the heading", () => {
  const base = {
    open: true,
    onClose: () => {},
    categories: [{ value: "bug", label: "Bug" }],
    category: "bug",
    onCategoryChange: () => {},
    attachments: "multiple" as const,
    onSubmit: () => {},
  };
  const withChip = async () => {
    fireEvent(document, nativePaste(png("image.png")));
  };

  it("uses feedbackAttachment.attachmentList for the heading and the list's name", async () => {
    render(
      <UiKitProvider labels={{ feedbackAttachment: { attachmentList: "Belege" } }}>
        <FeedbackDialog {...base} />
      </UiKitProvider>,
    );
    await withChip();
    expect(screen.getByText("Belege")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Belege" })).toBeInTheDocument();
  });

  it("still honours the deprecated attachments key, below an attachmentList prop", async () => {
    const { rerender } = render(<FeedbackDialog {...base} labels={{ attachments: "Evidence" }} />);
    await withChip();
    expect(screen.getByText("Evidence")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Evidence" })).toBeInTheDocument();
    rerender(<FeedbackDialog {...base} labels={{ attachments: "Evidence", attachmentList: "Files" }} />);
    expect(screen.getByRole("list", { name: "Files" })).toBeInTheDocument();
    expect(screen.queryByText("Evidence")).not.toBeInTheDocument();
  });

  it("defaults to English", async () => {
    render(<FeedbackDialog {...base} />);
    await withChip();
    expect(screen.getByRole("list", { name: "Attachments" })).toBeInTheDocument();
    expect(screen.getByText("Attachments")).toBeInTheDocument();
  });
});
