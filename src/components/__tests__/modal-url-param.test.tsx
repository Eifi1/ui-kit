import { useEffect } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Modal } from "../modal";
import { DialogFrame } from "../dialog-frame";
import { useDialogParam } from "../../hooks/use-search-param-state";
import { OVERLAY_EXIT_MS } from "../../hooks/use-close-transition";

/**
 * `Modal urlParam` (0.12.0): the open state is a search param, the opener pushes an
 * entry so Back closes the dialog, a close goes back over that entry, and the
 * dialog's own throwaway history entry (useOverlayHistory) stays off.
 */

const motion = (reduced: boolean) =>
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? reduced : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });

let loc: ReturnType<typeof useLocation> | null = null;
let nav: ReturnType<typeof useNavigate> | null = null;

function Page({ onClose = () => {}, frame = false }: { onClose?: () => void; frame?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    loc = location;
    nav = navigate;
  });
  const [, setOpen] = useDialogParam({ key: "dialog", value: "edit" });
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {frame ? (
        <DialogFrame urlParam={{ key: "dialog", value: "edit" }} onClose={onClose} title="Edit" closeButton>
          <input aria-label="name" />
        </DialogFrame>
      ) : (
        <Modal urlParam={{ key: "dialog", value: "edit" }} onClose={onClose} aria-label="Edit">
          <input aria-label="name" />
        </Modal>
      )}
    </>
  );
}

function renderAt(url: string, props: Parameters<typeof Page>[0] = {}) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Page {...props} />
    </MemoryRouter>,
  );
}

const sentinel = () =>
  (window.history.state as Record<string, unknown> | null)?.["__hbUiOverlayHistory"] ?? null;

beforeEach(() => {
  motion(true);
  window.history.replaceState(null, "");
});
afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
});

describe("Modal urlParam", () => {
  it("is open exactly while the param is in the URL", () => {
    renderAt("/leases");
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog", { name: "Edit" })).toBeInTheDocument();
    expect(new URLSearchParams(loc!.search).get("dialog")).toBe("edit");
  });

  it("closes by going back over the entry its opener pushed, then calls onClose", () => {
    const onClose = vi.fn();
    renderAt("/leases", { onClose });
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(loc!.search).toBe("");
    // Back where we started — the page's own first entry, no dead dialog entry.
    expect(loc!.key).toBe("default");
  });

  it("closes on the Back gesture", () => {
    renderAt("/leases");
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    act(() => nav!(-1));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens from a deep link, and closing then removes the param in place", () => {
    renderAt("/leases?dialog=edit&tab=2");
    expect(screen.getByRole("dialog", { name: "Edit" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    const sp = new URLSearchParams(loc!.search);
    expect(sp.get("dialog")).toBeNull();
    expect(sp.get("tab")).toBe("2");
  });

  it("does not push its own Back-gesture entry on top of the param's", async () => {
    renderAt("/leases?dialog=edit");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(sentinel()).toBeNull();
  });

  it("plays the exit and stays closed", async () => {
    motion(false);
    const onClose = vi.fn();
    renderAt("/leases", { onClose });
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    // Lowering, not gone yet.
    expect(document.querySelector("[aria-modal='true']")!.className).toContain("animate-sheet-out");
    await waitFor(() => expect(document.querySelector("[aria-modal='true']")).toBeNull(), {
      timeout: OVERLAY_EXIT_MS * 5,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(loc!.search).toBe(""));
    await act(async () => {
      await new Promise((r) => setTimeout(r, OVERLAY_EXIT_MS));
    });
    expect(document.querySelector("[aria-modal='true']")).toBeNull();
  });

  it("works through DialogFrame, whose X closes it", () => {
    renderAt("/leases?dialog=edit", { frame: true });
    expect(screen.getByRole("dialog", { name: "Edit" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(loc!.search).toBe("");
  });
});
