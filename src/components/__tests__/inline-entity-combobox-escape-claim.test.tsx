import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InlineEntityCombobox } from "../inline-entity-combobox";
import { Modal } from "../modal";

/**
 * Escape on typed text that matches nothing puts the chosen label back, and that is the
 * whole of it: the dialog around the field stays (refactor audit 2026-10-30, INP-5).
 *
 * With no row to show the list is no layer, so the key went on to the Modal, which
 * closed with the form in it: keksdose's category picker in the category admin's
 * DialogFrame and in the invoice lines' bulk bar. Reverting loose text is an "undo this
 * step" Escape, which the Escape stack's one rule says is claimed — ChipInput clearing
 * its draft already is.
 */

const OPTIONS = [
  { value: 1, label: "Cash" },
  { value: 2, label: "Bank" },
];

function renderInModal(onClose: () => void, onChange = vi.fn()) {
  render(
    <Modal title="Edit line" onClose={onClose}>
      <InlineEntityCombobox label="Account" value={1} onChange={onChange} options={OPTIONS} />
    </Modal>,
  );
  const input = screen.getByRole("combobox", { name: "Account" }) as HTMLInputElement;
  act(() => input.focus());
  return input;
}

describe("InlineEntityCombobox's Escape on loose text", () => {
  it("reverts the text and keeps the dialog open", async () => {
    const onClose = vi.fn();
    const onChange = vi.fn();
    const input = renderInModal(onClose, onChange);
    fireEvent.change(input, { target: { value: "zzz" } });
    fireEvent.keyDown(input, { key: "Escape" });
    await act(async () => {});
    expect(input.value).toBe("Cash");
    expect(onChange).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("with nothing to undo, the key goes on to the dialog", async () => {
    const onClose = vi.fn();
    const input = renderInModal(onClose);
    // Focus opened the whole list: the first press is the list's.
    fireEvent.keyDown(input, { key: "Escape" });
    await act(async () => {});
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Escape" });
    await act(async () => {});
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
