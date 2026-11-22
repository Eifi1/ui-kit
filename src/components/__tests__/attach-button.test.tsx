import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AttachButton, attachDropzoneProps, attachTiles, type AttachOptions } from "../attach-button";
import { FileDropzone } from "../file-dropzone";
import { Modal } from "../modal";
import { WriteLockProvider } from "../write-lock";
import { stubPhone } from "../../test/viewport";

/**
 * AttachButton (0.66, the AttachButton draft of 2026-11-16): one way in for attachments.
 *
 * jsdom has no camera, no file dialog and no `matchMedia`. The camera is installed per test
 * (as in camera-button.test.tsx); a file dialog is an `<input type="file">` whose `click()`
 * is spied, and whose `change` is fired with the files a user would pick; the phone is
 * `stubPhone({ coarse: true })` — without a stub every kit hook reads the desktop.
 */

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "mediaDevices");
  Reflect.deleteProperty(HTMLVideoElement.prototype, "videoWidth");
  Reflect.deleteProperty(HTMLVideoElement.prototype, "videoHeight");
});

/** Install `navigator.mediaDevices`: a camera (or none), and `getUserMedia` (or none). */
function withMedia({ camera = true, stream = true }: { camera?: boolean; stream?: boolean } = {}) {
  const tracks = [{ stop: vi.fn(), kind: "video" }];
  const media = Object.assign(new EventTarget(), {
    enumerateDevices: vi.fn(() =>
      Promise.resolve(camera ? [{ kind: "videoinput" }, { kind: "audioinput" }] : [{ kind: "audioinput" }]),
    ),
    ...(stream
      ? { getUserMedia: vi.fn(() => Promise.resolve({ getTracks: () => tracks } as unknown as MediaStream)) }
      : {}),
  });
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: media });
}

/** A video frame and a canvas that encodes it, so the shutter takes a photo. */
function withFrame() {
  Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { configurable: true, get: () => 1600 });
  Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", { configurable: true, get: () => 900 });
  HTMLVideoElement.prototype.play = vi.fn(() => Promise.resolve());
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () => ({ drawImage: vi.fn() }) as unknown as CanvasRenderingContext2D as never,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb: BlobCallback) =>
    cb(new Blob(["jpeg"], { type: "image/jpeg" })),
  );
}

/** Every file dialog opened: the input it was opened on. */
function spyDialogs() {
  const opened: HTMLInputElement[] = [];
  vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (this: HTMLInputElement) {
    opened.push(this);
  });
  return opened;
}

/** What the user picked in the dialog `input` opened. */
function pickInto(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, "files", { configurable: true, value: files });
  fireEvent.change(input);
}

const pdf = (name = "invoice.pdf", size = 10) => new File(["x".repeat(size)], name, { type: "application/pdf" });
const jpeg = (name = "page.jpg") => new File(["jpeg"], name, { type: "image/jpeg" });
const trigger = () => screen.getByRole("button", { name: "Attach" });
const sheet = () => screen.queryByRole("dialog", { name: "Add attachment" });
const tile = (name: string) => within(sheet()!).getByRole("button", { name });

/** Let `useHasCamera` hear the browser's answer. */
const settle = () => act(async () => {});

describe("attachTiles — which ways in apply", () => {
  const tiles = (args: Partial<Parameters<typeof attachTiles>[0]>) =>
    attachTiles({ hasCamera: true, coarse: true, screenshot: false, ...args }).map((t) => `${t.tile}:${t.accept}`);

  it.each([
    // [what, args, tiles]
    [
      "phone, images and a PDF",
      { accept: "image/*,application/pdf" },
      ["camera:image/*", "photos:image/*", "files:application/pdf"],
    ],
    [
      "desktop: Photos is Files",
      { accept: "image/*,application/pdf", coarse: false },
      ["camera:image/*", "files:image/*,application/pdf"],
    ],
    ["no camera", { accept: "image/*,application/pdf", hasCamera: false }, ["photos:image/*", "files:application/pdf"]],
    [
      "images only, on a phone: no Files",
      { accept: "image/png,image/jpeg" },
      ["camera:image/png,image/jpeg", "photos:image/png,image/jpeg"],
    ],
    ["PDFs only: no camera, no Photos", { accept: "application/pdf" }, ["files:application/pdf"]],
    ["anything", { accept: "" }, ["camera:image/*", "photos:image/*", "files:"]],
    ["extensions", { accept: ".JPG, .pdf" }, ["camera:.jpg", "photos:.jpg", "files:.pdf"]],
    ["a PNG-only accept refuses the viewfinder's JPEG", { accept: "image/png" }, ["photos:image/png"]],
    [
      "support: Photos + Files on a phone",
      { accept: "image/*,application/pdf", sources: ["photos", "files"] as const },
      ["photos:image/*", "files:application/pdf"],
    ],
    [
      "support on a desktop: one Files",
      { accept: "image/*,application/pdf", sources: ["photos", "files"] as const, coarse: false },
      ["files:image/*,application/pdf"],
    ],
    [
      "Photos alone on a desktop stays",
      { accept: "image/*,application/pdf", sources: ["photos"] as const, coarse: false },
      ["photos:image/*"],
    ],
    [
      "the order is the kit's",
      { accept: "", sources: ["screenshot", "files", "camera"] as const, screenshot: true },
      ["camera:image/*", "files:", "screenshot:"],
    ],
    ["Screenshot only with a capture", { accept: "", sources: ["screenshot"] as const }, []],
  ])("%s", (_what, args, expected) => {
    expect(tiles(args)).toEqual(expected);
  });
});

describe("AttachButton — the chooser", () => {
  it("one way in: the trigger opens that picker directly, no sheet or menu", async () => {
    withMedia({ camera: false });
    const opened = spyDialogs();
    render(<AttachButton accept="application/pdf" onFiles={vi.fn()} />);
    await settle();
    expect(trigger()).not.toHaveAttribute("aria-haspopup");
    fireEvent.click(trigger());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opened).toHaveLength(1);
    expect(opened[0]).toHaveAttribute("accept", "application/pdf");
  });

  it("desktop: a menu at the button with Camera and one Files entry", async () => {
    withMedia();
    render(<AttachButton accept="image/*,application/pdf" onFiles={vi.fn()} />);
    await settle();
    fireEvent.click(trigger());
    const menu = screen.getByRole("dialog", { name: "Add attachment" });
    expect(menu).not.toHaveAttribute("aria-modal");
    expect(
      within(menu)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Camera", "Files"]);
  });

  it("phone: a modal bottom sheet with the title, a close button and one tile per way in", async () => {
    stubPhone({ coarse: true });
    withMedia();
    render(<AttachButton accept="image/*,application/pdf" onFiles={vi.fn()} onCaptureScreenshot={vi.fn()} />);
    await settle();
    fireEvent.click(trigger());
    expect(sheet()).toHaveAttribute("aria-modal", "true");
    expect(within(sheet()!).getByRole("heading", { name: "Add attachment" })).toBeInTheDocument();
    expect(within(sheet()!).getByRole("button", { name: "Close" })).toBeInTheDocument();
    const tiles = sheet()!.querySelectorAll("[data-attach-tile]");
    expect(Array.from(tiles, (t) => t.textContent)).toEqual(["Camera", "Photos", "Files", "Screenshot"]);
  });

  it("hides the Camera tile where the device positively has no camera", async () => {
    stubPhone({ coarse: true });
    withMedia({ camera: false });
    render(<AttachButton accept="image/*,application/pdf" onFiles={vi.fn()} />);
    await settle();
    fireEvent.click(trigger());
    expect(within(sheet()!).queryByRole("button", { name: "Camera" })).toBeNull();
    expect(tile("Photos")).toBeInTheDocument();
  });

  it("Escape closes the sheet — not the dialog it was opened in — and the focus is back on the button", async () => {
    stubPhone({ coarse: true });
    withMedia();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} aria-label="Edit transaction">
        <AttachButton accept="image/*,application/pdf" onFiles={vi.fn()} />
      </Modal>,
    );
    await settle();
    trigger().focus();
    fireEvent.click(trigger());
    expect(sheet()).toBeInTheDocument();
    expect(sheet()!.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(sheet()).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger());
  });

  it("the close button closes the sheet and gives the focus back to the button", async () => {
    stubPhone({ coarse: true });
    withMedia();
    render(<AttachButton accept="image/*" onFiles={vi.fn()} />);
    await settle();
    trigger().focus();
    fireEvent.click(trigger());
    fireEvent.click(within(sheet()!).getByRole("button", { name: "Close" }));
    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });
});

describe("AttachButton — screening", () => {
  it("every pick is screened against the WHOLE accept, and says where it came from", async () => {
    stubPhone({ coarse: true });
    withMedia();
    const opened = spyDialogs();
    const onFiles = vi.fn();
    const onReject = vi.fn();
    render(
      <AttachButton accept="image/*,application/pdf" maxSize={100} multiple onFiles={onFiles} onReject={onReject} />,
    );
    await settle();
    fireEvent.click(trigger());
    fireEvent.click(tile("Photos"));
    // The sheet closed before the dialog opened, and the dialog asks for images only.
    expect(sheet()).toBeNull();
    expect(opened[0]).toHaveAttribute("accept", "image/*");
    // A PDF chosen through the gallery's "Browse" is still taken: the field takes PDFs.
    const big = pdf("big.pdf", 500);
    pickInto(opened[0], [pdf(), big]);
    expect(onFiles).toHaveBeenCalledWith([expect.objectContaining({ name: "invoice.pdf" })], "photos");
    expect(onReject).toHaveBeenCalledWith(
      [expect.objectContaining({ file: big, reason: "size", message: expect.stringContaining("larger than") })],
      "photos",
    );
  });

  it("refuses a type the accept does not take, with the kit's sentence", async () => {
    withMedia({ camera: false });
    const opened = spyDialogs();
    const onFiles = vi.fn();
    const onReject = vi.fn();
    render(<AttachButton accept="application/pdf" onFiles={onFiles} onReject={onReject} />);
    await settle();
    fireEvent.click(trigger());
    pickInto(opened[0], [new File(["t"], "notes.txt", { type: "text/plain" })]);
    expect(onFiles).not.toHaveBeenCalled();
    expect(onReject.mock.calls[0][0][0]).toMatchObject({ reason: "type", message: "Only application/pdf files" });
    expect(onReject.mock.calls[0][1]).toBe("files");
  });

  it('pick="whole": one refused file refuses the whole pick', async () => {
    withMedia({ camera: false });
    const opened = spyDialogs();
    const onFiles = vi.fn();
    const onReject = vi.fn();
    render(
      <AttachButton
        accept="application/pdf"
        multiple
        pick="whole"
        maxSize={100}
        onFiles={onFiles}
        onReject={onReject}
      />,
    );
    await settle();
    fireEvent.click(trigger());
    pickInto(opened[0], [pdf("a.pdf"), pdf("b.pdf", 500)]);
    expect(onFiles).not.toHaveBeenCalled();
    expect(onReject).toHaveBeenCalledTimes(1);
  });
});

describe("AttachButton — the screenshot", () => {
  it("the sheet is gone before the capture is called", async () => {
    stubPhone({ coarse: true });
    withMedia();
    const shot = new File(["png"], "screenshot.png", { type: "image/png" });
    let sheetAtCapture: Element | null | undefined;
    const capture = vi.fn(async () => {
      sheetAtCapture = document.querySelector("[data-attach-sheet]");
      return shot;
    });
    const onFiles = vi.fn();
    render(<AttachButton accept="image/*" onFiles={onFiles} onCaptureScreenshot={capture} />);
    await settle();
    fireEvent.click(trigger());
    await act(async () => fireEvent.click(tile("Screenshot")));
    expect(capture).toHaveBeenCalledTimes(1);
    expect(sheetAtCapture).toBeNull();
    expect(onFiles).toHaveBeenCalledWith([shot], "screenshot");
  });

  it("the desktop menu is gone before the capture too", async () => {
    withMedia();
    let menuAtCapture: Element | null | undefined;
    const capture = vi.fn(async () => {
      menuAtCapture = document.querySelector("[data-attach-menu]");
      return null;
    });
    render(<AttachButton accept="image/*" onFiles={vi.fn()} onCaptureScreenshot={capture} />);
    await settle();
    fireEvent.click(trigger());
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Screenshot" })));
    expect(capture).toHaveBeenCalledTimes(1);
    expect(menuAtCapture).toBeNull();
  });
});

describe("AttachButton — the camera's pages", () => {
  it("hands the viewfinder's pages over ONCE, on its finish button", async () => {
    stubPhone({ coarse: true });
    withMedia();
    withFrame();
    const onFiles = vi.fn();
    render(<AttachButton accept="image/*,application/pdf" multiple maxFiles={10} onFiles={onFiles} />);
    await settle();
    fireEvent.click(trigger());
    fireEvent.click(tile("Camera"));
    const shutter = await screen.findByRole("button", { name: "Take the photo" });
    await waitFor(() => expect(shutter).toBeEnabled());
    fireEvent.click(shutter);
    fireEvent.click(shutter);
    expect(onFiles).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Use 2 photos" }));
    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(onFiles.mock.calls[0][0]).toHaveLength(2);
    expect(onFiles.mock.calls[0][1]).toBe("camera");
  });

  it("without a camera in the page, asks for another page between trips and still hands over once", async () => {
    stubPhone({ coarse: true });
    withMedia({ stream: false });
    const opened = spyDialogs();
    const onFiles = vi.fn();
    render(<AttachButton accept="image/*" multiple maxFiles={5} onFiles={onFiles} />);
    await settle();
    fireEvent.click(trigger());
    fireEvent.click(tile("Camera"));
    expect(opened[0]).toHaveAttribute("capture", "environment");
    expect(opened[0]).not.toHaveAttribute("multiple");
    pickInto(opened[0], [jpeg("p1.jpg")]);
    expect(screen.getByText("1 photo taken.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Another page" }));
    expect(opened[1]).toBe(opened[0]);
    pickInto(opened[0], [jpeg("p2.jpg")]);
    expect(screen.getByText("2 photos taken.")).toBeInTheDocument();
    expect(onFiles).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Use 2 photos" }));
    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(onFiles.mock.calls[0][0].map((f: File) => f.name)).toEqual(["p1.jpg", "p2.jpg"]);
    expect(onFiles.mock.calls[0][1]).toBe("camera");
  });
});

describe("AttachButton — busy and locked", () => {
  it("pending keeps the focus on the button (no native disabled) and opens nothing", async () => {
    withMedia({ camera: false });
    const opened = spyDialogs();
    const { rerender } = render(<AttachButton accept="application/pdf" onFiles={vi.fn()} />);
    await settle();
    trigger().focus();
    rerender(<AttachButton accept="application/pdf" onFiles={vi.fn()} pending />);
    expect(trigger()).not.toBeDisabled();
    expect(trigger()).toHaveAttribute("aria-busy", "true");
    expect(document.activeElement).toBe(trigger());
    fireEvent.click(trigger());
    expect(opened).toHaveLength(0);
  });

  it("commit under a locked WriteLockProvider: the lock's reason, nothing opens, a late pick is refused", async () => {
    stubPhone({ coarse: true });
    withMedia({ camera: false });
    const opened = spyDialogs();
    const onFiles = vi.fn();
    const ui = (locked: boolean) => (
      <WriteLockProvider locked={locked} reason="Read-only in the demo.">
        <AttachButton accept="image/*,application/pdf" commit onFiles={onFiles} />
      </WriteLockProvider>
    );
    const { rerender } = render(ui(false));
    await settle();
    fireEvent.click(trigger());
    fireEvent.click(tile("Files"));
    // The lock arrives while the dialog is open: what it hands over is refused.
    rerender(ui(true));
    pickInto(opened[0], [pdf()]);
    expect(onFiles).not.toHaveBeenCalled();
    expect(trigger()).toHaveAttribute("aria-disabled", "true");
    expect(trigger()).toHaveAccessibleDescription("Read-only in the demo.");
    fireEvent.click(trigger());
    expect(sheet()).toBeNull();
  });
});

describe("AttachButton inline, in a FileDropzone", () => {
  it("the tiles are buttons in place; a drop on the zone is screened alike and says 'drop'", async () => {
    stubPhone({ coarse: true });
    withMedia();
    const opened = spyDialogs();
    const onFiles = vi.fn();
    const onReject = vi.fn();
    const options: AttachOptions = {
      accept: "image/*,application/pdf",
      multiple: true,
      maxSize: 100,
      onFiles,
      onReject,
    };
    render(
      <FileDropzone
        {...attachDropzoneProps(options)}
        renderBody={() => <AttachButton {...options} layout="inline" />}
      />,
    );
    await settle();
    const group = screen.getByRole("group", { name: "Add attachment" });
    expect(
      within(group)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Camera", "Photos", "Files"]);
    fireEvent.click(within(group).getByRole("button", { name: "Files" }));
    // The tile's dialog, and not the zone's as well.
    expect(opened).toHaveLength(1);
    expect(opened[0]).toHaveAttribute("accept", "application/pdf");
    pickInto(opened[0], [pdf()]);
    expect(onFiles).toHaveBeenLastCalledWith([expect.objectContaining({ name: "invoice.pdf" })], "files");

    const zone = screen.getByRole("group", { name: "File upload" });
    const big = pdf("big.pdf", 500);
    fireEvent.drop(zone, { dataTransfer: { files: [jpeg(), big], types: ["Files"] } });
    expect(onFiles).toHaveBeenLastCalledWith([expect.objectContaining({ name: "page.jpg" })], "drop");
    expect(onReject).toHaveBeenLastCalledWith([expect.objectContaining({ file: big, reason: "size" })], "drop");
  });
});
