import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter, useLocation, useSearchParams } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Modal } from "../modal";
import { DialogFrame } from "../dialog-frame";
import { ReauthDialog } from "../reauth-dialog";
import { AdminActionConfirm } from "../../admin/admin-action-confirm";
import { CompleteNameDialog } from "../../auth/complete-name-dialog";
import { PlanSwitchConfirm } from "../../billing/plan-switch";
import { CancelSubscriptionConfirm } from "../../billing/cancel-subscription";
import { useDismissLayer } from "../../hooks/use-dismiss";
import { OVERLAY_EXIT_MS } from "../../hooks/use-close-transition";
import { drainTasks, pressBack } from "../../test/tasks";
import { stubDesktop } from "../../test/viewport";

/**
 * `busy` on `Modal` / `DialogFrame` (refactor audit 2026-10-30, DUP-3).
 *
 * "While the request is in flight, the dialog stays" was written five times as an
 * `onKeyDown` that held Escape and nothing else. The backdrop, Back and the frame's X go
 * through `requestClose` and had no hold, so a backdrop press or Android's Back closed
 * ReauthDialog, AdminActionConfirm, CompleteNameDialog and PlanSwitchConfirm mid-request;
 * CancelSubscriptionConfirm guarded its `onClose`, after the exit had already started, so
 * its panel lowered itself and snapped back.
 */

function liveSentinel(): string | null {
  const state = window.history.state as Record<string, unknown> | null;
  const id = state?.["__hbUiOverlayHistory"];
  return typeof id === "string" ? id : null;
}

/** The panel's exit has started: `useCloseTransition` paints the `-out` classes. */
const lowering = (panel: HTMLElement) => panel.className.split(" ").includes("animate-sheet-out");

function pressBackdrop(panel: HTMLElement) {
  const backdrop = panel.parentElement as HTMLElement;
  fireEvent.mouseDown(backdrop);
  fireEvent.mouseUp(backdrop);
}

/** An Escape layer opened over the dialog, in a later commit (the order a press gives). */
function Above({ onEscape }: { onEscape: () => void }) {
  useDismissLayer(true, onEscape);
  return null;
}

beforeEach(async () => {
  window.history.replaceState(null, "", "/held");
  await drainTasks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Modal busy", () => {
  it("refuses a backdrop press before the exit starts, and lets it through once idle", () => {
    stubDesktop({ reducedMotion: false });
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal busy onClose={onClose} aria-label="Pay">
        <p>body</p>
      </Modal>,
    );
    const panel = screen.getByRole("dialog", { name: "Pay" });
    pressBackdrop(panel);
    expect(lowering(panel)).toBe(false);
    expect(onClose).not.toHaveBeenCalled();

    rerender(
      <Modal busy={false} onClose={onClose} aria-label="Pay">
        <p>body</p>
      </Modal>,
    );
    pressBackdrop(panel);
    expect(lowering(panel)).toBe(true);
  });

  it("takes Escape on its own layer and drops it; a layer above it still closes first", () => {
    const onClose = vi.fn();
    const above = vi.fn();
    const view = (busy: boolean, withAbove: boolean) => (
      <Modal busy={busy} onClose={onClose} aria-label="Pay">
        {withAbove && <Above onEscape={above} />}
      </Modal>
    );
    const { rerender } = render(view(true, false));
    rerender(view(true, true));
    const panel = screen.getByRole("dialog", { name: "Pay" });

    fireEvent.keyDown(panel, { key: "Escape" });
    expect(above).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    rerender(view(true, false));
    // Consumed by the dialog's layer (`fireEvent` answers false for a prevented event).
    expect(fireEvent.keyDown(panel, { key: "Escape" })).toBe(false);
    expect(onClose).not.toHaveBeenCalled();

    rerender(view(false, false));
    fireEvent.keyDown(panel, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("holds the frame's X and an actions(close) Cancel", () => {
    const onClose = vi.fn();
    render(
      <DialogFrame
        busy
        closeButton
        title="Pay"
        onClose={onClose}
        actions={(close) => (
          <button type="button" onClick={close}>
            Cancel
          </button>
        )}
      >
        <p>body</p>
      </DialogFrame>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Pay" })).toBeInTheDocument();
  });

  it("is aria-busy while busy, and keeps a caller's own aria-busy", () => {
    const { rerender } = render(
      <Modal busy onClose={vi.fn()} aria-label="Pay">
        <p>body</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-busy", "true");
    rerender(
      <Modal onClose={vi.fn()} aria-label="Pay">
        <p>body</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-busy");
    rerender(
      <Modal busy={false} aria-busy onClose={vi.fn()} aria-label="Pay">
        <p>body</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-busy", "true");
  });

  it("refuses Back and puts its history entry back, so the next Back closes it, not the page", async () => {
    const onClose = vi.fn();
    const depth = window.history.length;
    const { rerender } = render(
      <Modal busy onClose={onClose} aria-label="Pay">
        <p>body</p>
      </Modal>,
    );
    const entry = liveSentinel();
    expect(entry).not.toBeNull();

    await pressBack();
    await drainTasks();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Pay" })).toBeInTheDocument();
    // Standing on the dialog's own entry again, with nothing pushed on top of it.
    expect(liveSentinel()).toBe(entry);
    expect(window.history.length).toBe(depth + 1);

    rerender(
      <Modal busy={false} onClose={onClose} aria-label="Pay">
        <p>body</p>
      </Modal>,
    );
    await pressBack();
    await drainTasks();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(liveSentinel()).toBeNull();
    expect(window.location.pathname).toBe("/held");
  });

  it("keeps what the page wrote into the address through a held Back, router included (#412)", async () => {
    const onClose = vi.fn();
    function Page({ busy }: { busy: boolean }) {
      const [, setParams] = useSearchParams();
      const { search } = useLocation();
      return (
        <>
          <output data-testid="router">{search}</output>
          <Modal busy={busy} onClose={onClose} aria-label="Pay">
            <button type="button" onClick={() => setParams({ x: "1" }, { replace: true })}>
              Tick
            </button>
          </Modal>
        </>
      );
    }
    const view = (busy: boolean) => (
      <BrowserRouter>
        <Page busy={busy} />
      </BrowserRouter>
    );
    const { rerender } = render(view(true));
    const entry = liveSentinel();
    fireEvent.click(screen.getByRole("button", { name: "Tick" }));

    await pressBack();
    await drainTasks();
    expect(liveSentinel()).toBe(entry);
    expect(window.location.search).toBe("?x=1");
    expect(screen.getByTestId("router")).toHaveTextContent("?x=1");

    rerender(view(false));
    await pressBack();
    await drainTasks();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(liveSentinel()).toBeNull();
    expect(window.location.search).toBe("?x=1");
    expect(screen.getByTestId("router")).toHaveTextContent("?x=1");
  });

  it("a resolved action's own close goes through once the caller's busy drops", async () => {
    let resolve!: () => void;
    const onClose = vi.fn();
    const user = userEvent.setup();
    const view = (busy: boolean) => (
      <ReauthDialog busy={busy} onSubmit={() => new Promise<void>((r) => (resolve = r))} onClose={onClose} />
    );
    const { rerender } = render(view(false));
    await user.type(await screen.findByLabelText("Current password"), "pw{Enter}");
    // The app tracks the mutation too, and its `isPending` may trail the promise.
    rerender(view(true));
    await act(async () => resolve());
    rerender(view(false));
    await waitFor(() => expect(onClose).toHaveBeenCalledWith(true));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

/** Each caller, put into its request; `close` is its "I was dismissed" callback. */
const CALLERS: [name: string, role: "dialog" | "alertdialog", mount: (close: () => void) => Promise<void>][] = [
  [
    "ReauthDialog",
    "dialog",
    async (close) => {
      const user = userEvent.setup();
      render(<ReauthDialog onSubmit={() => new Promise<void>(() => {})} onClose={close} />);
      await user.type(await screen.findByLabelText("Current password"), "pw{Enter}");
    },
  ],
  [
    "AdminActionConfirm",
    "alertdialog",
    async (close) => {
      render(
        <AdminActionConfirm
          level="acknowledge"
          target={{ email: "ada@example.com", first: "Ada", last: "Example" }}
          onConfirm={() => {}}
          onClose={close}
          busy
        />,
      );
    },
  ],
  [
    "CompleteNameDialog",
    "dialog",
    async (close) => {
      const user = userEvent.setup();
      render(
        <CompleteNameDialog
          firstName="Ada"
          lastName="Example"
          onSave={() => new Promise<void>(() => {})}
          onClose={close}
        />,
      );
      await user.click(screen.getByRole("button", { name: "Save" }));
    },
  ],
  [
    "PlanSwitchConfirm",
    "dialog",
    async (close) => {
      render(
        <PlanSwitchConfirm
          open
          onClose={close}
          from={{ plan: "pro", interval: "month" }}
          to={{ plan: "business", interval: "year" }}
          preview={{
            currency: "EUR",
            now_minor: 1200,
            plan: "business",
            interval: "year",
            over_limit: [],
            limits: {},
            usage: {},
          }}
          onConfirm={() => {}}
          pending
        />,
      );
    },
  ],
  [
    "CancelSubscriptionConfirm",
    "dialog",
    async (close) => {
      render(<CancelSubscriptionConfirm open onClose={close} periodEnd="2026-11-09" onConfirm={() => {}} pending />);
    },
  ],
];

describe("the five dialogs that hold while their request runs", () => {
  it.each(CALLERS)("%s: neither the backdrop nor Back lowers it mid-request", async (_name, role, mount) => {
    stubDesktop({ reducedMotion: false });
    const close = vi.fn();
    await mount(close);
    const panel = screen.getByRole(role);
    expect(panel).toHaveAttribute("aria-busy", "true");
    const entry = liveSentinel();

    pressBackdrop(panel);
    expect(lowering(panel)).toBe(false);

    await pressBack();
    await drainTasks();
    expect(lowering(screen.getByRole(role))).toBe(false);
    expect(liveSentinel()).toBe(entry);
    expect(close).not.toHaveBeenCalled();
  });

  it("PlanSwitchConfirm: a preview that loads is busy, but not held", () => {
    const close = vi.fn();
    render(
      <PlanSwitchConfirm
        open
        onClose={close}
        from={{ plan: "pro", interval: "month" }}
        to={{ plan: "business", interval: "year" }}
        onConfirm={() => {}}
      />,
    );
    const panel = screen.getByRole("dialog");
    expect(panel).toHaveAttribute("aria-busy", "true");
    pressBackdrop(panel);
    expect(close).toHaveBeenCalledOnce();
  });

  it("CancelSubscriptionConfirm closes on the backdrop once the cancel has answered", async () => {
    stubDesktop({ reducedMotion: false });
    function Page() {
      const [open, setOpen] = useState(true);
      return (
        <CancelSubscriptionConfirm
          open={open}
          onClose={() => setOpen(false)}
          periodEnd="2026-11-09"
          onConfirm={() => {}}
        />
      );
    }
    render(<Page />);
    pressBackdrop(screen.getByRole("dialog"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: OVERLAY_EXIT_MS * 5 });
  });
});
