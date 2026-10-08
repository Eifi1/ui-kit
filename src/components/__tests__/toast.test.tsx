import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Toaster, toast } from "../toast";
import { UiKitProvider } from "../../i18n/kit-labels";
import { createThemeStore } from "../../theme/theme-store";

/**
 * The kit `<Toaster>` against the REAL sonner: what reaches the screen. The call
 * shapes are pinned against a mock in toast-api.test.tsx.
 */

const toaster = () => document.querySelector<HTMLElement>("[data-sonner-toaster]");

afterEach(async () => {
  act(() => toast.dismiss());
  cleanup();
  document.documentElement.classList.remove("dark");
  vi.unstubAllGlobals();
  // sonner removes a dismissed toast after its exit animation.
  await new Promise((r) => setTimeout(r, 250));
});

/** Mount and wait for the lazy import to deliver sonner's Toaster. */
async function mount(ui = <Toaster />) {
  const view = render(ui);
  await waitFor(() => expect(document.querySelector("section[aria-live]")).not.toBeNull());
  return view;
}

describe("<Toaster> — the provider's labels", () => {
  it("names the region, the close button and the undo action from UiKitProvider", async () => {
    await mount(
      <UiKitProvider
        labels={{
          toast: { notifications: "Benachrichtigungen", close: "Benachrichtigung schließen", undo: "Rückgängig" },
        }}
      >
        <Toaster />
      </UiKitProvider>,
    );
    const onUndo = vi.fn();
    act(() => {
      toast.undo("Buchung gelöscht", { onUndo });
    });
    const action = await screen.findByRole("button", { name: "Rückgängig" });
    expect(screen.getByRole("button", { name: "Benachrichtigung schließen" })).toBeInTheDocument();
    expect(document.querySelector("section[aria-live]")?.getAttribute("aria-label")).toMatch(
      /^Benachrichtigungen/,
    );
    fireEvent.click(action);
    expect(onUndo).toHaveBeenCalledOnce();
  });

  it("falls back to English without a provider", async () => {
    await mount();
    act(() => {
      toast.undo("Deleted", { onUndo: () => {} });
    });
    expect(await screen.findByRole("button", { name: "Undo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close notification" })).toBeInTheDocument();
  });
});

describe("<Toaster> — the action is reachable and announced", () => {
  it("renders the action as a focusable button inside the polite live region", async () => {
    await mount();
    act(() => {
      toast.success("Archived", { action: { label: "Open", onClick: () => {} } });
    });
    const button = await screen.findByRole("button", { name: "Open" });
    const region = button.closest("section");
    expect(region).toHaveAttribute("aria-live", "polite");
    // The message and the action's label are in the same toast, so they are read together.
    expect(button.closest("[data-sonner-toast]")).toHaveTextContent("Archived");
    button.focus();
    expect(button).toHaveFocus();
  });
});

describe("<Toaster> — same id", () => {
  it("replaces the older toast instead of stacking a second", async () => {
    await mount();
    act(() => {
      toast.success("First version", { id: "save" });
    });
    await screen.findByText("First version");
    act(() => {
      toast.success("Second version", { id: "save" });
    });
    await screen.findByText("Second version");
    expect(screen.queryByText("First version")).toBeNull();
    expect(document.querySelectorAll("[data-sonner-toast]")).toHaveLength(1);
  });

  it("turns a promise's loading toast into its success in place", async () => {
    await mount();
    let resolve!: () => void;
    act(() => {
      toast.promise(new Promise<void>((r) => (resolve = r)), { loading: "Uploading…", success: "Uploaded" });
    });
    await screen.findByText("Uploading…");
    await act(async () => resolve());
    await screen.findByText("Uploaded");
    expect(screen.queryByText("Uploading…")).toBeNull();
  });
});

describe("<Toaster> — redact", () => {
  it("puts the message and the description under data-private", async () => {
    await mount();
    act(() => {
      toast.info("IBAN DE89", { redact: true, description: "Konto 42" });
    });
    expect((await screen.findByText("IBAN DE89")).closest("[data-private]")).not.toBeNull();
    expect(screen.getByText("Konto 42").closest("[data-private]")).not.toBeNull();
  });
});

describe("<Toaster> — theme", () => {
  it("follows the .dark class the kit's theme store puts on <html>", async () => {
    const { useTheme, useApplyTheme } = createThemeStore("toast-test-theme");
    function App() {
      useApplyTheme();
      return <Toaster />;
    }
    act(() => useTheme.getState().setMode("light"));
    await mount(<App />);
    act(() => {
      toast("Hello");
    });
    await screen.findByText("Hello");
    expect(toaster()).toHaveAttribute("data-sonner-theme", "light");
    act(() => useTheme.getState().setMode("dark"));
    await waitFor(() => expect(toaster()).toHaveAttribute("data-sonner-theme", "dark"));
    act(() => useTheme.getState().setMode("light"));
    await waitFor(() => expect(toaster()).toHaveAttribute("data-sonner-theme", "light"));
  });

  it("takes an explicit theme over the document's", async () => {
    document.documentElement.classList.add("dark");
    await mount(<Toaster theme="light" />);
    act(() => {
      toast("Explicit");
    });
    await screen.findByText("Explicit");
    expect(toaster()).toHaveAttribute("data-sonner-theme", "light");
  });
});

describe("<Toaster> — placement and paint", () => {
  it("is top-center below the top bar on desktop, above every overlay", async () => {
    await mount();
    act(() => {
      toast("Desktop");
    });
    await screen.findByText("Desktop");
    const el = toaster()!;
    expect(el).toHaveAttribute("data-y-position", "top");
    expect(el).toHaveAttribute("data-x-position", "center");
    expect(el.style.getPropertyValue("--offset-top")).toContain("4rem");
    expect(el.style.zIndex).toBe("var(--z-toast, 2147483647)");
    expect(el.className).toContain("kit-toaster");
    // The AlertBanner tokens, not sonner's palette.
    expect(el.style.getPropertyValue("--success-bg")).toBe("var(--toast-success-bg)");
    expect(el.style.getPropertyValue("--error-text")).toBe("var(--danger)");
  });

  it("is bottom-center above the bottom nav and the safe area on a phone", async () => {
    vi.stubGlobal(
      "matchMedia",
      (query: string) =>
        ({
          matches: query.includes("width < 768px"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    await mount();
    act(() => {
      toast("Phone");
    });
    await screen.findByText("Phone");
    const el = toaster()!;
    expect(el).toHaveAttribute("data-y-position", "bottom");
    for (const v of ["--offset-bottom", "--mobile-offset-bottom"]) {
      const bottom = el.style.getPropertyValue(v);
      expect(bottom).toContain("var(--app-nav-h, 0px)");
      expect(bottom).toContain("safe-area-inset-bottom");
    }
  });

  it("takes navOffset and a position override", async () => {
    await mount(<Toaster position="bottom-right" navOffset={72} />);
    act(() => {
      toast("Override");
    });
    await screen.findByText("Override");
    const el = toaster()!;
    expect(el).toHaveAttribute("data-x-position", "right");
    expect(el.style.getPropertyValue("--offset-bottom")).toContain("72px");
  });
});

describe("<Toaster> — dismissOnMiddleClick (0.18.0)", () => {
  const middle = (el: Element, type: "auxclick" | "mousedown" = "auxclick", button = 1) => {
    const e = new MouseEvent(type, { bubbles: true, cancelable: true, button });
    el.dispatchEvent(e);
    return e;
  };
  const gone = (text: string) => waitFor(() => expect(screen.queryByText(text)).toBeNull());

  it("dismisses the toast under a middle click by id — with no close button — and reports it as the user's", async () => {
    await mount();
    const onDismiss = vi.fn();
    act(() => {
      toast.success("No close button", { closeButton: false, onDismiss });
    });
    const title = await screen.findByText("No close button");
    expect(title.closest("[data-sonner-toast]")?.querySelector("[data-close-button]")).toBeNull();
    // The mousedown is taken too: the middle button would start autoscroll.
    expect(middle(title, "mousedown").defaultPrevented).toBe(true);
    let e!: MouseEvent;
    act(() => {
      e = middle(title);
    });
    expect(e.defaultPrevented).toBe(true);
    await gone("No close button");
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("dismisses only the toast that was clicked, with a number id too", async () => {
    await mount();
    act(() => {
      toast("Keep me", { id: 1 });
      toast("Close me", { id: 2 });
    });
    const target = await screen.findByText("Close me");
    act(() => {
      middle(target);
    });
    await gone("Close me");
    expect(screen.getByText("Keep me")).toBeInTheDocument();
  });

  it("leaves a link's middle click alone (open in a new tab), and buttons inside the toast", async () => {
    await mount();
    act(() => {
      toast("Report ready", {
        description: <a href="/reports/7">Open report</a>,
        action: { label: "Share", onClick: () => {} },
      });
    });
    const link = await screen.findByRole("link", { name: "Open report" });
    expect(middle(link, "mousedown").defaultPrevented).toBe(false);
    expect(middle(link).defaultPrevented).toBe(false);
    expect(middle(screen.getByRole("button", { name: "Share" })).defaultPrevented).toBe(false);
    await new Promise((r) => setTimeout(r, 250));
    expect(screen.getByText("Report ready")).toBeInTheDocument();
  });

  it("ignores other buttons, `dismissible: false` and dismissOnMiddleClick={false}", async () => {
    const view = await mount();
    act(() => {
      toast("Right click", { id: "r" });
      toast("Pinned", { id: "p", dismissible: false });
    });
    expect(middle(await screen.findByText("Right click"), "auxclick", 2).defaultPrevented).toBe(false);
    expect(middle(screen.getByText("Pinned")).defaultPrevented).toBe(false);
    view.rerender(<Toaster dismissOnMiddleClick={false} />);
    expect(middle(screen.getByText("Right click")).defaultPrevented).toBe(false);
    await new Promise((r) => setTimeout(r, 250));
    expect(screen.getByText("Right click")).toBeInTheDocument();
    expect(screen.getByText("Pinned")).toBeInTheDocument();
  });

  it("falls back to the close button for a toast sonner made without the kit", async () => {
    await mount();
    const { toast: raw } = await import("sonner");
    const onDismiss = vi.fn();
    act(() => {
      raw("From sonner", { onDismiss });
    });
    const title = await screen.findByText("From sonner");
    act(() => {
      middle(title);
    });
    await gone("From sonner");
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
