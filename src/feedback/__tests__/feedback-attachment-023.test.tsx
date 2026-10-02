import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import { WriteLockProvider } from "../../components/write-lock";
import {
  FeedbackAttachmentField,
  type FeedbackAttachmentError,
  type FeedbackAttachmentErrorInfo,
  type FeedbackAttachmentFieldRefsProps,
  type FeedbackAttachmentFieldSingleProps,
  type FeedbackAttachmentRef,
} from "../feedback-attachment";

/**
 * keksdose G5a / G5b (0.23.0, the support chat's `AttachmentPicker`):
 *  - `onError` names the refused file and the limit (`FeedbackAttachmentErrorInfo`),
 *    in every mode, without moving `refs` mode's `error` out of the second place;
 *  - `disabled` holds the field while a send is in flight; `refs` mode, which commits,
 *    also takes `commit` / `disabledReason` from the write-lock family.
 */

const png = (name: string, size = 10) => new File(["x".repeat(size)], name, { type: "image/png" });
const svg = (name: string) => new File(["<svg/>"], name, { type: "image/svg+xml" });
const HUGE = 11 * 1024 * 1024;

const fileInput = (container: HTMLElement) => container.querySelector<HTMLInputElement>('input[type="file"]')!;
const pick = (container: HTMLElement, files: File[]) => fireEvent.change(fileInput(container), { target: { files } });
const clipboard = (...files: File[]) => ({
  clipboardData: { items: files.map((file) => ({ kind: "file", type: file.type, getAsFile: () => file })) },
});

beforeEach(() => {
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => "blob:x");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

function Multiple({
  initial = [],
  onError,
  disabled,
  max,
}: {
  initial?: File[];
  onError?: (kind: FeedbackAttachmentError, info: FeedbackAttachmentErrorInfo) => void;
  disabled?: boolean;
  max?: number;
}) {
  const [files, setFiles] = useState(initial);
  return (
    <>
      <FeedbackAttachmentField multiple value={files} onChange={setFiles} onError={onError} disabled={disabled} max={max} />
      <output data-testid="names">{files.map((f) => f.name).join(",")}</output>
    </>
  );
}

function Refs(props: Partial<FeedbackAttachmentFieldRefsProps> & { initial?: FeedbackAttachmentRef[] }) {
  const { initial = [], ...rest } = props;
  const [refs, setRefs] = useState(initial);
  return (
    <>
      <FeedbackAttachmentField
        onUpload={vi.fn(() => new Promise<FeedbackAttachmentRef>(() => {}))}
        {...rest}
        refs
        value={refs}
        onChange={setRefs}
      />
      <output data-testid="keys">{refs.map((r) => r.key).join(",")}</output>
    </>
  );
}

describe("G5a: onError names the file and the limit", () => {
  it("single: the refused file, the ceiling and a sentence that says both", () => {
    const onError = vi.fn();
    const { container } = render(<FeedbackAttachmentField value={null} onChange={() => {}} onError={onError} />);
    const huge = png("huge.png", HUGE);
    pick(container, [huge]);
    const [kind, info] = onError.mock.calls[0] as [string, FeedbackAttachmentErrorInfo];
    expect(kind).toBe("size");
    expect(info.file).toBe(huge);
    expect(info.files).toEqual([huge]);
    expect(info.maxBytes).toBe(10 * 1024 * 1024);
    expect(info.message).toBe("“huge.png” is larger than 10 MB");
    // One file by definition: no `max`, and no `error` outside `refs` mode.
    expect(info).not.toHaveProperty("max");
    expect(info).not.toHaveProperty("error");
  });

  it("single: a type refusal names what IS accepted, as FileButton's does", () => {
    const onError = vi.fn();
    const { container } = render(
      <FeedbackAttachmentField value={null} onChange={() => {}} onError={onError} accept={["image/png", "application/pdf"]} />,
    );
    pick(container, [svg("logo.svg")]);
    expect(onError).toHaveBeenCalledWith(
      "type",
      expect.objectContaining({ accept: ["image/png", "application/pdf"], message: "Only image/png, application/pdf files" }),
    );
  });

  it("single: a refused paste is named as the field names a paste", () => {
    const onError = vi.fn();
    const { container } = render(<FeedbackAttachmentField value={null} onChange={() => {}} onError={onError} />);
    fireEvent.paste(container.firstElementChild!, clipboard(png("image.png", HUGE)));
    expect(onError.mock.calls[0][1].file.name).toBe("pasted.png");
    expect(onError.mock.calls[0][1].message).toBe("“pasted.png” is larger than 10 MB");
  });

  it("multiple: per file for type and size; once per pick for count, with the whole surplus", () => {
    const onError = vi.fn();
    const { container } = render(<Multiple max={2} onError={onError} />);
    const [a, b, c, d] = [png("a.png"), png("b.png"), png("c.png"), png("d.png")];
    pick(container, [svg("x.svg"), a, b, c, d]);
    expect(screen.getByTestId("names")).toHaveTextContent("a.png,b.png");
    expect(onError.mock.calls.map(([kind]) => kind)).toEqual(["type", "count"]);
    const count = onError.mock.calls[1][1] as FeedbackAttachmentErrorInfo;
    expect(count.files).toEqual([c, d]);
    expect(count.file).toBe(c);
    expect(count.max).toBe(2);
    expect(count.message).toBe("2 files were not added");
  });

  it("multiple: one file over the limit is named", () => {
    const onError = vi.fn();
    const { container } = render(<Multiple max={2} initial={[png("a.png")]} onError={onError} />);
    pick(container, [png("b.png"), png("c.png")]);
    expect(onError).toHaveBeenCalledWith(
      "count",
      expect.objectContaining({ message: "“c.png” was not added: at most 2 files", max: 2 }),
    );
  });

  it("refs: `error` keeps the second place (undefined but for an upload); the info comes third", async () => {
    let fail!: (error: unknown) => void;
    const onUpload = vi.fn(
      () =>
        new Promise<FeedbackAttachmentRef>((_resolve, reject) => {
          fail = reject;
        }),
    );
    const onError = vi.fn();
    const { container } = render(<Refs onUpload={onUpload} onError={onError} max={4} />);
    pick(container, [png("huge.png", HUGE)]);
    expect(onError).toHaveBeenLastCalledWith(
      "size",
      undefined,
      expect.objectContaining({ message: "“huge.png” is larger than 10 MB", max: 4 }),
    );
    const shot = png("shot.png");
    pick(container, [shot]);
    const failure = new Error("413");
    await act(async () => {
      fail(failure);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(onError).toHaveBeenLastCalledWith(
      "upload",
      failure,
      expect.objectContaining({ file: shot, error: failure, message: "“shot.png” could not be uploaded" }),
    );
  });

  it("the sentences are the provider's `filePicker` ones, and `attachmentUploadFailed` the field's", async () => {
    const onError = vi.fn();
    const { container } = render(
      <UiKitProvider
        labels={{
          filePicker: { rejectedSize: (name, max) => `„${name}“ ist größer als ${max}` },
          feedbackAttachment: { attachmentUploadFailed: (name) => `„${name}“ konnte nicht hochgeladen werden` },
        }}
      >
        <Refs onUpload={() => Promise.reject(new Error("500"))} onError={onError} />
      </UiKitProvider>,
    );
    pick(container, [png("huge.png", HUGE), png("ok.png")]);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(onError.mock.calls.map((call) => (call[2] as FeedbackAttachmentErrorInfo).message)).toEqual([
      "„huge.png“ ist größer als 10 MB",
      "„ok.png“ konnte nicht hochgeladen werden",
    ]);
  });

  it("a 0.22 handler still fits every mode", () => {
    // Compile-time: these are the shapes apps wrote against 0.22.
    const single: FeedbackAttachmentFieldSingleProps["onError"] = (kind: "type" | "size") => void kind;
    const refs: FeedbackAttachmentFieldRefsProps["onError"] = (kind, error?: unknown) => void [kind, error];
    expect(single).toBeTypeOf("function");
    expect(refs).toBeTypeOf("function");
  });
});

describe("G5b: disabled holds the field while a send is in flight", () => {
  it("single: no add, no capture, no remove, no file input — and the chosen file stays", () => {
    const onChange = vi.fn();
    const { rerender, container } = render(
      <FeedbackAttachmentField value={null} onChange={onChange} onCaptureScreenshot={async () => null} disabled />,
    );
    expect(screen.getByRole("button", { name: /Attach image/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Capture screenshot/ })).toBeDisabled();
    expect(fileInput(container)).toBeDisabled();
    rerender(<FeedbackAttachmentField value={png("shot.png")} onChange={onChange} disabled />);
    expect(screen.getByText("shot.png")).toBeInTheDocument();
    const remove = screen.getByRole("button", { name: "Remove attachment" });
    expect(remove).toBeDisabled();
    fireEvent.click(remove);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("a paste is left alone — not taken, not swallowed", () => {
    const onChange = vi.fn();
    const { container } = render(<FeedbackAttachmentField value={null} onChange={onChange} disabled />);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.assign(event, clipboard(png("image.png")));
    container.firstElementChild!.dispatchEvent(event);
    expect(onChange).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("multiple: the chips stay, every remove and the add button are disabled", () => {
    const { container } = render(<Multiple initial={[png("a.png"), png("b.png")]} disabled />);
    const list = screen.getByRole("list", { name: "Attachments" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    for (const name of ["a.png", "b.png"]) {
      expect(screen.getByRole("button", { name: `Remove ${name}` })).toBeDisabled();
    }
    expect(screen.getByRole("button", { name: /Attach image/ })).toBeDisabled();
    fireEvent.paste(container.firstElementChild!, clipboard(png("image.png")));
    expect(screen.getByTestId("names")).toHaveTextContent("a.png,b.png");
  });

  it("refs: nothing is uploaded or removed while disabled", () => {
    const onUpload = vi.fn(() => new Promise<FeedbackAttachmentRef>(() => {}));
    const onRemove = vi.fn();
    const { container } = render(
      <Refs initial={[{ key: "k1", name: "one.png" }]} onUpload={onUpload} onRemove={onRemove} disabled />,
    );
    fireEvent.paste(container.firstElementChild!, clipboard(png("image.png")));
    expect(onUpload).not.toHaveBeenCalled();
    expect(fileInput(container)).toBeDisabled();
    const remove = screen.getByRole("button", { name: "Remove one.png" });
    expect(remove).toBeDisabled();
    fireEvent.click(remove);
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByTestId("keys")).toHaveTextContent("k1");
  });

  it("the default stays open: no `disabled`, everything works as in 0.22", () => {
    render(<Multiple initial={[png("a.png")]} />);
    expect(screen.getByRole("button", { name: "Remove a.png" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Attach image/ })).toBeEnabled();
  });
});

describe("refs mode commits: commit / disabledReason", () => {
  it("disabledReason: focusable aria-disabled controls that say why, and nothing gets through", () => {
    const onUpload = vi.fn(() => new Promise<FeedbackAttachmentRef>(() => {}));
    const onRemove = vi.fn();
    const { container } = render(
      <Refs
        initial={[{ key: "k1", name: "one.png" }]}
        onUpload={onUpload}
        onRemove={onRemove}
        onCaptureScreenshot={async () => png("capture.png")}
        disabledReason="This thread is closed."
      />,
    );
    const add = screen.getByRole("button", { name: /Attach image/ });
    const capture = screen.getByRole("button", { name: /Capture screenshot/ });
    const remove = screen.getByRole("button", { name: "Remove one.png" });
    for (const button of [add, capture, remove]) {
      expect(button).not.toBeDisabled();
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).toHaveAccessibleDescription("This thread is closed.");
    }
    fireEvent.click(remove);
    expect(onRemove).not.toHaveBeenCalled();
    fireEvent.click(capture);
    fireEvent.paste(container.firstElementChild!, clipboard(png("image.png")));
    expect(onUpload).not.toHaveBeenCalled();
    expect(fileInput(container)).toBeDisabled();
    // The reason stands where the paste hint was.
    expect(screen.queryByText(/paste a screenshot/)).not.toBeInTheDocument();
    expect(container.querySelector("[data-attachment-reason]")).toHaveTextContent("This thread is closed.");
  });

  it("commit: under a locked WriteLockProvider the lock's reason wins", () => {
    render(
      <WriteLockProvider locked reason="Read-only demo — saving is disabled.">
        <Refs commit disabledReason="Own reason" />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("button", { name: /Attach image/ })).toHaveAccessibleDescription(
      "Read-only demo — saving is disabled.",
    );
  });

  it("commit: no effect without a lock, and no lock without `commit`", () => {
    const { unmount } = render(
      <WriteLockProvider locked={false}>
        <Refs commit />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("button", { name: /Attach image/ })).not.toHaveAttribute("aria-disabled", "true");
    unmount();
    render(
      <WriteLockProvider locked>
        <Refs />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("button", { name: /Attach image/ })).not.toHaveAttribute("aria-disabled", "true");
  });
});
