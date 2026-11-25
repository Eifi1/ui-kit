import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CameraCapture } from "../camera-capture";
import { DangerConfirm } from "../danger-confirm";
import { FormActions } from "../form-actions";
import { ReauthDialog } from "../reauth-dialog";
import { NotificationInbox, type NotificationInboxItem } from "../../notifications/notification-inbox";

/**
 * INP-1 + INP-5 (refactor audit 2026-11-22): the button the user just pressed stays a
 * focusable, `aria-disabled` button while its request runs. A native `disabled` drops the
 * focus to <body> in a browser — and out of the dialog's trap — for the whole save.
 *
 * jsdom does no focus fixup on a disabled element, so each case asserts what causes the
 * drop (the native `disabled`) as well as where the focus is.
 */

function expectHeld(button: HTMLElement) {
  expect(button).not.toBeDisabled();
  expect(button).toHaveAttribute("aria-disabled", "true");
  expect(document.activeElement).toBe(button);
}

describe("FormActions' Save while pending", () => {
  it("keeps the focus, says busy, and swallows a second press", () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<FormActions onSubmit={onSubmit} onCancel={() => {}} pendingLabel="Saving…" />);
    const save = screen.getByRole("button", { name: "Save" });
    act(() => save.focus());
    fireEvent.click(save);
    rerender(<FormActions onSubmit={onSubmit} onCancel={() => {}} pending pendingLabel="Saving…" />);
    expectHeld(save);
    expect(save).toHaveAttribute("aria-busy", "true");
    // The look the row had: the spinner in front of the words, which stay visible.
    expect(save).toHaveTextContent("Saving…");
    expect(save.querySelectorAll(".animate-spin")).toHaveLength(1);
    fireEvent.click(save);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not submit its form while pending, by a press or by Enter in a field", () => {
    const onSubmit = vi.fn((e: { preventDefault(): void }) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <input aria-label="Name" />
        <FormActions pending />
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("DangerConfirm's confirm while busy", () => {
  it("keeps the focus on the confirm that was pressed", async () => {
    const user = userEvent.setup();
    render(<DangerConfirm onConfirm={() => new Promise<void>(() => {})} />);
    await user.click(screen.getByRole("button", { name: "Delete…" }));
    const confirm = screen.getByRole("button", { name: "Delete" });
    await user.click(confirm);
    expectHeld(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("button", { name: "Delete" })).toHaveAttribute("aria-busy", "true");
  });
});

describe("ReauthDialog's submit while busy", () => {
  it("keeps the focus on the submit that was pressed, inside the dialog", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => new Promise<void>(() => {}));
    render(<ReauthDialog onSubmit={onSubmit} onClose={() => {}} />);
    await user.type(await screen.findByLabelText("Current password"), "pw");
    const submit = screen.getByRole("button", { name: "Continue" });
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expectHeld(submit);
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe("CameraCapture while busy", () => {
  beforeEach(() => {
    const stream = { getTracks: () => [] } as unknown as MediaStream;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(() => Promise.resolve(stream)) },
    });
  });
  afterEach(() => {
    Reflect.deleteProperty(navigator, "mediaDevices");
  });

  const props = () => ({ onCapture: vi.fn(), onCancel: vi.fn(), onUnavailable: vi.fn(), onDone: vi.fn() });

  it("refuses its buttons rather than disabling them under the focus", async () => {
    const p = props();
    const { rerender } = render(<CameraCapture {...p} shotCount={1} />);
    const shutter = screen.getByRole("button", { name: "Take the photo" });
    await waitFor(() => expect(shutter).toBeEnabled());
    const x = screen.getByRole("button", { name: "Cancel" });
    act(() => x.focus());
    rerender(<CameraCapture {...p} shotCount={1} busy />);
    expectHeld(x);
    for (const name of ["Take the photo", "Use 1 photo"]) {
      const button = screen.getByRole("button", { name });
      expect(button).not.toBeDisabled();
      expect(button).toHaveAttribute("aria-disabled", "true");
    }
    fireEvent.click(x);
    fireEvent.click(screen.getByRole("button", { name: "Use 1 photo" }));
    expect(p.onCancel).not.toHaveBeenCalled();
    expect(p.onDone).not.toHaveBeenCalled();
  });

  it("puts Back's entry back while busy, so a second Back does not leave the page (INP-5)", async () => {
    window.history.replaceState(null, "");
    const p = props();
    render(<CameraCapture {...p} busy />);
    const sentinel = () => (window.history.state as Record<string, unknown> | null)?.["__hbUiOverlayHistory"];
    expect(sentinel()).toBeTypeOf("string");
    await act(async () => {
      const landed = new Promise<void>((resolve) =>
        window.addEventListener("popstate", () => resolve(), { once: true }),
      );
      window.history.back();
      await landed;
    });
    expect(p.onCancel).not.toHaveBeenCalled();
    expect(sentinel()).toBeTypeOf("string");
  });
});

const ITEMS: NotificationInboxItem<number>[] = [
  {
    id: 1,
    notification_type: "announcements",
    title: "Something new",
    body: "News.",
    url: null,
    created_at: "2026-10-19T08:30:00Z",
    read_at: null,
  },
];

describe("NotificationInbox's header actions", () => {
  const inbox = (props: Partial<Parameters<typeof NotificationInbox<number>>[0]> = {}) => (
    <MemoryRouter>
      <NotificationInbox<number>
        items={ITEMS}
        unreadCount={1}
        onMarkRead={vi.fn()}
        onClear={vi.fn()}
        formatDate={(iso) => iso.slice(0, 10)}
        {...props}
      />
    </MemoryRouter>
  );

  it("keeps the focus on “Mark all as read” while it runs, and after nothing is unread", async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    const onMarkRead = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const { rerender } = render(inbox({ onMarkRead }));
    const mark = screen.getByRole("button", { name: "Mark all as read" });
    await user.click(mark);
    expectHeld(mark);
    await user.click(mark);
    expect(onMarkRead).toHaveBeenCalledTimes(1);
    await act(async () => resolve());
    rerender(inbox({ onMarkRead, unreadCount: 0 }));
    expectHeld(mark);
  });

  it("gives the focus to the inbox's heading once “Clear all” has cleared it", async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    const onClear = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const { rerender } = render(inbox({ onClear }));
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    await act(async () => resolve());
    rerender(inbox({ onClear, items: [], unreadCount: 0 }));
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toHaveTextContent("Inbox");
  });
});
