import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConfirmProvider, useConfirm } from "../confirm-dialog";
import type { ConfirmFn } from "../confirm-dialog";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * `useConfirm()` replaces `window.confirm` across all three apps (keksdose 20+ calls,
 * kastlan 7, lenkbank 1). What has to hold is the call-site contract — `if (!(await
 * confirm({…}))) return` — and that only the confirm button can answer yes.
 */

/** Captures the hook's function so a test can call it outside a handler. */
function Capture({ onReady }: { onReady: (fn: ConfirmFn) => void }) {
  onReady(useConfirm());
  return <button type="button">trigger</button>;
}

function setup(wrapper?: (node: React.ReactNode) => React.ReactNode) {
  let confirm!: ConfirmFn;
  const tree = (
    <ConfirmProvider>
      <Capture onReady={(fn) => (confirm = fn)} />
    </ConfirmProvider>
  );
  const utils = render(<>{wrapper ? wrapper(tree) : tree}</>);
  return { ...utils, confirm: () => confirm };
}

/** Opens one confirm inside `act` and hands back its (still pending) answer — boxed,
 *  because an async function returning a promise would await it for us. */
async function ask(confirm: ConfirmFn, options: Parameters<ConfirmFn>[0]) {
  let answer!: Promise<boolean>;
  await act(async () => {
    answer = confirm(options);
  });
  return { answer };
}

describe("useConfirm", () => {
  it("resolves true from the confirm button, and names and describes the dialog", async () => {
    const { confirm } = setup();
    const { answer } = await ask(confirm(), { title: "Delete budget?", body: "This cannot be undone.", confirmLabel: "Delete" });
    const dialog = await screen.findByRole("alertdialog", { name: "Delete budget?" });
    expect(dialog).toHaveAccessibleDescription("This cannot be undone.");
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(await answer).toBe(true);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it.each([
    ["Cancel", () => fireEvent.click(screen.getByRole("button", { name: "Cancel" }))],
    ["Escape", () => fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" })],
    [
      "the backdrop",
      () => {
        const backdrop = screen.getByRole("alertdialog").parentElement!;
        fireEvent.mouseDown(backdrop);
        fireEvent.mouseUp(backdrop);
      },
    ],
  ])("resolves false from %s", async (_, dismiss) => {
    const { confirm } = setup();
    const { answer } = await ask(confirm(), { title: "Leave?" });
    await screen.findByRole("alertdialog");
    await act(async () => dismiss());
    expect(await answer).toBe(false);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("drops into an `if (!(await confirm())) return` site", async () => {
    const ran: string[] = [];
    function Page() {
      const confirm = useConfirm();
      return (
        <button
          type="button"
          onClick={async () => {
            if (!(await confirm({ title: "Remove row?", tone: "danger", confirmLabel: "Remove" }))) return;
            ran.push("removed");
          }}
        >
          Remove
        </button>
      );
    }
    render(
      <ConfirmProvider>
        <Page />
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(ran).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog, "Remove"));
    await waitFor(() => expect(ran).toEqual(["removed"]));
  });

  it("focuses Cancel for danger and Confirm otherwise, and hands focus back", async () => {
    const { confirm } = setup();
    const trigger = screen.getByRole("button", { name: "trigger" });
    trigger.focus();

    const { answer: danger } = await ask(confirm(), { title: "Delete?", tone: "danger" });
    expect(await screen.findByRole("button", { name: "Cancel" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await danger;
    expect(trigger).toHaveFocus();

    for (const tone of ["warning", "neutral", undefined] as const) {
      const { answer } = await ask(confirm(), { title: `Go on (${tone})?`, tone });
      expect(await screen.findByRole("button", { name: "Confirm" })).toHaveFocus();
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
      expect(await answer).toBe(true);
      expect(trigger).toHaveFocus();
    }
  });

  it("styles the confirm as destructive only for danger", async () => {
    const { confirm } = setup();
    await ask(confirm(), { title: "Delete?", tone: "danger", confirmLabel: "Delete" });
    expect(screen.getByRole("button", { name: "Delete" }).className).toContain("bg-[var(--danger)]");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

    await ask(confirm(), { title: "Archive?", tone: "warning", confirmLabel: "Archive" });
    expect(screen.getByRole("button", { name: "Archive" }).className).not.toContain("bg-[var(--danger)]");
  });

  it("queues a second confirm and answers each one separately", async () => {
    const { confirm } = setup();
    const { answer: first } = await ask(confirm(), { title: "First?" });
    const { answer: second } = await ask(confirm(), { title: "Second?" });

    // Only one dialog at a time, and it is the first.
    expect(screen.getAllByRole("alertdialog")).toHaveLength(1);
    expect(screen.getByRole("alertdialog", { name: "First?" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await first).toBe(false);
    expect(await screen.findByRole("alertdialog", { name: "Second?" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await second).toBe(true);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("answers anything still pending false when the provider unmounts", async () => {
    const { confirm, unmount } = setup();
    const { answer } = await ask(confirm(), { title: "Still there?" });
    unmount();
    expect(await answer).toBe(false);
  });

  it("takes its button labels from the confirmDialog namespace, and per call over that", async () => {
    const { confirm } = setup((tree) => (
      <UiKitProvider labels={{ confirmDialog: { confirm: "Bestätigen", cancel: "Abbrechen" } }}>{tree}</UiKitProvider>
    ));
    await ask(confirm(), { title: "Weiter?" });
    expect(screen.getByRole("button", { name: "Bestätigen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

    await ask(confirm(), { title: "Löschen?", confirmLabel: "Löschen", cancelLabel: "Behalten" });
    expect(screen.getByRole("button", { name: "Löschen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Behalten" })).toBeInTheDocument();
  });

  it("returns the same function across renders", () => {
    const seen = new Set<ConfirmFn>();
    function Probe() {
      const [n, setN] = useState(0);
      seen.add(useConfirm());
      return (
        <button type="button" onClick={() => setN(n + 1)}>
          rerender
        </button>
      );
    }
    render(
      <ConfirmProvider>
        <Probe />
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "rerender" }));
    fireEvent.click(screen.getByRole("button", { name: "rerender" }));
    expect(seen.size).toBe(1);
  });

  it("throws outside a provider rather than falling back to window.confirm", () => {
    function Orphan() {
      useConfirm();
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Orphan />)).toThrow(/ConfirmProvider/);
    spy.mockRestore();
  });
});

/** The dialog's own button by name — the page's trigger can share it ("Remove"). */
function within(dialog: HTMLElement, name: string): HTMLElement {
  const match = Array.from(dialog.querySelectorAll("button")).find((b) => b.textContent === name);
  if (!match) throw new Error(`no "${name}" button in the dialog`);
  return match;
}
