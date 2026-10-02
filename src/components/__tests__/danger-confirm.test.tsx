import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CurrentPasswordInput, DangerConfirm, TypedConfirmField } from "../danger-confirm";
import { WriteLockProvider } from "../write-lock";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * keksdose's arm → confirm tile (load demo, wipe all, reset a budget), with its
 * write-lock hook turned into `lockedReason`.
 */

/** The armed tile's confirm, looked up afresh: it is re-mounted when it turns from held
 *  to ready (Button wraps a reasoned one in its Tooltip), so a reference kept across
 *  the flip would be the old node. */
const confirmButton = (name = "Delete") => screen.getByRole("button", { name });

/** 0.23 (keksdose G4a): a confirm held by a guard is `aria-disabled` — focusable, and
 *  saying why — rather than natively `disabled`. */
function expectHeld(reason?: string) {
  const button = confirmButton();
  expect(button).toHaveAttribute("aria-disabled", "true");
  expect(button).not.toBeDisabled();
  if (reason !== undefined) expect(button).toHaveAccessibleDescription(reason);
}

function expectReady() {
  const button = confirmButton();
  expect(button).not.toHaveAttribute("aria-disabled");
  expect(button).toBeEnabled();
}

describe("DangerConfirm", () => {
  it("arms, focuses the first field, and holds confirm until every guard is met", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DangerConfirm phrase="wipe" requirePassword onConfirm={onConfirm} armLabel="Wipe everything" />);
    await user.click(screen.getByRole("button", { name: "Wipe everything" }));
    const phraseField = screen.getByLabelText("Type “wipe” to confirm");
    expect(phraseField).toHaveFocus();
    expectHeld("Type “wipe” to confirm");
    await user.type(phraseField, "wipe");
    expectHeld("Enter your password to confirm");
    await user.type(screen.getByLabelText("Password"), "pw");
    expectReady();
    await user.click(confirmButton());
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith("pw", { typed: "wipe", password: "pw" });
  });

  it("matches the phrase exactly, case included, ignoring surrounding spaces", async () => {
    const user = userEvent.setup();
    render(<DangerConfirm phrase="DELETE" onConfirm={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Delete…" }));
    const field = screen.getByLabelText("Type “DELETE” to confirm");
    await user.type(field, "delete");
    expectHeld();
    await user.clear(field);
    await user.type(field, " DELETE ");
    expectReady();
  });

  it("confirms on Enter, calls without a password when none is asked for", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DangerConfirm phrase="ok" onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: "Delete…" }));
    await user.type(screen.getByLabelText("Type “ok” to confirm"), "ok{Enter}");
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith(undefined, { typed: "ok" });
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
    expectReady();
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

  it("shows the locked reason as a tooltip on the arm button, which stays focusable (0.7.0)", async () => {
    const user = userEvent.setup();
    render(<DangerConfirm lockedReason="The demo is read-only." onConfirm={() => {}} />);
    const arm = screen.getByRole("button", { name: "Delete…" });
    expect(arm).not.toBeDisabled();
    await user.hover(arm);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("The demo is read-only.");
    await user.unhover(arm);
    await user.tab();
    expect(arm).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("The demo is read-only.");
    // Described ONCE, by the visible line — the bubble is not appended to it.
    expect(arm).toHaveAccessibleDescription("The demo is read-only.");
  });

  it("has no tooltip when it is not locked", async () => {
    const user = userEvent.setup();
    render(<DangerConfirm onConfirm={() => {}} />);
    await user.hover(screen.getByRole("button", { name: "Delete…" }));
    expect(screen.queryByRole("tooltip")).toBeNull();
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
    expectHeld();
    await user.clear(field);
    await user.type(field, "DELETE");
    expectReady();
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
    expectReady();
  });

  it("keeps the floating label, and no placeholder text, unless one is given", () => {
    render(<DangerConfirm phrase="wipe" armed onConfirm={() => {}} />);
    const field = screen.getByLabelText("Type “wipe” to confirm");
    // The floating field's own single space, which drives its label — not text.
    expect(field.getAttribute("placeholder")?.trim() ?? "").toBe("");
  });

  it("phraseMatch=\"caseless\" takes an address in any case, still not a different one", async () => {
    const user = userEvent.setup();
    render(<DangerConfirm phrase="Anna@Example.org" phraseMatch="caseless" armed onConfirm={() => {}} />);
    const field = screen.getByLabelText("Type “Anna@Example.org” to confirm");
    await user.type(field, " anna@example.ORG ");
    expectReady();
    await user.type(field, "x");
    expectHeld();
  });
});

/** keksdose K7: the acknowledgement tick and the consequences list, beside the typed
 *  phrase — `UserActionConfirm` and `UserPlanEditor` hand-built them next to the tile. */
describe("DangerConfirm — requireAcknowledge and consequences (0.22)", () => {
  it("holds confirm until the tick, which takes focus on arm and is worded by the namespace", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DangerConfirm requireAcknowledge onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: "Delete…" }));
    const tick = screen.getByRole("checkbox", { name: "I have read what this does and want to continue." });
    expect(tick).toHaveFocus();
    expectHeld("Tick the box to confirm");
    await user.click(tick);
    expectReady();
    await user.click(confirmButton());
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith(undefined, { acknowledged: true });
  });

  it("takes a node as the tick's own label, and combines with the phrase", async () => {
    const user = userEvent.setup();
    render(<DangerConfirm armed phrase="anna@example.org" phraseMatch="caseless" requireAcknowledge="Sign Anna out everywhere" onConfirm={() => {}} />);
    await user.click(screen.getByRole("checkbox", { name: "Sign Anna out everywhere" }));
    expectHeld("Type “anna@example.org” to confirm");
    await user.type(screen.getByLabelText("Type “anna@example.org” to confirm"), "Anna@Example.org");
    expectReady();
  });

  it("is unticked again after a disarm", async () => {
    const user = userEvent.setup();
    render(<DangerConfirm requireAcknowledge onConfirm={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Delete…" }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Delete…" }));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("asks no tick for false, null or an empty string", () => {
    const { rerender } = render(<DangerConfirm armed requireAcknowledge={false} onConfirm={() => {}} />);
    expect(screen.queryByRole("checkbox")).toBeNull();
    rerender(<DangerConfirm armed requireAcknowledge="" onConfirm={() => {}} />);
    expect(screen.queryByRole("checkbox")).toBeNull();
    expectReady();
  });

  it("lists the consequences once armed, a severe line in the danger colour", async () => {
    const user = userEvent.setup();
    render(
      <DangerConfirm
        consequences={["Every session ends now.", { key: "only_door", text: "The only way into the data goes.", severe: true }]}
        onConfirm={() => {}}
      />,
    );
    expect(screen.queryByRole("list")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Delete…" }));
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual(["Every session ends now.", "The only way into the data goes."]);
    expect(items[0].className).not.toContain("--danger");
    expect(items[1].className).toContain("text-[var(--danger)]");
  });

  it("takes the acknowledge word from the provider", async () => {
    const user = userEvent.setup();
    render(
      <UiKitProvider labels={{ dangerConfirm: { acknowledge: "Ich habe gelesen, was das bewirkt." } }}>
        <DangerConfirm requireAcknowledge onConfirm={() => {}} />
      </UiKitProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Delete…" }));
    expect(screen.getByRole("checkbox", { name: "Ich habe gelesen, was das bewirkt." })).toBeInTheDocument();
  });
});

/** keksdose K3: the tile takes the write lock's reason itself, as Button's `commit`. */
describe("DangerConfirm — commit and a lock while armed (0.22)", () => {
  it("under a locked provider, `commit` locks the arm button with the lock's reason", async () => {
    const user = userEvent.setup();
    render(
      <WriteLockProvider locked reason="Read-only demo — saving is disabled.">
        <DangerConfirm commit lockedReason="Own reason" onConfirm={() => {}} />
      </WriteLockProvider>,
    );
    const arm = screen.getByRole("button", { name: "Delete…" });
    expect(arm).toHaveAttribute("aria-disabled", "true");
    // The lock's sentence wins over the tile's own.
    expect(arm).toHaveAccessibleDescription("Read-only demo — saving is disabled.");
    await user.click(arm);
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("without `commit`, or under an unlocked provider, is left alone", () => {
    const { rerender } = render(
      <WriteLockProvider locked reason="Locked">
        <DangerConfirm onConfirm={() => {}} />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("button", { name: "Delete…" })).not.toHaveAttribute("aria-disabled");
    rerender(
      <WriteLockProvider locked={false} reason="Locked">
        <DangerConfirm commit onConfirm={() => {}} />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("button", { name: "Delete…" })).not.toHaveAttribute("aria-disabled");
  });

  it("an ARMED tile that is locked keeps its fields, and its confirm says why and does nothing", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DangerConfirm armed phrase="ok" lockedReason="Shared with you to read." onConfirm={onConfirm} />);
    const field = screen.getByLabelText("Type “ok” to confirm");
    await user.type(field, "ok");
    const confirm = screen.getByRole("button", { name: "Delete" });
    expect(confirm).toHaveAttribute("aria-disabled", "true");
    expect(confirm).not.toBeDisabled();
    expect(confirm).toHaveAccessibleDescription("Shared with you to read.");
    await user.click(confirm);
    await user.type(field, "{Enter}");
    expect(onConfirm).not.toHaveBeenCalled();
    expect(field).toHaveValue("ok");
  });

  it("locks an armed tile when the lock arrives while it is open", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const tree = (locked: boolean) => (
      <WriteLockProvider locked={locked} reason="Locked now">
        <DangerConfirm commit requireAcknowledge onConfirm={onConfirm} />
      </WriteLockProvider>
    );
    const { rerender } = render(tree(false));
    await user.click(screen.getByRole("button", { name: "Delete…" }));
    await user.click(screen.getByRole("checkbox"));
    rerender(tree(true));
    // Still armed, the tick kept — only the confirm changed.
    expect(screen.getByRole("checkbox")).toBeChecked();
    const confirm = screen.getByRole("button", { name: "Delete" });
    expect(confirm).toHaveAttribute("aria-disabled", "true");
    expect(confirm).toHaveAccessibleDescription("Locked now");
    await user.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

/** keksdose K7: the typed-confirmation field on its own (the privacy dialogs' ack word,
 *  the admin's "type the address"). */
describe("TypedConfirmField", () => {
  it("is labelled from the target and leaves the text to the user's keyboard", () => {
    render(<TypedConfirmField target="DELETE" />);
    const field = screen.getByLabelText("Type “DELETE” to confirm");
    expect(field).toHaveAttribute("autocomplete", "off");
    expect(field).toHaveAttribute("autocapitalize", "off");
    expect(field).toHaveAttribute("autocorrect", "off");
    expect(field).toHaveAttribute("spellcheck", "false");
  });

  it("reports the match as it flips, with typedMatches' rule, and marks the input", async () => {
    const user = userEvent.setup();
    const onMatchedChange = vi.fn();
    render(<TypedConfirmField target="CONFIRM" match="caseless" onMatchedChange={onMatchedChange} />);
    const field = screen.getByLabelText("Type “CONFIRM” to confirm");
    await user.type(field, "confir");
    expect(onMatchedChange).not.toHaveBeenCalled();
    await user.type(field, "m");
    expect(onMatchedChange).toHaveBeenLastCalledWith(true);
    expect(field).toHaveAttribute("data-matched", "true");
    await user.type(field, "x");
    expect(onMatchedChange).toHaveBeenLastCalledWith(false);
    expect(onMatchedChange).toHaveBeenCalledTimes(2);
    expect(field).not.toHaveAttribute("data-matched");
  });

  it("defaults to the trim rule — case counts", async () => {
    const user = userEvent.setup();
    const onMatchedChange = vi.fn();
    render(<TypedConfirmField target="DELETE" onMatchedChange={onMatchedChange} />);
    await user.type(screen.getByRole("textbox"), " delete ");
    expect(onMatchedChange).not.toHaveBeenCalled();
  });

  it("works controlled, with onValueChange and onChange both", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Parent() {
      const [v, setV] = useState("");
      return <TypedConfirmField target="x" value={v} onValueChange={setV} onChange={onChange} />;
    }
    render(<Parent />);
    await user.type(screen.getByRole("textbox"), "ab");
    expect(screen.getByRole("textbox")).toHaveValue("ab");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("moves the label above the field for a placeholder, from the prop or the namespace", () => {
    const { rerender } = render(<TypedConfirmField target="wipe" placeholder="wipe" />);
    expect(screen.getByLabelText("Type “wipe” to confirm")).toHaveAttribute("placeholder", "wipe");
    rerender(
      <UiKitProvider labels={{ dangerConfirm: { phrasePlaceholder: (p) => `e.g. ${p}` } }}>
        <TypedConfirmField target="wipe" />
      </UiKitProvider>,
    );
    expect(screen.getByLabelText("Type “wipe” to confirm")).toHaveAttribute("placeholder", "e.g. wipe");
  });

  it("takes its label from the provider's phrase, a label prop winning, and is readOnly while busy", () => {
    const { rerender } = render(
      <UiKitProvider labels={{ dangerConfirm: { phrase: (p) => `„${p}“ eintippen` } }}>
        <TypedConfirmField target="weg" busy />
      </UiKitProvider>,
    );
    expect(screen.getByLabelText("„weg“ eintippen")).toHaveAttribute("readonly");
    rerender(<TypedConfirmField target="weg" label="Type the word" />);
    expect(screen.getByLabelText("Type the word")).toBeInTheDocument();
  });

  it("forwards the ref and carries an error like Input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<TypedConfirmField ref={ref} target="x" error="That is not the word." />);
    expect(ref.current).toBe(screen.getByRole("textbox"));
    expect(screen.getByRole("textbox")).toHaveAccessibleDescription("That is not the word.");
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });
});

/** kastlan 1: the current-password field, public for sign-in and re-auth. */
describe("CurrentPasswordInput", () => {
  it("is a password field the manager fills with the current password, labelled Password", () => {
    render(<CurrentPasswordInput />);
    const field = screen.getByLabelText("Password");
    expect(field).toHaveAttribute("type", "password");
    expect(field).toHaveAttribute("autocomplete", "current-password");
  });

  it("cannot be turned into another kind of field by a spread", () => {
    const loose = { type: "text", autoComplete: "new-password" } as Record<string, string>;
    render(<CurrentPasswordInput {...loose} />);
    const field = screen.getByLabelText("Password");
    expect(field).toHaveAttribute("type", "password");
    expect(field).toHaveAttribute("autocomplete", "current-password");
  });

  it("takes the provider's word, a label prop, or no visible label beside an aria-label", () => {
    const { rerender } = render(
      <UiKitProvider labels={{ dangerConfirm: { password: "Passwort" } }}>
        <CurrentPasswordInput />
      </UiKitProvider>,
    );
    expect(screen.getByLabelText("Passwort")).toBeInTheDocument();
    rerender(<CurrentPasswordInput label="Your password" />);
    expect(screen.getByLabelText("Your password")).toBeInTheDocument();
    rerender(<CurrentPasswordInput aria-label="Account password" />);
    expect(screen.getByLabelText("Account password")).toBeInTheDocument();
    expect(screen.queryByText("Password")).toBeNull();
  });

  it("draws no label of its own for `label={null}` — one labelled elsewhere", () => {
    render(
      <>
        <label htmlFor="pw">Your password</label>
        <CurrentPasswordInput id="pw" label={null} />
      </>,
    );
    expect(screen.getByLabelText("Your password")).toHaveAttribute("type", "password");
    expect(screen.queryByText("Password")).toBeNull();
  });

  it("forwards the ref, name and error, and fires onChange and onValueChange", () => {
    const ref = createRef<HTMLInputElement>();
    const onChange = vi.fn();
    const onValueChange = vi.fn();
    render(
      <CurrentPasswordInput ref={ref} name="password" error="Wrong password." onChange={onChange} onValueChange={onValueChange} />,
    );
    const field = screen.getByLabelText("Password");
    expect(ref.current).toBe(field);
    expect(field).toHaveAttribute("name", "password");
    expect(field).toHaveAccessibleDescription("Wrong password.");
    fireEvent.change(field, { target: { value: "s3cret" } });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onValueChange).toHaveBeenCalledWith("s3cret");
  });

  it("is readOnly, not disabled, while busy — it keeps the focus Enter left in it", () => {
    render(<CurrentPasswordInput busy />);
    const field = screen.getByLabelText("Password");
    expect(field).toHaveAttribute("readonly");
    expect(field).not.toBeDisabled();
  });
});
