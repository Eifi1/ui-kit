import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CameraCapture } from "../camera-capture";
import { CameraButton } from "../camera-button";
import { WriteLockProvider } from "../write-lock";

/**
 * The camera (kastlan reuse audit 2026-11-02, proposal 8): keksdose's in-page viewfinder
 * (invoices/camera-capture.tsx) and its `capture` fallback, behind one button.
 *
 * jsdom has neither cameras nor canvases, so both are installed here: what is tested is
 * the decision — a viewfinder and a working shutter, or the old file input — and the
 * hand-over of the File, not the pixels. The cases keksdose's suite holds for its
 * CameraCapture are kept (camera-capture.test.tsx), in the kit's English.
 */

type Track = { stop: ReturnType<typeof vi.fn>; kind: string };

function fakeStream(): { stream: MediaStream; tracks: Track[] } {
  const tracks: Track[] = [{ stop: vi.fn(), kind: "video" }];
  return { stream: { getTracks: () => tracks } as unknown as MediaStream, tracks };
}

interface Devices {
  /** What `enumerateDevices` lists; an Error rejects. Default: a camera. */
  devices?: { kind: string }[] | Error;
  /** What `getUserMedia` answers: a stream, a refusal, or absent (`null`) — the property
   *  missing altogether, as on a browser that cannot stream. Default: a stream. */
  stream?: MediaStream | { denied: unknown } | null;
}

/** Install `navigator.mediaDevices`. `getUserMedia`'s denial is tagged rather than
 *  `instanceof Error`: jsdom's DOMException is not an Error (keksdose's note). */
function withMedia({ devices = [{ kind: "videoinput" }], stream = fakeStream().stream }: Devices = {}) {
  const getUserMedia = vi.fn((_constraints: MediaStreamConstraints) =>
    stream && "denied" in stream ? Promise.reject(stream.denied) : Promise.resolve(stream as MediaStream),
  );
  const media = Object.assign(new EventTarget(), {
    enumerateDevices: vi.fn(() => (devices instanceof Error ? Promise.reject(devices) : Promise.resolve(devices))),
    ...(stream === null ? {} : { getUserMedia }),
  });
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: media });
  return { getUserMedia, media };
}

const encoded: { width: number; height: number; type?: string; quality?: unknown }[] = [];

/** A video element with a real frame size, and a canvas that draws and encodes. `async`
 *  holds each encoding until `release()`, for the one-at-a-time case. */
function withFrame({ width = 2560, height = 1440, context = true, blob = true, async = false } = {}) {
  const drawImage = vi.fn();
  const pending: (() => void)[] = [];
  Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { configurable: true, get: () => width });
  Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", { configurable: true, get: () => height });
  HTMLVideoElement.prototype.play = vi.fn(() => Promise.resolve());
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () => (context ? ({ drawImage } as unknown as CanvasRenderingContext2D) : null) as never,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
    this: HTMLCanvasElement,
    cb: BlobCallback,
    type?: string,
    quality?: unknown,
  ) {
    encoded.push({ width: this.width, height: this.height, type, quality });
    const done = () => cb(blob ? new Blob(["jpeg-bytes"], { type: "image/jpeg" }) : null);
    if (async) pending.push(done);
    else done();
  });
  return {
    drawImage,
    release: () => {
      for (const done of pending.splice(0)) done();
    },
  };
}

afterEach(() => {
  encoded.length = 0;
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "mediaDevices");
  Reflect.deleteProperty(HTMLVideoElement.prototype, "videoWidth");
  Reflect.deleteProperty(HTMLVideoElement.prototype, "videoHeight");
});

const shutter = () => screen.getByRole("button", { name: "Take the photo" });
const viewfinder = () => screen.queryByRole("dialog", { name: "Camera" });

const captureProps = () => ({
  onCapture: vi.fn(),
  onCancel: vi.fn(),
  onUnavailable: vi.fn(),
});

describe("CameraCapture opens a real camera", () => {
  it("asks for the back camera, as an ideal, at more pixels than a document needs", async () => {
    const { getUserMedia } = withMedia();
    withFrame();
    render(<CameraCapture {...captureProps()} />);
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    const video = getUserMedia.mock.calls[0][0].video as MediaTrackConstraints;
    expect(video.facingMode).toEqual({ ideal: "environment" });
    expect((video.width as { ideal: number }).ideal).toBeGreaterThanOrEqual(1600);
  });

  it("asks for the front camera with facing='user'", async () => {
    const { getUserMedia } = withMedia();
    withFrame();
    render(<CameraCapture {...captureProps()} facing="user" />);
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    expect((getUserMedia.mock.calls[0][0].video as MediaTrackConstraints).facingMode).toEqual({ ideal: "user" });
  });

  it("is a named modal dialog, saying it is starting until the stream arrives", async () => {
    let resolve!: (s: MediaStream) => void;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(() => new Promise<MediaStream>((r) => (resolve = r))) },
    });
    withFrame();
    render(<CameraCapture {...captureProps()} />);
    expect(viewfinder()).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Starting the camera…")).toBeInTheDocument();
    expect(shutter()).toBeDisabled();
    await act(async () => resolve(fakeStream().stream));
    expect(screen.queryByText("Starting the camera…")).toBeNull();
    expect(shutter()).toBeEnabled();
  });

  it("hands over a JPEG of the live frame at its own size, and stays open", async () => {
    withMedia();
    const { drawImage } = withFrame();
    const p = captureProps();
    render(<CameraCapture {...p} fileName="receipt" />);
    await waitFor(() => expect(shutter()).toBeEnabled());
    await act(async () => fireEvent.click(shutter()));
    expect(drawImage).toHaveBeenCalled();
    expect(encoded).toEqual([{ width: 2560, height: 1440, type: "image/jpeg", quality: 0.92 }]);
    const file = p.onCapture.mock.calls[0][0] as File;
    expect(file.type).toBe("image/jpeg");
    expect(file.name).toMatch(/^receipt-\d+\.jpg$/);
    expect(p.onCancel).not.toHaveBeenCalled();
    expect(viewfinder()).toBeInTheDocument();
  });

  it("encodes one frame at a time: a tap while one is encoding is not a second photo", async () => {
    withMedia();
    const { release } = withFrame({ async: true });
    const p = captureProps();
    render(<CameraCapture {...p} />);
    await waitFor(() => expect(shutter()).toBeEnabled());
    fireEvent.click(shutter());
    fireEvent.click(shutter());
    await act(async () => release());
    expect(p.onCapture).toHaveBeenCalledTimes(1);
    // Focus stays where it was: the shutter is not natively disabled while it encodes.
    fireEvent.click(shutter());
    await act(async () => release());
    expect(p.onCapture).toHaveBeenCalledTimes(2);
  });

  it("does not shoot before the first frame has arrived", async () => {
    withMedia();
    withFrame({ width: 0, height: 0 });
    const p = captureProps();
    render(<CameraCapture {...p} />);
    await waitFor(() => expect(shutter()).toBeEnabled());
    await act(async () => fireEvent.click(shutter()));
    expect(p.onCapture).not.toHaveBeenCalled();
    expect(encoded).toEqual([]);
  });

  it("stops every track when it closes, and a stream that arrives after it closed", async () => {
    const live = fakeStream();
    withMedia({ stream: live.stream });
    withFrame();
    const first = render(<CameraCapture {...captureProps()} />);
    await waitFor(() => expect(shutter()).toBeEnabled());
    first.unmount();
    expect(live.tracks[0].stop).toHaveBeenCalledTimes(1);

    const late = fakeStream();
    let resolve!: (s: MediaStream) => void;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(() => new Promise<MediaStream>((r) => (resolve = r))) },
    });
    const second = render(<CameraCapture {...captureProps()} />);
    second.unmount();
    await act(async () => resolve(late.stream));
    expect(late.tracks[0].stop).toHaveBeenCalledTimes(1);
  });

  it("asks for the camera once, however often the caller re-renders it", async () => {
    const { getUserMedia } = withMedia();
    withFrame();
    const { rerender } = render(<CameraCapture {...captureProps()} />);
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));
    rerender(<CameraCapture {...captureProps()} shotCount={1} />);
    rerender(<CameraCapture {...captureProps()} shotCount={2} />);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });
});

describe("CameraCapture falls back rather than failing", () => {
  it.each([
    ["the browser has no mediaDevices at all", () => undefined],
    ["the permission is denied", () => withMedia({ stream: { denied: new DOMException("no", "NotAllowedError") } })],
  ])("hands over to the file input when %s", async (_case, install) => {
    install();
    withFrame();
    const p = captureProps();
    render(<CameraCapture {...p} />);
    await waitFor(() => expect(p.onUnavailable).toHaveBeenCalledTimes(1));
  });

  it.each([
    ["the canvas cannot be drawn on", { context: false }],
    ["the frame cannot be encoded", { blob: false }],
  ])("hands over instead of a dead shutter when %s", async (_case, frame) => {
    withMedia();
    withFrame(frame);
    const p = captureProps();
    render(<CameraCapture {...p} />);
    await waitFor(() => expect(shutter()).toBeEnabled());
    await act(async () => fireEvent.click(shutter()));
    expect(p.onCapture).not.toHaveBeenCalled();
    expect(p.onUnavailable).toHaveBeenCalledTimes(1);
  });

  it("calls the onUnavailable the caller passed last", async () => {
    withMedia();
    withFrame({ context: false });
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<CameraCapture {...captureProps()} onUnavailable={first} />);
    await waitFor(() => expect(shutter()).toBeEnabled());
    rerender(<CameraCapture {...captureProps()} onUnavailable={second} />);
    await act(async () => fireEvent.click(shutter()));
    expect(second).toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
  });
});

describe("CameraCapture's controls", () => {
  it("offers the finish button with onDone, once there is something to finish", async () => {
    withMedia();
    withFrame();
    const onDone = vi.fn();
    const { rerender } = render(<CameraCapture {...captureProps()} onDone={onDone} />);
    await waitFor(() => expect(shutter()).toBeEnabled());
    expect(screen.queryByRole("button", { name: /^Use / })).toBeNull();
    expect(screen.getByText("Frame the picture, then tap the shutter.")).toBeInTheDocument();

    rerender(<CameraCapture {...captureProps()} onDone={onDone} shotCount={2} />);
    expect(screen.getByText("2 photos taken.")).toHaveAttribute("aria-live", "polite");
    fireEvent.click(screen.getByRole("button", { name: "Use 2 photos" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("holds the shutter, the finish and every way out while busy", async () => {
    withMedia();
    withFrame();
    const p = captureProps();
    const { rerender } = render(<CameraCapture {...p} onDone={vi.fn()} shotCount={1} busy />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Use 1 photo" })).toBeDisabled());
    expect(shutter()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(p.onCancel).not.toHaveBeenCalled();

    rerender(<CameraCapture {...p} onDone={vi.fn()} shotCount={1} />);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(p.onCancel).toHaveBeenCalledTimes(1);
  });

  it("closes on the ✕", async () => {
    withMedia();
    withFrame();
    const p = captureProps();
    render(<CameraCapture {...p} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(p.onCancel).toHaveBeenCalledTimes(1);
  });

  it("keeps a tap inside from reaching the React tree it was opened from", async () => {
    // A FileDropzone round the button reads any click from its React children as "open
    // the picker"; the viewfinder is portalled, so the zone cannot tell it is not one.
    withMedia();
    withFrame();
    const outer = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- the click-anywhere zone under test
      <div onClick={outer}>
        <CameraCapture {...captureProps()} />
      </div>,
    );
    await waitFor(() => expect(shutter()).toBeEnabled());
    await act(async () => fireEvent.click(shutter()));
    expect(outer).not.toHaveBeenCalled();
  });
});

/** The two hidden inputs CameraButton renders: the picker, and the camera app's. */
function inputs(container: HTMLElement) {
  const all = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="file"]'));
  return { picker: all.find((i) => !i.hasAttribute("capture"))!, camera: all.find((i) => i.hasAttribute("capture"))! };
}

/** Record which input a click opened, instead of a dialog jsdom cannot show. */
function watchClicks() {
  const clicked: HTMLInputElement[] = [];
  vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (this: HTMLInputElement) {
    clicked.push(this);
  });
  return clicked;
}

const jpeg = (name = "IMG_0001.jpg") => new File(["x"], name, { type: "image/jpeg" });

describe("CameraButton", () => {
  it("opens the viewfinder where there is a camera, and hands over the photo it takes", async () => {
    withMedia();
    withFrame();
    const onFiles = vi.fn();
    render(<CameraButton onFiles={onFiles} />);
    const button = await screen.findByRole("button", { name: "Take photo" });
    expect(button).toHaveAttribute("type", "button");
    fireEvent.click(button);
    expect(viewfinder()).toBeInTheDocument();
    await waitFor(() => expect(shutter()).toBeEnabled());
    await act(async () => fireEvent.click(shutter()));

    expect(onFiles).toHaveBeenCalledTimes(1);
    const [files] = onFiles.mock.calls[0] as [File[]];
    expect(files).toHaveLength(1);
    expect(files[0].name).toMatch(/^photo-\d+\.jpg$/);
    // One photo, and the camera closes with it.
    expect(viewfinder()).toBeNull();
  });

  it("with multiple, keeps the camera up, counts, and hands the photos over together", async () => {
    withMedia();
    withFrame();
    const onFiles = vi.fn();
    render(<CameraButton multiple onFiles={onFiles} />);
    fireEvent.click(await screen.findByRole("button", { name: "Take photo" }));
    await waitFor(() => expect(shutter()).toBeEnabled());
    await act(async () => fireEvent.click(shutter()));
    await act(async () => fireEvent.click(shutter()));
    expect(onFiles).not.toHaveBeenCalled();
    expect(screen.getByText("2 photos taken.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Use 2 photos" }));
    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(onFiles.mock.calls[0][0]).toHaveLength(2);
    expect(viewfinder()).toBeNull();
  });

  it("with multiple, the shot that reaches maxFiles finishes; ✕ discards what was taken", async () => {
    withMedia();
    withFrame();
    const onFiles = vi.fn();
    render(<CameraButton multiple maxFiles={2} onFiles={onFiles} />);
    const open = async () => {
      fireEvent.click(screen.getByRole("button", { name: "Take photo" }));
      await waitFor(() => expect(shutter()).toBeEnabled());
    };
    await screen.findByRole("button", { name: "Take photo" });

    await open();
    await act(async () => fireEvent.click(shutter()));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(viewfinder()).toBeNull();
    expect(onFiles).not.toHaveBeenCalled();

    await open();
    // A fresh count: the discarded photo is not the first of two.
    expect(screen.getByText("Frame the picture, then tap the shutter.")).toBeInTheDocument();
    await act(async () => fireEvent.click(shutter()));
    await act(async () => fireEvent.click(shutter()));
    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(onFiles.mock.calls[0][0]).toHaveLength(2);
    expect(viewfinder()).toBeNull();
  });

  it("without a camera, is the photo picker under its own word", async () => {
    withMedia({ devices: [{ kind: "audioinput" }, { kind: "audiooutput" }] });
    const clicked = watchClicks();
    const onFiles = vi.fn();
    const { container } = render(<CameraButton onFiles={onFiles} />);
    const button = await screen.findByRole("button", { name: "Add photo" });
    fireEvent.click(button);
    const { picker } = inputs(container);
    expect(clicked).toEqual([picker]);
    expect(picker).toHaveAttribute("accept", "image/*");
    fireEvent.change(picker, { target: { files: [jpeg()] } });
    expect(onFiles).toHaveBeenCalledWith([expect.objectContaining({ name: "IMG_0001.jpg" })]);
    expect(viewfinder()).toBeNull();
  });

  it("without a camera and noCamera='hide', is not there at all", async () => {
    const { media } = withMedia({ devices: [{ kind: "audiooutput" }] });
    render(<CameraButton noCamera="hide" onFiles={vi.fn()} />);
    await waitFor(() => expect(media.enumerateDevices).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("button")).toBeNull());
  });

  it.each([
    ["the browser has no mediaDevices at all", () => undefined],
    ["enumerateDevices rejects", () => withMedia({ devices: new Error("blocked"), stream: null })],
  ])("keeps the camera when %s — and opens the camera app, with no stream to be had", async (_case, install) => {
    install();
    const clicked = watchClicks();
    const onFiles = vi.fn();
    const { container } = render(<CameraButton onFiles={onFiles} />);
    // Settled, whatever the enumeration said.
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "Take photo" }));
    const { camera } = inputs(container);
    expect(clicked).toEqual([camera]);
    expect(camera).toHaveAttribute("capture", "environment");
    // Never `multiple` beside `capture`: Chrome drops `capture` for it.
    expect(camera).not.toHaveAttribute("multiple");
    fireEvent.change(camera, { target: { files: [jpeg()] } });
    expect(onFiles).toHaveBeenCalledTimes(1);
  });

  it("falls back to the camera app when the permission is denied", async () => {
    withMedia({ stream: { denied: new DOMException("no", "NotAllowedError") } });
    const clicked = watchClicks();
    const { container } = render(<CameraButton multiple facing="user" onFiles={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Take photo" }));
    await waitFor(() => expect(clicked).toEqual([inputs(container).camera]));
    expect(inputs(container).camera).toHaveAttribute("capture", "user");
    expect(inputs(container).camera).not.toHaveAttribute("multiple");
    expect(viewfinder()).toBeNull();
  });

  it("screens what the camera app returns like any pick", async () => {
    withMedia({ stream: null });
    watchClicks();
    const onFiles = vi.fn();
    const onReject = vi.fn();
    const { container } = render(<CameraButton maxSize={5} onFiles={onFiles} onReject={onReject} />);
    fireEvent.click(await screen.findByRole("button", { name: "Take photo" }));
    fireEvent.change(inputs(container).camera, { target: { files: [new File(["far too big"], "big.jpg")] } });
    expect(onFiles).not.toHaveBeenCalled();
    expect(onReject).toHaveBeenCalledWith([expect.objectContaining({ reason: "size" })]);
  });

  it("opens nothing while pending, disabled, or under a write lock", async () => {
    const { getUserMedia } = withMedia();
    const clicked = watchClicks();
    const { rerender } = render(<CameraButton pending onFiles={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Take photo" }));
    rerender(<CameraButton disabled onFiles={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Take photo" }));
    rerender(
      <WriteLockProvider locked reason="Read-only">
        <CameraButton commit onFiles={vi.fn()} />
      </WriteLockProvider>,
    );
    const locked = screen.getByRole("button", { name: "Take photo" });
    // Focusable, with the reason: Button's disabledReason path.
    expect(locked).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(locked);
    expect(viewfinder()).toBeNull();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(clicked).toEqual([]);
  });

  it("takes its words from labels", async () => {
    withMedia();
    render(<CameraButton labels={{ takePhoto: "Photograph receipt" }} onFiles={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "Photograph receipt" })).toBeInTheDocument();
  });
});
