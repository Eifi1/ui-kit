import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useFileDrop } from "../use-file-drop";
import type { UseFileDropOptions } from "../use-file-drop";

/** kastlan: any element as a drop target, screened exactly like FileButton. */
const pdf = (name = "lease.pdf", size = 1) => new File(["x".repeat(size)], name, { type: "application/pdf" });
const png = () => new File(["x"], "plan.png", { type: "image/png" });
const dt = (files: File[], types = ["Files"]) => ({ dataTransfer: { files, types, dropEffect: "none" } });

function List(props: UseFileDropOptions) {
  const { dropProps, isOver, element } = useFileDrop<HTMLUListElement>(props);
  return (
    <>
      {element}
      <ul aria-label="Documents" data-over={isOver || undefined} {...dropProps}>
        <li>
          <span>existing.pdf</span>
        </li>
      </ul>
    </>
  );
}
const list = () => screen.getByRole("list", { name: "Documents" });

describe("useFileDrop", () => {
  it("screens a drop with accept / maxSize / multiple, like the pickers", () => {
    const onFiles = vi.fn();
    const onReject = vi.fn();
    render(<List accept=".pdf" multiple maxSize={5} onFiles={onFiles} onReject={onReject} />);
    fireEvent.drop(list(), dt([pdf("a.pdf"), png(), pdf("big.pdf", 10)]));
    expect(onFiles).toHaveBeenCalledWith([expect.objectContaining({ name: "a.pdf" })]);
    const reasons = onReject.mock.calls[0][0].map((r: { reason: string }) => r.reason);
    expect(reasons).toEqual(["type", "size"]);
  });

  it("keeps only the first file without `multiple`", () => {
    const onFiles = vi.fn();
    render(<List onFiles={onFiles} />);
    fireEvent.drop(list(), dt([pdf("a.pdf"), pdf("b.pdf")]));
    expect(onFiles.mock.calls[0][0]).toHaveLength(1);
  });

  it("honours onPick's veto", () => {
    const onFiles = vi.fn();
    render(<List multiple onFiles={onFiles} onPick={() => false} />);
    fireEvent.drop(list(), dt([pdf()]));
    expect(onFiles).not.toHaveBeenCalled();
  });

  it("counts enter/leave so nested children do not flicker isOver", () => {
    render(<List onFiles={() => {}} />);
    const child = screen.getByText("existing.pdf");
    fireEvent.dragEnter(list(), dt([]));
    expect(list()).toHaveAttribute("data-over", "true");
    fireEvent.dragEnter(child, dt([]));
    fireEvent.dragLeave(list(), dt([]));
    expect(list()).toHaveAttribute("data-over", "true");
    fireEvent.dragLeave(child, dt([]));
    expect(list()).not.toHaveAttribute("data-over");
    // A drop resets the count, however unbalanced the events were.
    fireEvent.dragEnter(list(), dt([]));
    fireEvent.dragEnter(child, dt([]));
    fireEvent.drop(child, dt([pdf()]));
    expect(list()).not.toHaveAttribute("data-over");
  });

  it("ignores drags that carry no files (a dragged link, a row)", () => {
    const onFiles = vi.fn();
    render(<List onFiles={onFiles} />);
    fireEvent.dragEnter(list(), dt([], ["text/uri-list"]));
    expect(list()).not.toHaveAttribute("data-over");
    const over = fireEvent.dragOver(list(), dt([], ["text/uri-list"]));
    // Not cancelled: the page's own drag-and-drop keeps working.
    expect(over).toBe(true);
    fireEvent.drop(list(), dt([pdf()], ["text/uri-list"]));
    expect(onFiles).not.toHaveBeenCalled();
  });

  it("disabled: cancels the drag (no navigation) but takes nothing and never lights up", () => {
    const onFiles = vi.fn();
    render(<List disabled onFiles={onFiles} />);
    fireEvent.dragEnter(list(), dt([]));
    expect(list()).not.toHaveAttribute("data-over");
    expect(fireEvent.dragOver(list(), dt([]))).toBe(false);
    fireEvent.drop(list(), dt([pdf()]));
    expect(onFiles).not.toHaveBeenCalled();
  });

  it("speaks a refusal through the region it renders", async () => {
    render(<List accept=".pdf" onFiles={() => {}} />);
    fireEvent.drop(list(), dt([png()]));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Only .pdf files"));
  });
});
