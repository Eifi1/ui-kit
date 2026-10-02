import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Check } from "lucide-react";

import { FormActions } from "../form-actions";
import { DangerConfirm } from "../danger-confirm";
import type { DangerConfirmProps } from "../danger-confirm";
import { ConfirmProvider, useConfirm } from "../confirm-dialog";
import type { ConfirmFn } from "../confirm-dialog";
import { ReauthDialog } from "../reauth-dialog";
import { WriteLockProvider } from "../write-lock";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * 0.23 — keksdose G3 (FormActions' Cancel variant and size), G4a (DangerConfirm's held
 * confirm says which guard is open), G4b (`onConfirm` hears what the guards were
 * answered with), and the later list: useConfirm's typed field is TypedConfirmField,
 * ReauthDialog's is CurrentPasswordInput.
 */

describe("FormActions — cancelVariant and size (keksdose G3)", () => {
  it("defaults stay: an outlined Cancel and md buttons", () => {
    render(<FormActions onCancel={() => {}} destructive={{ label: "Delete", onClick: () => {} }} />);
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(cancel.className).toContain("border-[var(--border)]");
    for (const name of ["Cancel", "Save", "Delete"]) {
      const cls = screen.getByRole("button", { name }).className;
      expect(cls).toContain("px-3 py-2 text-sm");
      expect(cls).not.toContain("text-xs");
    }
  });

  it("cancelVariant=\"ghost\" draws Cancel without an outline, leaving Save alone", () => {
    render(<FormActions onCancel={() => {}} cancelVariant="ghost" />);
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(cancel.className).toContain("bg-transparent");
    expect(cancel.className).not.toContain("border-[var(--border)]");
    expect(screen.getByRole("button", { name: "Save" }).className).toContain("bg-[var(--brand)]");
  });

  it("size=\"sm\" shrinks every button the row draws — Save, Cancel and the destructive data form", () => {
    render(<FormActions size="sm" onCancel={() => {}} destructive={{ label: "Delete", onClick: () => {} }} />);
    for (const name of ["Cancel", "Save", "Delete"]) {
      const cls = screen.getByRole("button", { name }).className;
      expect(cls).toContain("px-2 py-1 text-xs");
      expect(cls).not.toContain("text-sm");
    }
  });

  it("at sm the submit icon and the spinner shrink with the text", () => {
    const { container, rerender } = render(<FormActions size="sm" submitIcon={Check} onSubmit={() => {}} />);
    const icon = container.querySelector("button svg");
    expect(icon?.getAttribute("class")).toContain("size-3.5");
    rerender(<FormActions size="sm" submitIcon={Check} onSubmit={() => {}} pending />);
    const save = screen.getByRole("button", { name: "Save" });
    expect(save.querySelector("svg")).toBeNull();
    expect(save.innerHTML).toContain("size-3.5");
    rerender(<FormActions submitIcon={Check} onSubmit={() => {}} />);
    expect(container.querySelector("button svg")?.getAttribute("class")).toContain("size-4");
  });

  it("a `size` in submitProps still wins for Save, as before", () => {
    render(<FormActions size="sm" onCancel={() => {}} submitProps={{ size: "md" }} />);
    expect(screen.getByRole("button", { name: "Save" }).className).toContain("text-sm");
    expect(screen.getByRole("button", { name: "Cancel" }).className).toContain("text-xs");
  });

  it("a small Save keeps its disabled reason and its pending guard", () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      <FormActions size="sm" onSubmit={onSubmit} submitDisabled submitDisabledReason="Pick a plan first" />,
    );
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toHaveAttribute("aria-disabled", "true");
    expect(save).toHaveAccessibleDescription("Pick a plan first");
    fireEvent.click(save);
    expect(onSubmit).not.toHaveBeenCalled();
    rerender(<FormActions size="sm" onSubmit={onSubmit} pending />);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("aria-busy", "true");
  });
});

/** The armed tile's confirm, looked up afresh — a held one sits in Button's Tooltip,
 *  so it is a new node once it turns ready. */
const confirmButton = (name = "Delete") => screen.getByRole("button", { name });

describe("DangerConfirm — a held confirm says which guard is open (keksdose G4a)", () => {
  it("is focusable and names the open guard in the tooltip and the description", async () => {
    const user = userEvent.setup();
    render(<DangerConfirm armed phrase="DELETE" onConfirm={() => {}} />);
    const confirm = confirmButton();
    expect(confirm).toHaveAttribute("aria-disabled", "true");
    expect(confirm).not.toBeDisabled();
    expect(confirm).toHaveAccessibleDescription("Type “DELETE” to confirm");
    await user.hover(confirm);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Type “DELETE” to confirm");
    await user.unhover(confirm);
    // The field first, then the held confirm: Tab reaches it.
    await user.click(screen.getByLabelText("Type “DELETE” to confirm"));
    await user.tab();
    await user.tab();
    expect(confirmButton()).toHaveFocus();
  });

  it("pressing it, clicking it or Enter in a field does not confirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DangerConfirm armed phrase="DELETE" requirePassword onConfirm={onConfirm} />);
    await user.click(confirmButton());
    await user.type(screen.getByLabelText("Type “DELETE” to confirm"), "DEL{Enter}");
    await user.type(screen.getByLabelText("Password"), "pw{Enter}");
    confirmButton().focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onConfirm).not.toHaveBeenCalled();
    // Still armed, the fields as typed.
    expect(screen.getByLabelText("Type “DELETE” to confirm")).toHaveValue("DEL");
    expect(screen.getByLabelText("Password")).toHaveValue("pw");
  });

  it("names the FIRST open guard in reading order: tick, then phrase, then password", async () => {
    const user = userEvent.setup();
    render(<DangerConfirm armed requireAcknowledge phrase="wipe" requirePassword onConfirm={() => {}} />);
    expect(confirmButton()).toHaveAccessibleDescription("Tick the box to confirm");
    await user.click(screen.getByRole("checkbox"));
    expect(confirmButton()).toHaveAccessibleDescription("Type “wipe” to confirm");
    await user.type(screen.getByLabelText("Type “wipe” to confirm"), "wipe");
    expect(confirmButton()).toHaveAccessibleDescription("Enter your password to confirm");
    await user.type(screen.getByLabelText("Password"), "pw");
    expect(confirmButton()).not.toHaveAttribute("aria-disabled");
    expect(confirmButton()).not.toHaveAccessibleDescription();
    // Untick again: the tick is what holds it once more.
    await user.click(screen.getByRole("checkbox"));
    expect(confirmButton()).toHaveAccessibleDescription("Tick the box to confirm");
  });

  it("a write lock's reason wins over a guard's", () => {
    render(
      <WriteLockProvider locked reason="Read-only demo — saving is disabled.">
        <DangerConfirm armed commit requirePassword onConfirm={() => {}} />
      </WriteLockProvider>,
    );
    const confirm = confirmButton();
    expect(confirm).toHaveAttribute("aria-disabled", "true");
    expect(confirm).toHaveAccessibleDescription("Read-only demo — saving is disabled.");
  });

  it("an own lockedReason wins over a guard's too", () => {
    render(<DangerConfirm armed phrase="ok" lockedReason="Shared with you to read." onConfirm={() => {}} />);
    expect(confirmButton()).toHaveAccessibleDescription("Shared with you to read.");
  });

  it("while busy it is plainly disabled, with no reason — the spinner is the state", () => {
    render(<DangerConfirm armed requirePassword busy onConfirm={() => {}} />);
    const confirm = confirmButton();
    expect(confirm).toBeDisabled();
    expect(confirm).not.toHaveAccessibleDescription();
  });

  it("takes the reasons from the provider's dangerConfirm namespace, a prop winning", () => {
    const { rerender } = render(
      <UiKitProvider
        labels={{
          dangerConfirm: {
            needsAcknowledge: "Bitte das Kästchen ankreuzen",
            needsPhrase: (p) => `„${p}“ eintippen`,
            needsPassword: "Passwort eingeben",
          },
        }}
      >
        <DangerConfirm armed requireAcknowledge onConfirm={() => {}} />
      </UiKitProvider>,
    );
    expect(confirmButton()).toHaveAccessibleDescription("Bitte das Kästchen ankreuzen");
    rerender(
      <UiKitProvider labels={{ dangerConfirm: { needsPhrase: (p) => `„${p}“ eintippen` } }}>
        <DangerConfirm armed phrase="weg" onConfirm={() => {}} />
      </UiKitProvider>,
    );
    expect(confirmButton()).toHaveAccessibleDescription("„weg“ eintippen");
    // A finished string, per instance.
    rerender(<DangerConfirm armed phrase="DELETE" onConfirm={() => {}} labels={{ needsPhrase: "Type DELETE first" }} />);
    expect(confirmButton()).toHaveAccessibleDescription("Type DELETE first");
    rerender(<DangerConfirm armed requirePassword onConfirm={() => {}} labels={{ needsPassword: "Your password, please" }} />);
    expect(confirmButton()).toHaveAccessibleDescription("Your password, please");
  });

  it("a tile with no guards has a ready confirm and no reason", () => {
    render(<DangerConfirm armed onConfirm={() => {}} />);
    expect(confirmButton()).not.toHaveAttribute("aria-disabled");
    expect(confirmButton()).toBeEnabled();
  });
});

describe("DangerConfirm — onConfirm hears the guards' answers (keksdose G4b)", () => {
  it("passes the typed phrase trimmed, the user's case kept, under caseless", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DangerConfirm armed phrase="user@example.com" phraseMatch="caseless" onConfirm={onConfirm} />);
    await user.type(screen.getByLabelText("Type “user@example.com” to confirm"), " User@Example.com {Enter}");
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith(undefined, { typed: "User@Example.com" });
  });

  it("passes it exactly as typed under exact", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DangerConfirm armed phrase="DELETE" phraseMatch="exact" onConfirm={onConfirm} />);
    await user.type(screen.getByLabelText("Type “DELETE” to confirm"), "DELETE{Enter}");
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith(undefined, { typed: "DELETE" });
  });

  it("carries every guard asked for, and only those", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DangerConfirm armed requireAcknowledge phrase="wipe" requirePassword onConfirm={onConfirm} />);
    await user.click(screen.getByRole("checkbox"));
    await user.type(screen.getByLabelText("Type “wipe” to confirm"), "wipe ");
    await user.type(screen.getByLabelText("Password"), "s3cret");
    await user.click(confirmButton());
    expect(onConfirm).toHaveBeenCalledOnce();
    const [password, values] = onConfirm.mock.calls[0] as Parameters<DangerConfirmProps["onConfirm"]>;
    expect(password).toBe("s3cret");
    expect(values).toStrictEqual({ typed: "wipe", password: "s3cret", acknowledged: true });
  });

  it("with no guards the values are empty", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DangerConfirm armed onConfirm={onConfirm} />);
    await user.click(confirmButton());
    expect(onConfirm.mock.calls[0]).toStrictEqual([undefined, {}]);
  });

  it("keeps a one-argument handler working, and a promise still disarms the tile", async () => {
    const user = userEvent.setup();
    const seen: Array<string | undefined> = [];
    // The pre-0.23 shape, typed as callers wrote it.
    const legacy = (password?: string) => {
      seen.push(password);
      return Promise.resolve();
    };
    render(<DangerConfirm requirePassword onConfirm={legacy} />);
    await user.click(screen.getByRole("button", { name: "Delete…" }));
    await user.type(screen.getByLabelText("Password"), "pw{Enter}");
    await act(async () => {});
    expect(seen).toEqual(["pw"]);
    expect(screen.getByRole("button", { name: "Delete…" })).toBeInTheDocument();
  });

  it("an admin row's confirm maps onto keksdose's request body", async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    function AdminRow({ typeEmail }: { typeEmail: boolean }) {
      return (
        <DangerConfirm
          armed
          phrase={typeEmail ? "user@example.com" : undefined}
          phraseMatch="caseless"
          requireAcknowledge={!typeEmail}
          onConfirm={(_password, { typed }) => send({ acknowledged: true, confirm_email: typed ?? null })}
        />
      );
    }
    const { rerender } = render(<AdminRow typeEmail />);
    await user.type(screen.getByRole("textbox"), "user@example.com{Enter}");
    expect(send).toHaveBeenLastCalledWith({ acknowledged: true, confirm_email: "user@example.com" });
    rerender(<AdminRow typeEmail={false} />);
    await user.click(screen.getByRole("checkbox"));
    await user.click(confirmButton());
    expect(send).toHaveBeenLastCalledWith({ acknowledged: true, confirm_email: null });
  });
});

/** Captures the hook's function so a test can call it outside a handler. */
function Capture({ onReady }: { onReady: (fn: ConfirmFn) => void }) {
  onReady(useConfirm());
  return null;
}

describe("useConfirm requireTyped — built from TypedConfirmField (later list)", () => {
  async function open(options: Parameters<ConfirmFn>[0], wrap?: (node: React.ReactNode) => React.ReactNode) {
    let confirm!: ConfirmFn;
    const tree = (
      <ConfirmProvider>
        <Capture onReady={(fn) => (confirm = fn)} />
      </ConfirmProvider>
    );
    render(<>{wrap ? wrap(tree) : tree}</>);
    let answer!: Promise<boolean>;
    await act(async () => {
      answer = confirm(options);
    });
    return { answer };
  }

  it("is the kit field: keyboard left alone, data-matched, labelled by confirmDialog.typed", async () => {
    const { answer } = await open({ title: "Deactivate?", requireTyped: "user@example.com" });
    const field = screen.getByLabelText("Type “user@example.com” to confirm");
    expect(field).toHaveFocus();
    expect(field).toHaveAttribute("autocomplete", "off");
    expect(field).toHaveAttribute("autocapitalize", "off");
    expect(field).toHaveAttribute("spellcheck", "false");
    expect(field).not.toHaveAttribute("data-matched");
    fireEvent.change(field, { target: { value: " USER@example.com " } });
    expect(field).toHaveAttribute("data-matched", "true");
    const dialog = screen.getByRole("alertdialog");
    const go = within(dialog).getByRole("button", { name: "Confirm" });
    expect(go).toBeEnabled();
    fireEvent.submit(field.closest("form")!);
    expect(await answer).toBe(true);
  });

  it("takes no placeholder from the dangerConfirm namespace — the field never had one", async () => {
    await open({ title: "Delete?", requireTyped: "DELETE", typedMatch: "exact" }, (tree) => (
      <UiKitProvider labels={{ dangerConfirm: { phrasePlaceholder: (p) => p } }}>{tree}</UiKitProvider>
    ));
    const field = screen.getByLabelText("Type “DELETE” to confirm");
    expect(field.getAttribute("placeholder")?.trim() ?? "").toBe("");
  });
});

describe("ReauthDialog — built from CurrentPasswordInput (later list)", () => {
  it("is the current-password field, labelled by reauthDialog.password, not dangerConfirm's", async () => {
    render(
      <UiKitProvider labels={{ dangerConfirm: { password: "Passwort" } }}>
        <ReauthDialog onSubmit={() => {}} onClose={() => {}} />
      </UiKitProvider>,
    );
    const field = await screen.findByLabelText("Current password");
    expect(field).toHaveAttribute("type", "password");
    expect(field).toHaveAttribute("autocomplete", "current-password");
    expect(screen.queryByLabelText("Passwort")).toBeNull();
  });

  it("keeps its error under the field and read-only while busy", async () => {
    function Harness() {
      const [busy, setBusy] = useState(false);
      return (
        <ReauthDialog
          busy={busy}
          error="Wrong password"
          onSubmit={() => setBusy(true)}
          onClose={() => {}}
        />
      );
    }
    const user = userEvent.setup();
    render(<Harness />);
    const field = await screen.findByLabelText("Current password");
    expect(field).toHaveAccessibleDescription("Wrong password");
    expect(field).toHaveAttribute("aria-invalid", "true");
    await user.type(field, "pw{Enter}");
    expect(field).toHaveAttribute("readonly");
    expect(field).not.toBeDisabled();
  });
});
