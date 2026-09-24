import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FileButton, matchesAccept, useFilePicker } from "../file-button";
import type { FileRejection } from "../file-button";
import { UiKitProvider } from "../../i18n/kit-labels";

const pdf = (name = "lease.pdf", bytes = 10) =>
  new File([new Uint8Array(bytes)], name, { type: "application/pdf" });
const png = (name = "plan.png") => new File(["x"], name, { type: "image/png" });

/** The hidden input FileButton renders next to its button. */
function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("no file input");
  return input;
}

/** A pick, as the browser delivers it: `files` set, then `change`. */
function pick(input: HTMLInputElement, ...files: File[]) {
  fireEvent.change(input, { target: { files } });
}

describe("matchesAccept", () => {
  it("reads extensions, MIME families and exact types, case-insensitively", () => {
    expect(matchesAccept(pdf("A.PDF"), ".pdf")).toBe(true);
    expect(matchesAccept(png(), "image/*")).toBe(true);
    expect(matchesAccept(png(), "application/pdf")).toBe(false);
    expect(matchesAccept(pdf(), "image/*, application/pdf")).toBe(true);
    expect(matchesAccept(png(), undefined)).toBe(true);
    expect(matchesAccept(png(), "")).toBe(true);
  });

  it("matches a file the OS gave no type only by its extension", () => {
    const step = new File(["x"], "part.STEP", { type: "" });
    expect(matchesAccept(step, ".stp,.step,model/step")).toBe(true);
    expect(matchesAccept(step, "model/step")).toBe(false);
  });
});

describe("FileButton", () => {
  it("is a button named by its content that never submits a form", () => {
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <FileButton onFiles={vi.fn()}>Upload</FileButton>
      </form>,
    );
    const button = screen.getByRole("button", { name: "Upload" });
    expect(button).toHaveAttribute("type", "button");
    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("opens the hidden input on click, and forwards its ref and rest props", () => {
    const ref = createRef<HTMLButtonElement>();
    const { container } = render(
      <FileButton ref={ref} data-tour="upload" variant="secondary" onFiles={vi.fn()}>
        Upload
      </FileButton>,
    );
    const click = vi.spyOn(fileInput(container), "click");
    expect(ref.current).toBe(screen.getByRole("button"));
    expect(ref.current).toHaveAttribute("data-tour", "upload");
    fireEvent.click(ref.current!);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("passes accept, multiple and capture to the input, which stays out of the tab order", () => {
    const { container } = render(
      <FileButton accept="image/*" multiple capture="environment" onFiles={vi.fn()}>
        Photo
      </FileButton>,
    );
    const input = fileInput(container);
    expect(input).toHaveAttribute("accept", "image/*");
    expect(input).toHaveAttribute("capture", "environment");
    expect(input.multiple).toBe(true);
    expect(input).toHaveAttribute("tabindex", "-1");
  });

  it("delivers the picked file and resets the input so the same file can be picked again", () => {
    const onFiles = vi.fn();
    const { container } = render(<FileButton onFiles={onFiles}>Upload</FileButton>);
    const input = fileInput(container);
    const setValue = vi.spyOn(input, "value", "set");
    const file = pdf();
    pick(input, file);
    expect(onFiles).toHaveBeenCalledWith([file]);
    expect(setValue).toHaveBeenCalledWith("");
    pick(input, file);
    expect(onFiles).toHaveBeenCalledTimes(2);
  });

  it("keeps only the first file without `multiple`, all of them with it", () => {
    const one = vi.fn();
    const many = vi.fn();
    const a = pdf("a.pdf");
    const b = pdf("b.pdf");
    const { container, rerender } = render(<FileButton onFiles={one}>Upload</FileButton>);
    pick(fileInput(container), a, b);
    expect(one).toHaveBeenCalledWith([a]);
    rerender(
      <FileButton multiple onFiles={many}>
        Upload
      </FileButton>,
    );
    pick(fileInput(container), a, b);
    expect(many).toHaveBeenCalledWith([a, b]);
  });

  it("screens type, size, count and isValid, reporting through onReject — not a toast", () => {
    const onFiles = vi.fn();
    const onReject = vi.fn<(r: FileRejection[]) => void>();
    const { container } = render(
      <FileButton
        multiple
        accept=".pdf"
        maxSize={100}
        maxFiles={1}
        isValid={(f) => !f.name.startsWith("bad")}
        invalidMessage="Not a lease"
        onFiles={onFiles}
        onReject={onReject}
      >
        Upload
      </FileButton>,
    );
    const good = pdf("good.pdf");
    const second = pdf("second.pdf");
    pick(fileInput(container), png(), pdf("big.pdf", 500), pdf("bad.pdf"), good, second);
    expect(onFiles).toHaveBeenCalledWith([good]);
    const rejections = onReject.mock.calls[0][0];
    expect(rejections.map((r) => r.reason)).toEqual(["type", "size", "invalid", "count"]);
    expect(rejections[0].message).toBe("“plan.png” is not a supported file type");
    expect(rejections[1].message).toMatch(/^“big\.pdf” is larger than /);
    expect(rejections[2].message).toBe("Not a lease");
    expect(rejections[3].message).toBe("“second.pdf” was not added: at most 1 file");
  });

  it("does not call onFiles when nothing passed", () => {
    const onFiles = vi.fn();
    const { container } = render(
      <FileButton accept=".pdf" onFiles={onFiles} onReject={vi.fn()}>
        Upload
      </FileButton>,
    );
    pick(fileInput(container), png());
    expect(onFiles).not.toHaveBeenCalled();
  });

  it("speaks a refusal through an assertive live region, in the provider's language", async () => {
    const { container } = render(
      <UiKitProvider labels={{ filePicker: { rejectedType: (n) => `„${n}“ wird nicht unterstützt` } }}>
        <FileButton accept=".pdf" onFiles={vi.fn()}>
          Hochladen
        </FileButton>
      </UiKitProvider>,
    );
    pick(fileInput(container), png());
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("„plan.png“ wird nicht unterstützt"));
  });

  it("summarises several refusals in one sentence", async () => {
    const { container } = render(
      <FileButton multiple accept=".pdf" onFiles={vi.fn()}>
        Upload
      </FileButton>,
    );
    pick(fileInput(container), png("a.png"), png("b.png"));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("2 files were not added"));
  });

  it("is disabled, busy and inert while pending", () => {
    const onFiles = vi.fn();
    const { container } = render(
      <FileButton pending onFiles={onFiles}>
        Upload
      </FileButton>,
    );
    const button = screen.getByRole("button", { name: "Upload" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    pick(fileInput(container), pdf());
    expect(onFiles).not.toHaveBeenCalled();
  });

  it("lets a caller's onClick cancel the picker", () => {
    const { container } = render(
      <FileButton onFiles={vi.fn()} onClick={(e) => e.preventDefault()}>
        Upload
      </FileButton>,
    );
    const click = vi.spyOn(fileInput(container), "click");
    fireEvent.click(screen.getByRole("button"));
    expect(click).not.toHaveBeenCalled();
  });

  describe("droppable", () => {
    const dt = (files: File[]) => ({ dataTransfer: { files, types: ["Files"], dropEffect: "none" } });

    it("takes a file dropped on the button, screened like a pick", () => {
      const onFiles = vi.fn();
      const onReject = vi.fn();
      render(
        <FileButton droppable accept=".csv" onFiles={onFiles} onReject={onReject}>
          Choose file
        </FileButton>,
      );
      const button = screen.getByRole("button");
      const csv = new File(["a;b"], "cols.csv", { type: "text/csv" });
      fireEvent.dragEnter(button, dt([csv]));
      expect(button).toHaveAttribute("data-drag-over", "true");
      fireEvent.drop(button, dt([csv]));
      expect(button).not.toHaveAttribute("data-drag-over");
      expect(onFiles).toHaveBeenCalledWith([csv]);
      fireEvent.drop(button, dt([png()]));
      expect(onReject).toHaveBeenCalledTimes(1);
    });

    it("ignores drops unless asked to", () => {
      const onFiles = vi.fn();
      render(<FileButton onFiles={onFiles}>Choose file</FileButton>);
      fireEvent.drop(screen.getByRole("button"), dt([pdf()]));
      expect(onFiles).not.toHaveBeenCalled();
    });
  });
});

describe("useFilePicker", () => {
  function CardWithAdd({ onFiles }: { onFiles: (f: File[]) => void }) {
    const picker = useFilePicker({ accept: ".pdf", onFiles });
    return (
      <div>
        {picker.element}
        <button type="button" onClick={picker.open}>
          Add document
        </button>
      </div>
    );
  }

  it("opens from someone else's control and delivers through the same screen", () => {
    const onFiles = vi.fn();
    const { container } = render(<CardWithAdd onFiles={onFiles} />);
    const input = fileInput(container);
    const click = vi.spyOn(input, "click");
    fireEvent.click(screen.getByRole("button", { name: "Add document" }));
    expect(click).toHaveBeenCalledTimes(1);
    const file = pdf();
    act(() => pick(input, file));
    expect(onFiles).toHaveBeenCalledWith([file]);
  });
});
