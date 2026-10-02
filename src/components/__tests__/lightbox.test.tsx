import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Lightbox } from "../lightbox";
import type { ImageItem, LightboxProps } from "../lightbox";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";

const ITEMS: ImageItem[] = [
  { src: "/a.jpg", alt: "Kitchen", caption: "Sink leaks" },
  { src: "/b.jpg", alt: "Hallway" },
  { src: "/c.jpg", alt: "Bathroom" },
];

function Harness({
  start = 0,
  onClose = () => {},
  ...props
}: Partial<LightboxProps> & { start?: number }) {
  const [index, setIndex] = useState(start);
  const [open, setOpen] = useState(true);
  return (
    <Lightbox
      open={open}
      onClose={() => {
        setOpen(false);
        onClose();
      }}
      items={ITEMS}
      index={index}
      onIndexChange={setIndex}
      {...props}
    />
  );
}

/** jsdom fires popstate in a task, so a traversal needs a flush. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** An unwind is scheduled a task after its overlay's cleanup, and its popstate lands a
 *  task after that. */
async function settleHistory() {
  for (let i = 0; i < 4; i += 1) await settle();
}

const dialog = () => screen.getByRole("dialog", { name: "Image viewer" });
const shown = () => within(dialog()).getByRole("img").getAttribute("alt");
const key = (k: string) => fireEvent.keyDown(dialog(), { key: k });

afterEach(async () => {
  document.documentElement.removeAttribute("dir");
  // Each viewer's history entry is unwound before the next test pushes one.
  cleanup();
  await settleHistory();
});

describe("Lightbox", () => {
  it("is a named full-screen dialog that takes focus, with a counter and the caption", () => {
    render(<Harness />);
    expect(dialog()).toHaveAttribute("aria-modal", "true");
    expect(dialog()).toHaveFocus();
    expect(shown()).toBe("Kitchen");
    expect(within(dialog()).getByText("1 / 3")).toBeInTheDocument();
    expect(within(dialog()).getByRole("status")).toHaveTextContent("Image 1 of 3: Kitchen");
    expect(within(dialog()).getByText("Sink leaks")).toBeInTheDocument();
  });

  it("pages with the buttons, disabled at the ends unless `loop`", () => {
    const { unmount } = render(<Harness />);
    expect(screen.getByRole("button", { name: "Previous image" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    expect(shown()).toBe("Bathroom");
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next image" })).toBeDisabled();
    unmount();

    render(<Harness loop />);
    fireEvent.click(screen.getByRole("button", { name: "Previous image" }));
    expect(shown()).toBe("Bathroom");
    fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    expect(shown()).toBe("Kitchen");
  });

  it("pages with ←/→, Home and End", () => {
    render(<Harness />);
    key("ArrowRight");
    expect(shown()).toBe("Hallway");
    key("ArrowLeft");
    expect(shown()).toBe("Kitchen");
    key("End");
    expect(shown()).toBe("Bathroom");
    key("Home");
    expect(shown()).toBe("Kitchen");
  });

  it("swaps the arrows in a right-to-left page, though the dialog is portalled out of it", () => {
    document.documentElement.setAttribute("dir", "rtl");
    render(<Harness />);
    expect(dialog()).toHaveAttribute("dir", "rtl");
    key("ArrowLeft");
    expect(shown()).toBe("Hallway");
    key("ArrowRight");
    expect(shown()).toBe("Kitchen");
  });

  it("pages on a horizontal swipe, and ignores a vertical one or a short one", () => {
    render(<Harness />);
    const stage = dialog().querySelector("[data-lightbox-stage]")!;
    const swipe = (x0: number, x1: number, y0 = 100, y1 = 100) => {
      fireEvent.touchStart(stage, { touches: [{ clientX: x0, clientY: y0 }] });
      fireEvent.touchEnd(stage, { changedTouches: [{ clientX: x1, clientY: y1 }] });
    };
    swipe(300, 100); // leftward: next
    expect(shown()).toBe("Hallway");
    swipe(100, 300); // rightward: previous
    expect(shown()).toBe("Kitchen");
    swipe(300, 280);
    swipe(300, 200, 100, 400);
    expect(shown()).toBe("Kitchen");
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    key("Escape");
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("closes on the X", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("closes on Back (overlay history)", async () => {
    // Let the previous tests' overlays finish unwinding their own history entries.
    await settleHistory();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await settle();
    await act(async () => {
      const landed = new Promise<void>((resolve) =>
        window.addEventListener("popstate", () => resolve(), { once: true }),
      );
      window.history.back();
      await landed;
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("keeps Tab inside the viewer", () => {
    render(<Harness start={1} />);
    const buttons = within(dialog()).getAllByRole("button");
    const last = buttons[buttons.length - 1];
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(dialog().contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(last);
  });

  it("offers a download link named after the file; `onDownload` replaces it with a button", () => {
    const { unmount } = render(
      <Lightbox open onClose={() => {}} items={[{ src: "/a.jpg", alt: "A", fileName: "a.jpg" }]} index={0} onIndexChange={() => {}} />,
    );
    const link = screen.getByRole("link", { name: "Download" });
    expect(link).toHaveAttribute("href", "/a.jpg");
    expect(link).toHaveAttribute("download", "a.jpg");
    unmount();

    const onDownload = vi.fn();
    render(<Harness onDownload={onDownload} />);
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(onDownload).toHaveBeenCalledWith(ITEMS[0], 0);
    expect(screen.queryByRole("link", { name: "Download" })).toBeNull();
  });

  it("toggles zoom with the button and a double-click, and resets it on paging", () => {
    render(<Harness />);
    const zoom = screen.getByRole("button", { name: "Zoom" });
    expect(zoom).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(zoom);
    expect(zoom).toHaveAttribute("aria-pressed", "true");
    expect(dialog().querySelector("[data-zoomed]")).not.toBeNull();
    key("ArrowRight");
    expect(screen.getByRole("button", { name: "Zoom" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.doubleClick(within(dialog()).getByRole("img"));
    expect(screen.getByRole("button", { name: "Zoom" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows a PDF as a file card with open and download, not as a broken image", () => {
    render(
      <Lightbox
        open
        onClose={() => {}}
        items={[{ src: "/docs/7", alt: "Floor plan", mimeType: "application/pdf", fileName: "plan.pdf" }]}
        index={0}
        onIndexChange={() => {}}
      />,
    );
    expect(within(dialog()).queryByRole("img")).toBeNull();
    expect(screen.getByText("plan.pdf")).toBeInTheDocument();
    expect(screen.getByText("No preview available for this file")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open in new tab" })).toHaveAttribute("href", "/docs/7");
    expect(screen.queryByRole("button", { name: "Zoom" })).toBeNull();
    // One item: no paging controls.
    expect(screen.queryByRole("button", { name: "Next image" })).toBeNull();
  });

  it("speaks the provider's language", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <Harness />
      </UiKitProvider>,
    );
    expect(screen.getByRole("dialog", { name: "Bildansicht" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nächstes Bild" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Bild 1 von 3: Kitchen");
  });
});

describe("Lightbox with a fetcher", () => {
  beforeEach(() => {
    let n = 0;
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: () => `blob:t/${(n += 1)}` });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: () => {} });
  });
  afterEach(() => {
    Reflect.deleteProperty(URL, "createObjectURL");
    Reflect.deleteProperty(URL, "revokeObjectURL");
  });

  it("fetches only the item on screen, and downloads its object URL — never the API path", async () => {
    const fetcher = vi.fn(async () => new Blob(["x"], { type: "image/jpeg" }));
    render(<Harness start={1} fetcher={fetcher} />);
    await waitFor(() => expect(within(dialog()).getByRole("img")).toHaveAttribute("src", "blob:t/1"));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith("/b.jpg", expect.anything());
    expect(screen.getByRole("link", { name: "Download" })).toHaveAttribute("href", "blob:t/1");
  });

  it("learns a file is not an image from the type the server sent", async () => {
    const fetcher = async () => new Blob(["%PDF"], { type: "application/pdf" });
    render(
      <Lightbox open onClose={() => {}} items={[{ src: "/docs/7", alt: "Plan" }]} index={0} onIndexChange={() => {}} fetcher={fetcher} />,
    );
    await waitFor(() => expect(screen.getByText("No preview available for this file")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Open in new tab" })).toHaveAttribute("href", "blob:t/1");
  });
});
