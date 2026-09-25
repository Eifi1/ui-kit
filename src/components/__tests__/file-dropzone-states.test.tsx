import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { FileDropzone } from "../file-dropzone";
import type { FileDropzoneProps } from "../file-dropzone";
import { UiKitProvider } from "../../i18n/kit-labels";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

/**
 * `disabled`, `busy`, `renderBody` and provider-translated body strings — the four
 * reasons keksdose's invoice upload hand-rolled its own zone (invoice-upload.tsx,
 * the "Locked" block and the spinner/multi-shot body).
 */
const pdf = (name = "invoice.pdf") => new File(["x"], name, { type: "application/pdf" });
const files = (...f: File[]) => ({ dataTransfer: { files: f, types: ["Files"], dropEffect: "none" } });

function zone(props: Partial<FileDropzoneProps> = {}) {
  return render(<FileDropzone accept=".pdf" onReject={() => {}} dropLabel="Invoice" {...props} />);
}
const root = () => screen.getByRole("group", { name: "Invoice" });

describe("FileDropzone disabled / busy", () => {
  it("disabled: refuses drops and clicks, disables Browse, and says so", () => {
    const onFileSelected = vi.fn();
    const { container } = zone({ disabled: true, onFileSelected });
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const click = vi.spyOn(input, "click");
    expect(root()).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Browse" })).toBeDisabled();
    expect(input).toBeDisabled();
    fireEvent.click(root());
    expect(click).not.toHaveBeenCalled();
    // The drag is still CANCELLED — an uncancelled drop navigates to the file.
    const over = fireEvent.dragOver(root(), files(pdf()));
    expect(over).toBe(false);
    fireEvent.drop(root(), files(pdf()));
    expect(onFileSelected).not.toHaveBeenCalled();
  });

  it("busy: aria-busy, the busy text, and inert like disabled", () => {
    const onFileSelected = vi.fn();
    const onClear = vi.fn();
    zone({ busy: true, onFileSelected, file: pdf(), onClear });
    expect(root()).toHaveAttribute("aria-busy", "true");
    expect(root()).not.toHaveAttribute("aria-disabled");
    expect(within(root()).getByText("Uploading…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browse" })).toBeDisabled();
    fireEvent.drop(root(), files(pdf("second.pdf")));
    expect(onFileSelected).not.toHaveBeenCalled();
  });

  it("lights up for a file drag without flickering across children", () => {
    zone();
    const child = screen.getByRole("button", { name: "Browse" });
    fireEvent.dragEnter(root(), files());
    expect(root()).toHaveAttribute("data-drag-over", "true");
    // Onto a child: enter the child, then leave the zone — still over.
    fireEvent.dragEnter(child, files());
    fireEvent.dragLeave(root(), files());
    expect(root()).toHaveAttribute("data-drag-over", "true");
    fireEvent.dragLeave(child, files());
    expect(root()).not.toHaveAttribute("data-drag-over");
  });
});

describe("FileDropzone renderBody", () => {
  it("replaces the body, gets the state, and keeps Browse", () => {
    const renderBody = vi.fn(({ busy, files: chosen }: { busy: boolean; files: readonly File[] }) => (
      <p>{busy ? "Scanning" : `${chosen.length} chosen — several photos are fine`}</p>
    ));
    const { rerender } = zone({ renderBody, file: pdf() });
    expect(within(root()).getByText("1 chosen — several photos are fine")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browse" })).toBeInTheDocument();
    rerender(<FileDropzone accept=".pdf" onReject={() => {}} dropLabel="Invoice" renderBody={renderBody} busy />);
    expect(within(root()).getByText("Scanning")).toBeInTheDocument();
  });

  it("a control in the body can open the picker once, without the zone opening it again", () => {
    const { container } = zone({
      renderBody: ({ open }) => (
        <button type="button" onClick={open}>
          Take photo
        </button>
      ),
    });
    const click = vi.spyOn(container.querySelector<HTMLInputElement>('input[type="file"]')!, "click");
    fireEvent.click(screen.getByRole("button", { name: "Take photo" }));
    expect(click).toHaveBeenCalledTimes(1);
  });
});

describe("FileDropzone body strings", () => {
  it("needs none of the four label props: English defaults, with the hint naming accept", () => {
    render(<FileDropzone accept=".PDF, image/png" onReject={() => {}} />);
    const group = screen.getByRole("group", { name: "File upload" });
    expect(within(group).getByText("Drop a file here")).toBeInTheDocument();
    expect(within(group).getByText("Accepted: .pdf, image/png")).toBeInTheDocument();
    expect(within(group).getByRole("button", { name: "Browse" })).toBeInTheDocument();
  });

  it("reads them from the provider's filePicker namespace, and a prop still wins", () => {
    render(
      <UiKitProvider
        labels={{
          filePicker: {
            dropzone: "Datei-Upload",
            browse: "Durchsuchen",
            emptyMultiple: "Dateien hierher ziehen",
            hint: (accept) => `Erlaubt: ${accept}`,
          },
        }}
      >
        <FileDropzone accept=".pdf" multiple files={[]} onReject={() => {}} browseLabel="Wählen" />
      </UiKitProvider>,
    );
    const group = screen.getByRole("group", { name: "Datei-Upload" });
    expect(within(group).getByText("Dateien hierher ziehen")).toBeInTheDocument();
    expect(within(group).getByText("Erlaubt: .pdf")).toBeInTheDocument();
    expect(within(group).getByRole("button", { name: "Wählen" })).toBeInTheDocument();
  });
});
