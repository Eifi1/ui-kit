import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  FeedbackAttachmentField,
  type FeedbackAttachmentRef,
  type FeedbackAttachmentRefsError,
} from "../feedback-attachment";

/**
 * keksdose K16 (inputs audit 2026-10-02, F1 — the support chat's `AttachmentPicker`):
 * `<FeedbackAttachmentField refs>` uploads each file the moment it is chosen and holds
 * the refs the uploads answer with, `{ key, name }`, removed by key.
 */

const png = (name: string, size = 10) => new File(["x".repeat(size)], name, { type: "image/png" });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function Harness({
  initial = [],
  onUpload,
  onRemove,
  onError,
  onUploadingChange,
  max,
}: {
  initial?: FeedbackAttachmentRef[];
  onUpload: (file: File) => Promise<FeedbackAttachmentRef>;
  onRemove?: (key: string) => void;
  onError?: (kind: FeedbackAttachmentRefsError, error?: unknown) => void;
  onUploadingChange?: (uploading: boolean) => void;
  max?: number;
}) {
  const [refs, setRefs] = useState(initial);
  return (
    <>
      <FeedbackAttachmentField
        refs
        value={refs}
        onChange={setRefs}
        onUpload={onUpload}
        onRemove={onRemove}
        onError={onError}
        onUploadingChange={onUploadingChange}
        max={max}
      />
      <output data-testid="keys">{refs.map((r) => r.key).join(",")}</output>
    </>
  );
}

const keys = () => screen.getByTestId("keys").textContent;
const fileInput = (container: HTMLElement) => container.querySelector<HTMLInputElement>('input[type="file"]')!;
const pick = (container: HTMLElement, files: File[]) => fireEvent.change(fileInput(container), { target: { files } });
const uploading = () => document.querySelectorAll("[data-attachment-uploading]");
async function settle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("FeedbackAttachmentField refs", () => {
  it("uploads on pick, shows the upload, then the ref it answered with", async () => {
    const answer = deferred<FeedbackAttachmentRef>();
    const onUpload = vi.fn(() => answer.promise);
    const onUploadingChange = vi.fn();
    const { container } = render(<Harness onUpload={onUpload} onUploadingChange={onUploadingChange} />);

    const file = png("receipt.png", 2048);
    pick(container, [file]);
    expect(onUpload).toHaveBeenCalledWith(file);
    expect(onUploadingChange).toHaveBeenLastCalledWith(true);
    expect(uploading()).toHaveLength(1);
    expect(uploading()[0]).toHaveAttribute("aria-busy", "true");
    expect(uploading()[0]).toHaveTextContent("receipt.png");
    expect(uploading()[0]).toHaveTextContent("Uploading…");
    // Not in `value` until it lands.
    expect(keys()).toBe("");

    answer.resolve({ key: "s3/abc", name: "receipt.png", size: 2048, type: "image/png" });
    await settle();
    expect(uploading()).toHaveLength(0);
    expect(keys()).toBe("s3/abc");
    expect(onUploadingChange).toHaveBeenLastCalledWith(false);
    const list = screen.getByRole("list", { name: "Attachments" });
    expect(within(list).getByText("receipt.png")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove receipt.png" })).toBeInTheDocument();
  });

  it("drops a rejected upload and reports it with the error", async () => {
    const answer = deferred<FeedbackAttachmentRef>();
    const onError = vi.fn();
    const { container } = render(<Harness onUpload={() => answer.promise} onError={onError} />);
    pick(container, [png("big.png")]);
    const failure = new Error("413");
    answer.reject(failure);
    await settle();
    expect(uploading()).toHaveLength(0);
    expect(keys()).toBe("");
    expect(onError).toHaveBeenCalledWith("upload", failure, expect.objectContaining({ error: failure }));
  });

  it("validates before uploading, as the File modes do", () => {
    const onUpload = vi.fn();
    const onError = vi.fn();
    const { container } = render(<Harness onUpload={onUpload} onError={onError} />);
    pick(container, [new File(["<svg/>"], "x.svg", { type: "image/svg+xml" })]);
    pick(container, [png("huge.png", 11 * 1024 * 1024)]);
    expect(onUpload).not.toHaveBeenCalled();
    expect(onError.mock.calls.map(([kind, error]) => [kind, error])).toEqual([
      ["type", undefined],
      ["size", undefined],
    ]);
  });

  it("counts uploads in flight against max", async () => {
    const onUpload = vi.fn(() => new Promise<FeedbackAttachmentRef>(() => {}));
    const onError = vi.fn();
    const { container } = render(
      <Harness initial={[{ key: "k1", name: "one.png" }]} onUpload={onUpload} onError={onError} max={3} />,
    );
    pick(container, [png("a.png"), png("b.png"), png("c.png")]);
    expect(onUpload).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith("count", undefined, expect.objectContaining({ max: 3 }));
    // Full with two uploads running: the add button gives way to the limit line.
    expect(screen.queryByRole("button", { name: /Attach image/ })).not.toBeInTheDocument();
    expect(screen.getByText("Up to 3 attachments — remove one to add another.")).toBeInTheDocument();
  });

  it("keeps both of two uploads that land in the same tick", async () => {
    const a = deferred<FeedbackAttachmentRef>();
    const b = deferred<FeedbackAttachmentRef>();
    const answers = [a, b];
    const { container } = render(<Harness onUpload={() => answers.shift()!.promise} />);
    pick(container, [png("a.png"), png("b.png")]);
    // In the order they finish.
    b.resolve({ key: "kb", name: "b.png" });
    a.resolve({ key: "ka", name: "a.png" });
    await settle();
    expect(keys()).toBe("kb,ka");
  });

  it("removes by key and tells the host which", () => {
    const onRemove = vi.fn();
    render(
      <Harness
        initial={[
          { key: "k1", name: "same.png" },
          { key: "k2", name: "same.png" },
        ]}
        onUpload={vi.fn()}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Remove same.png" })[1]);
    expect(keys()).toBe("k1");
    expect(onRemove).toHaveBeenCalledWith("k2");
  });

  it("names pasted images apart before uploading them", () => {
    const onUpload = vi.fn((_file: File) => new Promise<FeedbackAttachmentRef>(() => {}));
    const { container } = render(<Harness onUpload={onUpload} />);
    const root = container.querySelector<HTMLElement>("div")!;
    const clip = (file: File) => ({
      clipboardData: { items: [{ kind: "file", type: file.type, getAsFile: () => file }] },
    });
    fireEvent.paste(root, clip(png("image.png")));
    fireEvent.paste(root, clip(png("image.png")));
    expect(onUpload.mock.calls.map(([f]) => f.name)).toEqual(["pasted.png", "pasted-2.png"]);
  });

  it("shows an uploaded ref's size when it has one, and a file glyph for a non-image", () => {
    render(
      <Harness
        initial={[
          { key: "k1", name: "log.txt", size: 1536, type: "text/plain" },
          { key: "k2", name: "shot.png" },
        ]}
        onUpload={vi.fn()}
      />,
    );
    const items = within(screen.getByRole("list", { name: "Attachments" })).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent(/1[.,]5 kB/i);
    expect(items[1].textContent).toBe("shot.png");
  });
});
