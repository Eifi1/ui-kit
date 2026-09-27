import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Trash2 } from "lucide-react";

import { ImageGrid } from "../image-grid";
import { AuthedImage } from "../authed-image";
import { IconButton } from "../ui";
import type { ImageItem } from "../lightbox";

const ITEMS: ImageItem[] = [
  { key: 1, src: "/a.jpg", thumbnailSrc: "/a-thumb.jpg", alt: "Kitchen", caption: "Sink leaks" },
  { key: 2, src: "/b.jpg", alt: "Hallway" },
  { key: 3, src: "/plan.pdf", alt: "Floor plan", fileName: "plan.pdf" },
];

async function settleHistory() {
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

afterEach(async () => {
  cleanup();
  await settleHistory();
});

describe("ImageGrid", () => {
  it("is a named list of open buttons named by alt, with captions outside the buttons", () => {
    render(<ImageGrid items={ITEMS} />);
    const list = screen.getByRole("list", { name: "Images" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    const kitchen = screen.getByRole("button", { name: "Kitchen" });
    expect(kitchen.querySelector("img")).toHaveAttribute("src", "/a-thumb.jpg");
    expect(kitchen).not.toHaveTextContent("Sink leaks");
    expect(screen.getByText("Sink leaks")).toBeInTheDocument();
  });

  it("shows a file (PDF) as an icon tile without loading it as an image", () => {
    render(<ImageGrid items={ITEMS} />);
    const tile = screen.getByRole("button", { name: "Floor plan" });
    expect(tile.querySelector("img")).toBeNull();
    expect(tile).toHaveTextContent("plan.pdf");
  });

  it("puts per-image actions BESIDE the open button, in a named group", () => {
    const onDelete = vi.fn();
    render(
      <ImageGrid
        items={ITEMS}
        renderActions={(item) => (
          <IconButton variant="overlay" size="xs" label="Delete" onClick={() => onDelete(item.key)}>
            <Trash2 />
          </IconButton>
        )}
      />,
    );
    const group = screen.getByRole("group", { name: "Actions for Hallway" });
    const del = within(group).getByRole("button", { name: "Delete" });
    const open = screen.getByRole("button", { name: "Hallway" });
    expect(open.contains(del)).toBe(false);
    fireEvent.click(del);
    expect(onDelete).toHaveBeenCalledWith(2);
    // Deleting did not open the viewer.
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens its own lightbox on the tile that was clicked", () => {
    render(<ImageGrid items={ITEMS} />);
    fireEvent.click(screen.getByRole("button", { name: "Hallway" }));
    const dialog = screen.getByRole("dialog", { name: "Image viewer" });
    expect(within(dialog).getByRole("img")).toHaveAttribute("alt", "Hallway");
    expect(within(dialog).getByText("2 / 3")).toBeInTheDocument();
  });

  it("with `onOpen`, reports the index and opens nothing itself", () => {
    const onOpen = vi.fn();
    render(<ImageGrid items={ITEMS} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "Kitchen" }));
    expect(onOpen).toHaveBeenCalledWith(0);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is responsive by default and takes a fixed column count", () => {
    const { unmount } = render(<ImageGrid items={ITEMS} minTileSize={120} />);
    expect(screen.getByRole("list").style.gridTemplateColumns).toBe(
      "repeat(auto-fill, minmax(min(120px, 100%), 1fr))",
    );
    unmount();
    render(<ImageGrid items={ITEMS} columns={4} />);
    expect(screen.getByRole("list").style.gridTemplateColumns).toBe("repeat(4, minmax(0, 1fr))");
  });

  it("names a tile with no alt by its position", () => {
    render(<ImageGrid items={[{ src: "/x.jpg", alt: "" }, { src: "/y.jpg", alt: "" }]} />);
    expect(screen.getByRole("button", { name: "Image 2 of 2" })).toBeInTheDocument();
  });
});

describe("AuthedImage", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: () => "blob:t/1" });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: () => {} });
  });
  afterEach(() => {
    Reflect.deleteProperty(URL, "createObjectURL");
    Reflect.deleteProperty(URL, "revokeObjectURL");
  });

  const state = (el: HTMLElement) => el.closest("[data-image-state]")?.getAttribute("data-image-state");

  it("shows a skeleton while fetching, then the object URL", async () => {
    let release!: (b: Blob) => void;
    const fetcher = () => new Promise<Blob>((r) => (release = r));
    const { container } = render(<AuthedImage src="/api/v1/p.jpg" alt="Photo" fetcher={fetcher} />);
    expect(container.querySelector("[data-image-state]")).toHaveAttribute("data-image-state", "loading");
    expect(screen.getByText("Loading image…")).toBeInTheDocument();
    await act(async () => release(new Blob(["x"], { type: "image/jpeg" })));
    const img = screen.getByRole("img", { name: "Photo" });
    expect(img).toHaveAttribute("src", "blob:t/1");
    fireEvent.load(img);
    expect(state(img)).toBe("ready");
    expect(screen.queryByText("Loading image…")).toBeNull();
  });

  it("shows the error tile when the fetch fails", async () => {
    const fetcher = async () => {
      throw new Error("401");
    };
    render(<AuthedImage src="/api/v1/p.jpg" alt="Photo" fetcher={fetcher} />);
    await waitFor(() =>
      expect(screen.getByRole("img", { name: "Photo: image couldn’t be loaded" })).toBeInTheDocument(),
    );
  });

  it("without a fetcher it is an <img> whose decode error shows the same tile", () => {
    render(<AuthedImage src="/broken.jpg" alt="Photo" />);
    fireEvent.error(screen.getByRole("img", { name: "Photo" }));
    expect(screen.getByRole("img", { name: "Photo: image couldn’t be loaded" })).toBeInTheDocument();
  });

  it("`link` wraps the picture in a new-tab link to the blob, never the API path", async () => {
    render(<AuthedImage src="/api/v1/p.jpg" alt="Photo" fetcher={async () => new Blob(["x"])} link />);
    const link = await screen.findByRole("link");
    expect(link).toHaveAttribute("href", "blob:t/1");
    expect(link).toHaveAttribute("target", "_blank");
  });
});

describe("ImageGrid file names and actions", () => {
  it("splits a file name into stem and extension", async () => {
    const { splitFileName } = await import("../image-grid");
    expect(splitFileName("floor-plan-level-2.pdf")).toEqual(["floor-plan-level-2", ".pdf"]);
    expect(splitFileName("archive.tar.gz")).toEqual(["archive.tar", ".gz"]);
    expect(splitFileName(".env")).toEqual([".env", ""]);
    expect(splitFileName("README")).toEqual(["README", ""]);
    expect(splitFileName("notes.markdown-draft")).toEqual(["notes.markdown-draft", ""]);
  });

  it("truncates a file tile's stem and never its extension", () => {
    render(<ImageGrid items={[{ key: 1, src: "/p.pdf", alt: "Plan", fileName: "floor-plan-level-2.pdf" }]} />);
    const tile = screen.getByRole("button", { name: "Plan" });
    const stem = within(tile).getByText("floor-plan-level-2");
    const ext = within(tile).getByText(".pdf");
    expect(stem).toHaveClass("truncate");
    expect(ext).toHaveClass("shrink-0");
    expect(ext).not.toHaveClass("truncate");
  });

  it("puts the actions on a backdrop of their own", () => {
    render(
      <ImageGrid
        items={ITEMS.slice(0, 1)}
        renderActions={() => (
          <IconButton variant="overlay" aria-label="Delete">
            <Trash2 />
          </IconButton>
        )}
      />,
    );
    const group = screen.getByRole("group", { name: "Actions for Kitchen" });
    expect(group.className).toContain("var(--bg-inverse)");
    expect(group).toHaveClass("rounded-full");
  });
});
