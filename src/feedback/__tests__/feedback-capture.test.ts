import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `captureAppScreenshot` (0.27.0, docs/feedback-harmonization.md §5) — keksdose's
 * `capture-screenshot.ts` (live #271). The optional peer is mocked: what is asserted is
 * that the levers that made it fast are actually PASSED (keksdose exported its options
 * for the same reason), how the file is named, and that a missing peer rejects.
 */

const domToBlob = vi.fn<(el: Element, options: Record<string, unknown>) => Promise<Blob>>();
vi.mock("modern-screenshot", () => ({ domToBlob: (el: Element, o: Record<string, unknown>) => domToBlob(el, o) }));

const { captureAppScreenshot } = await import("../feedback-capture");

type Filter = (node: Node) => boolean;
const passed = () => domToBlob.mock.calls[0][1] as { filter: Filter; includeStyleProperties: string[] } & Record<string, unknown>;

beforeEach(() => {
  domToBlob.mockReset();
  document.body.innerHTML = '<div id="root"><p>App</p></div><div id="app"></div>';
});
afterEach(() => {
  document.body.innerHTML = "";
});

describe("captureAppScreenshot", () => {
  it("captures #root as WebP at 0.9, without re-embedding fonts, through the style allow-list", async () => {
    domToBlob.mockResolvedValue(new Blob(["x"], { type: "image/webp" }));
    const file = await captureAppScreenshot();
    expect(domToBlob).toHaveBeenCalledTimes(1);
    expect(domToBlob.mock.calls[0][0]).toBe(document.getElementById("root"));
    const options = passed();
    expect(options).toMatchObject({ type: "image/webp", quality: 0.9, font: false });
    // Longhands only: a shorthand reads "" whenever its sides disagree.
    expect(options.includeStyleProperties).toContain("font-variant-numeric");
    expect(options.includeStyleProperties).toContain("stroke");
    expect(options.includeStyleProperties).toContain("border-top-width");
    expect(options.includeStyleProperties).not.toContain("border");
    expect(options.includeStyleProperties.length).toBeGreaterThan(100);
    expect(typeof options.filter).toBe("function");
    expect(file).toBeInstanceOf(File);
    expect(file!.name).toBe("screenshot.webp");
    expect(file!.type).toBe("image/webp");
  });

  it("names the file from what the canvas produced: PNG where WebP cannot be encoded", async () => {
    domToBlob.mockResolvedValue(new Blob(["x"], { type: "image/png" }));
    expect((await captureAppScreenshot())!.name).toBe("screenshot.png");
    domToBlob.mockResolvedValue(new Blob(["x"]));
    const untyped = await captureAppScreenshot();
    expect(untyped!.name).toBe("screenshot.png");
    expect(untyped!.type).toBe("image/png");
  });

  it("takes another root, and resolves null when there is none", async () => {
    domToBlob.mockResolvedValue(new Blob(["x"], { type: "image/webp" }));
    await captureAppScreenshot({ rootId: "app" });
    expect(domToBlob.mock.calls[0][0]).toBe(document.getElementById("app"));
    domToBlob.mockClear();
    expect(await captureAppScreenshot({ rootId: "nowhere" })).toBeNull();
    expect(domToBlob).not.toHaveBeenCalled();
  });

  it("rethrows a failed capture: what to say about it is the caller's", async () => {
    domToBlob.mockRejectedValue(new Error("tainted canvas"));
    await expect(captureAppScreenshot()).rejects.toThrow("tainted canvas");
  });
});

describe("the capture filter", () => {
  const rect = (r: Partial<DOMRect>) => ({ x: 0, y: 0, width: 10, height: 10, top: 0, left: 0, right: 10, bottom: 10, ...r }) as DOMRect;

  async function filter(): Promise<Filter> {
    domToBlob.mockResolvedValue(new Blob(["x"], { type: "image/webp" }));
    await captureAppScreenshot();
    return passed().filter;
  }

  it("drops display:none subtrees but keeps <style> and <link>", async () => {
    const keep = await filter();
    const hidden = document.createElement("div");
    hidden.style.display = "none";
    document.body.append(hidden);
    expect(keep(hidden)).toBe(false);
    const style = document.createElement("style");
    document.body.append(style);
    vi.spyOn(style, "getBoundingClientRect").mockReturnValue(rect({ width: 0, height: 0 }));
    expect(keep(style)).toBe(true);
  });

  it("drops a box wholly outside the viewport, keeps one that overlaps it and a zero box", async () => {
    const keep = await filter();
    const el = document.createElement("div");
    document.body.append(el);
    const spy = vi.spyOn(el, "getBoundingClientRect");
    spy.mockReturnValue(rect({ top: window.innerHeight + 5, bottom: window.innerHeight + 50 }));
    expect(keep(el)).toBe(false);
    spy.mockReturnValue(rect({ top: -40, bottom: -1 }));
    expect(keep(el)).toBe(false);
    spy.mockReturnValue(rect({ top: -40, bottom: 20 }));
    expect(keep(el)).toBe(true);
    // `display: contents` reports 0×0 while its children paint.
    spy.mockReturnValue(rect({ top: -900, bottom: -900, width: 0, height: 0 }));
    expect(keep(el)).toBe(true);
    expect(keep(document.createTextNode("text"))).toBe(true);
  });
});

describe("without the optional peer", () => {
  it("rejects, naming the package to install", async () => {
    vi.resetModules();
    vi.doMock("modern-screenshot", () => {
      throw new Error("Cannot find package 'modern-screenshot'");
    });
    const fresh = await import("../feedback-capture");
    await expect(fresh.captureAppScreenshot()).rejects.toThrow(/optional peer `modern-screenshot`/);
    vi.doUnmock("modern-screenshot");
  });
});

describe("no module imports modern-screenshot statically", () => {
  // As optional-peer-imports.test.tsx does for sonner: the barrel re-exports the capture,
  // so a static import would make every app that imports a Button install the peer.
  const SOURCES = import.meta.glob<string>("../../**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true });
  const STATIC = /^\s*import\s[^;]*?["']modern-screenshot["']/m;

  it("finds none, and the sweep can see one", () => {
    const offenders = Object.entries(SOURCES)
      .filter(([path]) => !path.includes("__tests__"))
      .filter(([, src]) => STATIC.test(src))
      .map(([path]) => path.split("/").pop());
    expect(offenders).toEqual([]);
    expect(STATIC.test(`import { domToBlob } from "modern-screenshot";\n`)).toBe(true);
    expect(STATIC.test(`const { domToBlob } = await import("modern-screenshot");\n`)).toBe(false);
    expect(Object.keys(SOURCES).some((path) => path.endsWith("feedback-capture.ts"))).toBe(true);
  });
});
