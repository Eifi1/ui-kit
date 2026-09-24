import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DangerConfirm } from "../danger-confirm";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * keksdose's arm → confirm tile (load demo, wipe all, reset a budget), with its
 * write-lock hook turned into `lockedReason`.
 */

describe("DangerConfirm", () => {
  it("arms, focuses the first field, and holds confirm until every guard is met", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DangerConfirm phrase="wipe" requirePassword onConfirm={onConfirm} armLabel="Wipe everything" />);
    await user.click(screen.getByRole("button", { name: "Wipe everything" }));
    const phraseField = screen.getByLabelText("Type “wipe” to confirm");
    expect(phraseField).toHaveFocus();
    const confirm = screen.getByRole("button", { name: "Delete" });
    expect(confirm).toBeDisabled();
    await user.type(phraseField, "wipe");
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText("Password"), "pw");
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith("pw");
  });

  it("matches the phrase exactly, case included, ignoring surrounding spaces", async () => {
    const user = userEvent.setup();
    render(<DangerConfirm phrase="DELETE" onConfirm={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Delete…" }));
    const field = screen.getByLabelText("Type “DELETE” to confirm");
    await user.type(field, "delete");
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    await user.clear(field);
    await user.type(field, " DELETE ");
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
  });

  it("confirms on Enter, calls without a password when none is asked for", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DangerConfirm phrase="ok" onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: "Delete…" }));
    await user.type(screen.getByLabelText("Type “ok” to confirm"), "ok{Enter}");
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it("with no fields, lands focus on Cancel — never on the destructive button", async () => {
    const user = userEvent.setup();
    render(<DangerConfirm onConfirm={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Delete…" }));
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("cancel disarms, wipes the fields and returns focus to the arm button", async () => {
    const user = userEvent.setup();
    render(<DangerConfirm requirePassword onConfirm={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Delete…" }));
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText("Password")).toBeNull();
    expect(screen.getByRole("button", { name: "Delete…" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Delete…" }));
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  it("is busy while a returned promise runs, disarms when it resolves", async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    render(<DangerConfirm onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: "Delete…" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await act(async () => resolve());
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    expect(screen.getByRole("button", { name: "Delete…" })).toHaveFocus();
  });

  it("stays armed, fields kept, when the promise rejects", async () => {
    const user = userEvent.setup();
    let reject!: () => void;
    render(<DangerConfirm requirePassword onConfirm={() => new Promise<void>((_, r) => (reject = r))} />);
    await user.click(screen.getByRole("button", { name: "Delete…" }));
    await user.type(screen.getByLabelText("Password"), "wrong{Enter}");
    await act(async () => reject());
    expect(screen.getByLabelText("Password")).toHaveValue("wrong");
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
  });

  it("can be controlled, and a parent collapse wipes the fields", async () => {
    const user = userEvent.setup();
    function Parent() {
      const [armed, setArmed] = useState(false);
      return (
        <>
          <DangerConfirm requirePassword armed={armed} onArmedChange={setArmed} onConfirm={() => setArmed(false)} />
          <span data-testid="state">{String(armed)}</span>
        </>
      );
    }
    render(<Parent />);
    await user.click(screen.getByRole("button", { name: "Delete…" }));
    expect(screen.getByTestId("state")).toHaveTextContent("true");
    await user.type(screen.getByLabelText("Password"), "pw{Enter}");
    expect(screen.getByTestId("state")).toHaveTextContent("false");
    // The form went away under the focus: it comes back to the arm button.
    expect(screen.getByRole("button", { name: "Delete…" })).toHaveFocus();
  });

  it("says why it is locked, and does not arm", async () => {
    const user = userEvent.setup();
    render(<DangerConfirm lockedReason="The demo is read-only." onConfirm={() => {}} />);
    const arm = screen.getByRole("button", { name: "Delete…" });
    expect(arm).toHaveAttribute("aria-disabled", "true");
    expect(arm).toHaveAccessibleDescription("The demo is read-only.");
    await user.click(arm);
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("disables the arm button with `disabled`", () => {
    render(<DangerConfirm disabled onConfirm={() => {}} />);
    expect(screen.getByRole("button", { name: "Delete…" })).toBeDisabled();
  });

  it("takes its words from the provider's `dangerConfirm` namespace, the prop winning", async () => {
    const user = userEvent.setup();
    render(
      <UiKitProvider
        labels={{ dangerConfirm: { arm: "Löschen…", cancel: "Abbrechen", phrase: (p) => `„${p}“ eintippen` } }}
      >
        <DangerConfirm phrase="weg" onConfirm={() => {}} labels={{ cancel: "Zurück" }} />
      </UiKitProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Löschen…" }));
    expect(screen.getByLabelText("„weg“ eintippen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zurück" })).toBeInTheDocument();
  });

  it("phraseMatch=\"exact\" refuses surrounding spaces", async () => {
    const user = userEvent.setup();
    render(<DangerConfirm phrase="DELETE" phraseMatch="exact" onConfirm={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Delete…" }));
    const field = screen.getByLabelText("Type “DELETE” to confirm");
    await user.type(field, " DELETE ");
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    await user.clear(field);
    await user.type(field, "DELETE");
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
  });

  it("takes a finished string as the phrase label, and a placeholder (string or function)", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <DangerConfirm
        phrase="DELETE"
        armed
        onConfirm={() => {}}
        labels={{ phrase: "Type DELETE to confirm", phrasePlaceholder: "DELETE" }}
      />,
    );
    expect(screen.getByLabelText("Type DELETE to confirm")).toHaveAttribute("placeholder", "DELETE");
    rerender(
      <DangerConfirm phrase="wipe" armed onConfirm={() => {}} labels={{ phrasePlaceholder: (p) => `e.g. ${p}` }} />,
    );
    expect(screen.getByLabelText("Type “wipe” to confirm")).toHaveAttribute("placeholder", "e.g. wipe");
    await user.type(screen.getByLabelText("Type “wipe” to confirm"), "wipe");
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
  });

  it("keeps the floating label, and no placeholder text, unless one is given", () => {
    render(<DangerConfirm phrase="wipe" armed onConfirm={() => {}} />);
    const field = screen.getByLabelText("Type “wipe” to confirm");
    // The floating field's own single space, which drives its label — not text.
    expect(field.getAttribute("placeholder")?.trim() ?? "").toBe("");
  });
});
