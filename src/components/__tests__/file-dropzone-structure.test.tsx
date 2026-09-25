import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { FileDropzone } from "../file-dropzone";
import type { FileDropzoneProps } from "../file-dropzone";
import { UiKitProvider } from "../../i18n/kit-labels";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

/**
 * - The zone was a `role="button"` wrapping real buttons (Browse, remove, remove all):
 *   nested interactive controls. It is a named group now, and Browse is the keyboard
 *   path.
 * - Multiple mode with a stray `file` prop and an empty list showed that file's name.
 * - The default type refusal names what `accept` takes (kastlan).
 */
const pdf = (name = "lease.pdf") => new File(["x"], name, { type: "application/pdf" });
const png = (name = "plan.png") => new File(["x"], name, { type: "image/png" });

const LABELS = { dropLabel: "Drop a document", browseLabel: "Browse", emptyLabel: "Nothing chosen", hint: "PDF only" };

function zone(props: Partial<FileDropzoneProps> = {}) {
  return render(<FileDropzone accept=".pdf" onReject={() => {}} {...LABELS} {...props} />);
}

const root = () => screen.getByRole("group", { name: LABELS.dropLabel });

function drop(...files: File[]) {
  fireEvent.drop(root(), { dataTransfer: { files, types: ["Files"] } });
}

describe("FileDropzone structure", () => {
  it("is a named group, not a button with buttons inside it", () => {
    zone({ file: pdf(), onClear: () => {} });
    expect(root()).not.toHaveAttribute("tabindex");
    // No element with a button role contains another one.
    for (const button of screen.getAllByRole("button")) {
      expect(within(button).queryAllByRole("button")).toHaveLength(0);
      expect(button.closest('[role="button"]')).toBe(button.tagName === "BUTTON" ? null : button);
    }
    expect(within(root()).getByRole("button", { name: "Browse" })).toBeInTheDocument();
    expect(within(root()).getByRole("button", { name: /Remove/ })).toBeInTheDocument();
  });

  it("opens the picker from Browse — the keyboard path — and from a click on the zone", () => {
    const { container } = zone();
    const click = vi.spyOn(container.querySelector<HTMLInputElement>('input[type="file"]')!, "click");
    const browse = screen.getByRole("button", { name: "Browse" });
    browse.focus();
    expect(browse).toHaveFocus();
    // A native button turns Enter/Space into a click; that click is what opens it.
    fireEvent.click(browse);
    expect(click).toHaveBeenCalledTimes(1);
    fireEvent.click(root());
    expect(click).toHaveBeenCalledTimes(2);
  });
});

describe("FileDropzone multiple mode", () => {
  it("shows the empty label, not a stray `file`, when the list is empty", () => {
    zone({ multiple: true, files: [], file: pdf("stray.pdf") });
    expect(screen.getByText(LABELS.emptyLabel)).toBeInTheDocument();
    expect(screen.queryByText("stray.pdf")).not.toBeInTheDocument();
    expect(screen.getByText(LABELS.hint)).toBeInTheDocument();
  });
});

describe("FileDropzone's default type refusal", () => {
  it.each([
    [".csv", "Only .csv files"],
    [".pdf,.png", "Only .pdf, .png files"],
    [" .PDF , image/jpeg ", "Only .pdf, image/jpeg files"],
  ])("accept=%j refuses with %j", async (accept, message) => {
    const onReject = vi.fn();
    zone({ accept, onReject });
    drop(new File(["x"], "notes.txt", { type: "text/plain" }));
    expect(onReject.mock.calls[0][0][0]).toMatchObject({ reason: "type", message });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(message));
  });

  it("takes a per-instance rejectedTypeOnly", () => {
    const onReject = vi.fn();
    zone({ onReject, labels: { rejectedTypeOnly: (a) => `Nur ${a}-Dateien` } });
    drop(png());
    expect(onReject.mock.calls[0][0][0].message).toBe("Nur .pdf-Dateien");
  });

  it("keeps a caller's own rejectedType rather than replacing it with English", () => {
    const onReject = vi.fn();
    zone({ onReject, labels: { rejectedType: (name) => `„${name}“ hat den falschen Typ` } });
    drop(png());
    expect(onReject.mock.calls[0][0][0].message).toBe("„plan.png“ hat den falschen Typ");
  });

  it("keeps a provider-translated rejectedType", () => {
    const onReject = vi.fn();
    render(
      <UiKitProvider labels={{ filePicker: { rejectedType: (name: string) => `„${name}“ nicht erlaubt` } }}>
        <FileDropzone accept=".pdf" onReject={onReject} {...LABELS} />
      </UiKitProvider>,
    );
    drop(png());
    expect(onReject.mock.calls[0][0][0].message).toBe("„plan.png“ nicht erlaubt");
  });

  it("leaves a custom isValid + invalidMessage exactly as it was", () => {
    const onReject = vi.fn();
    zone({ onReject, isValid: (f) => f.name.endsWith(".pdf"), invalidMessage: "PDFs, please" });
    drop(png());
    expect(onReject.mock.calls[0][0][0]).toMatchObject({ reason: "invalid", message: "PDFs, please" });
  });
});
