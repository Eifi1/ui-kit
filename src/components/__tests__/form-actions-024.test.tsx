import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FormActions } from "../form-actions";

/**
 * 0.24 — DangerConfirm's fix, for the Save button too (found while fixing it, keksdose):
 * Save is natively disabled while `pending`, and a focused button that turns disabled
 * drops the focus to <body> in a browser. After a failed save (pending back to false,
 * the form still there) the focus comes back to Save — but only after a press of it.
 * jsdom does not drop the focus by itself, so the tests blur where a browser would.
 */
describe("FormActions: focus after a failed save", () => {
  it("brings the focus back to Save once the save it started settles", () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<FormActions onSubmit={onSubmit} onCancel={() => {}} />);
    const save = screen.getByRole("button", { name: "Save" });
    save.focus();
    fireEvent.click(save);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    rerender(<FormActions onSubmit={onSubmit} onCancel={() => {}} pending />);
    // What the browser does to a focused button turned disabled (jsdom will not blur a
    // disabled element): the focus ends up on <body>.
    act(() => {
      const gone = document.createElement("input");
      document.body.append(gone);
      gone.focus();
      gone.remove();
    });
    expect(document.activeElement).toBe(document.body);
    rerender(<FormActions onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();
  });

  it("leaves the focus alone where it went meanwhile", () => {
    const { rerender } = render(
      <>
        <input aria-label="Elsewhere" />
        <FormActions onSubmit={() => {}} onCancel={() => {}} />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    rerender(
      <>
        <input aria-label="Elsewhere" />
        <FormActions onSubmit={() => {}} onCancel={() => {}} pending />
      </>,
    );
    screen.getByRole("textbox", { name: "Elsewhere" }).focus();
    rerender(
      <>
        <input aria-label="Elsewhere" />
        <FormActions onSubmit={() => {}} onCancel={() => {}} />
      </>,
    );
    expect(screen.getByRole("textbox", { name: "Elsewhere" })).toHaveFocus();
  });

  it("does not pull the focus in for a pending it did not start", () => {
    const { rerender } = render(<FormActions onSubmit={() => {}} onCancel={() => {}} />);
    rerender(<FormActions onSubmit={() => {}} onCancel={() => {}} pending />);
    rerender(<FormActions onSubmit={() => {}} onCancel={() => {}} />);
    expect(document.activeElement).toBe(document.body);
  });
});
