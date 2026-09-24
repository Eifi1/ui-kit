import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FileDropzone } from "../file-dropzone";
import type { FileDropzoneProps } from "../file-dropzone";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

/**
 * FileDropzone's 0.6 additions (kastlan's items a–d): the reset after a pick, a
 * multiple mode, a remove button inside the zone, optional validation, and a refusal
 * path that no longer has to be a toast. The 0.5 contract — the toast by default,
 * `onInvalid` switching it off — is pinned in `optional-peer-imports.test.tsx`.
 */

const pdf = (name = "lease.pdf", bytes = 10) =>
  new File([new Uint8Array(bytes)], name, { type: "application/pdf" });
const png = (name = "plan.png") => new File(["x"], name, { type: "image/png" });

const LABELS = {
  dropLabel: "Drop a document",
  browseLabel: "Browse",
  emptyLabel: "Nothing chosen",
  hint: "PDF only",
};

function zone(props: Partial<FileDropzoneProps> = {}) {
  return render(<FileDropzone accept=".pdf" {...LABELS} {...props} />);
}

function input(container: HTMLElement): HTMLInputElement {
  return container.querySelector<HTMLInputElement>('input[type="file"]')!;
}

function pick(el: HTMLInputElement, ...files: File[]) {
  fireEvent.change(el, { target: { files } });
}

function drop(el: Element, ...files: File[]) {
  fireEvent.drop(el, { dataTransfer: { files, types: ["Files"] } });
}

describe("FileDropzone 0.6", () => {
  it("resets the input after every pick, so the same file can be picked twice", () => {
    const onFileSelected = vi.fn();
    const { container } = zone({ onFileSelected });
    const el = input(container);
    const setValue = vi.spyOn(el, "value", "set");
    const file = pdf();
    pick(el, file);
    pick(el, file);
    expect(setValue).toHaveBeenCalledWith("");
    expect(onFileSelected).toHaveBeenCalledTimes(2);
  });

  it("needs no isValid: it checks accept itself, and refuses without a toast when told", async () => {
    const onFileSelected = vi.fn();
    const onReject = vi.fn();
    const { toast } = await import("sonner");
    zone({ onFileSelected, onReject });
    const root = screen.getByRole("button", { name: LABELS.dropLabel });
    drop(root, png());
    expect(onFileSelected).not.toHaveBeenCalled();
    expect(onReject.mock.calls[0][0][0]).toMatchObject({ reason: "type" });
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("“plan.png” is not a supported file type"),
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows the refusal inline, tied to the zone, until the next good pick", async () => {
    const { container } = zone({ onFileSelected: vi.fn(), rejectionFeedback: "inline", maxSize: 5 });
    const root = screen.getByRole("button", { name: LABELS.dropLabel });
    drop(root, pdf("big.pdf", 50));
    expect(root).toHaveAttribute("data-invalid", "true");
    const describedBy = root.getAttribute("aria-describedby")!;
    expect(document.getElementById(describedBy)).toHaveTextContent(/^“big\.pdf” is larger than/);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/big\.pdf/));
    pick(input(container), pdf("small.pdf", 1));
    expect(root).not.toHaveAttribute("data-invalid");
    expect(root).not.toHaveAttribute("aria-describedby");
    // Let the "selected" announcement land inside act before the test ends.
    await screen.findByText("“small.pdf” selected");
  });

  it("keeps a caller's aria-describedby next to its own", () => {
    zone({ rejectionFeedback: "inline", "aria-describedby": "outside-hint" });
    const root = screen.getByRole("button", { name: LABELS.dropLabel });
    drop(root, png());
    expect(root.getAttribute("aria-describedby")).toMatch(/^outside-hint \S+$/);
  });

  it("removes the chosen file from inside the zone, without opening the picker", async () => {
    function Host() {
      const [file, setFile] = useState<File | null>(pdf());
      return <FileDropzone accept=".pdf" {...LABELS} file={file} onFileSelected={setFile} onClear={() => setFile(null)} />;
    }
    const { container } = render(<Host />);
    const click = vi.spyOn(input(container), "click");
    const remove = screen.getByRole("button", { name: "Remove “lease.pdf”" });
    fireEvent.keyDown(remove, { key: "Enter" });
    fireEvent.click(remove);
    expect(click).not.toHaveBeenCalled();
    expect(screen.getByText(LABELS.emptyLabel)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: LABELS.dropLabel })).toHaveFocus();
    expect(await screen.findByText("“lease.pdf” removed")).toBeInTheDocument();
  });

  it("has no remove button without onClear", () => {
    zone({ file: pdf() });
    expect(screen.queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();
  });

  describe("multiple", () => {
    it("takes every file, caps them with maxFiles, and lists what is chosen", async () => {
      const onFilesSelected = vi.fn();
      const onReject = vi.fn();
      const a = pdf("a.pdf");
      const b = pdf("b.pdf");
      const c = pdf("c.pdf");
      const { container, rerender } = zone({ multiple: true, maxFiles: 2, onFilesSelected, onReject });
      expect(input(container).multiple).toBe(true);
      drop(screen.getByRole("button", { name: LABELS.dropLabel }), a, b, c);
      expect(onFilesSelected).toHaveBeenCalledWith([a, b]);
      expect(onReject.mock.calls[0][0].map((r: { file: File }) => r.file)).toEqual([c]);
      rerender(
        <FileDropzone accept=".pdf" {...LABELS} multiple files={[a, b]} onRemove={vi.fn()} onClear={vi.fn()} />,
      );
      expect(screen.getAllByRole("listitem")).toHaveLength(2);
      expect(screen.getByRole("button", { name: "Remove “b.pdf”" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remove all files" })).toBeInTheDocument();
      await screen.findByText("2 files selected");
    });

    it("removes one file by index", async () => {
      const onRemove = vi.fn();
      const a = pdf("a.pdf");
      const b = pdf("b.pdf");
      zone({ multiple: true, files: [a, b], onRemove });
      fireEvent.click(screen.getByRole("button", { name: "Remove “b.pdf”" }));
      expect(onRemove).toHaveBeenCalledWith(b, 1);
      await screen.findByText("“b.pdf” removed");
    });
  });

  it("still calls onFilesSelected in single mode, as a one-element array", async () => {
    const onFileSelected = vi.fn();
    const onFilesSelected = vi.fn();
    const { container } = zone({ onFileSelected, onFilesSelected });
    const file = pdf();
    pick(input(container), file, pdf("second.pdf"));
    expect(onFileSelected).toHaveBeenCalledWith(file);
    expect(onFilesSelected).toHaveBeenCalledWith([file]);
    await screen.findByText("“lease.pdf” selected");
  });
});

describe("FileDropzone onPick", () => {
  it("refuses the whole pick when onPick returns false, and shows one message", async () => {
    const onFilesSelected = vi.fn();
    const onReject = vi.fn();
    const { container } = zone({
      multiple: true,
      onFilesSelected,
      onReject,
      rejectionFeedback: "inline",
      onPick: (_ok, bad) => bad.length === 0 || false,
    });
    pick(input(container), pdf("a.pdf"), png());
    expect(onFilesSelected).not.toHaveBeenCalled();
    expect(onReject).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getAllByText("None of the 2 files were added").length).toBeGreaterThan(0),
    );
  });

  it("delivers as usual when onPick has no objection", () => {
    const onFilesSelected = vi.fn();
    const onPick = vi.fn();
    const { container } = zone({ multiple: true, onFilesSelected, onPick });
    const a = pdf("a.pdf");
    pick(input(container), a);
    expect(onPick).toHaveBeenCalledWith([a], []);
    expect(onFilesSelected).toHaveBeenCalledWith([a]);
  });
});
