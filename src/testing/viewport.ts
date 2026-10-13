/**
 * Environment stubs for an app's own tests (0.34, refactor audit 2026-10, TST-10): the
 * two browser APIs jsdom does not have and the kit's layout reads — `matchMedia` and
 * `ResizeObserver`.
 *
 * Every suite rebuilt them by hand: the kit stubbed `matchMedia` in 25 files and defined
 * the same `stubPhone()` eight times, keksdose stubs it in 41, and most copies answer
 * one literal string. That breaks quietly at Large text, where `md` is 960 px and the
 * phone query the kit writes is `(width < 960px)`, not `(width < 768px)`. These answer
 * every width query from a WIDTH, as a browser does, so they stay right at every text
 * size (docs/text-size-harmonization.md §3.3). The reference is keksdose's
 * `frontend/src/test/viewport.ts`, which this generalises.
 *
 * Framework-free, like the rest of `@eifi1/ui-kit/testing`: nothing here imports vitest
 * or jest. Each stub returns its own undo, so it works under either runner, and a suite
 * that prefers `vi.stubGlobal` passes it {@link viewportMatchMedia} instead.
 */

/** The media features a test may want besides the width. Each is off by default. */
export interface ViewportOptions {
  /** The primary pointer is a finger: `(pointer: coarse)`, `(any-pointer: coarse)` and
   *  `(hover: none)` match; `(pointer: fine)` and `(hover: hover)` do not. */
  coarse?: boolean;
  /** The person asked for less motion: `(prefers-reduced-motion: reduce)` matches, and
   *  the kit's overlays skip their exit animations. */
  reducedMotion?: boolean;
  /** `(prefers-color-scheme: dark)` matches (`light` does not). */
  dark?: boolean;
  /** `(prefers-contrast: more)` matches. */
  moreContrast?: boolean;
}

/** One length in CSS px. A media query's `rem`/`em` is the browser's default font size,
 *  16 px, never `<html>`'s — the kit's own `breakpointQuery` writes px. */
function lengthPx(value: string, unit: string): number {
  return unit === "px" ? Number(value) : Number(value) * 16;
}

const RANGE = /^\(\s*width\s*(<=|>=|<|>)\s*([\d.]+)(px|r?em)\s*\)$/;
const MIN_MAX = /^\(\s*(min|max)-width\s*:\s*([\d.]+)(px|r?em)\s*\)$/;
const FEATURE = /^\(\s*([a-z-]+)\s*:\s*([a-z-]+)\s*\)$/;

/** One `(…)` condition, or a media type. */
function condition(part: string, width: number, options: ViewportOptions): boolean {
  const q = part.trim();
  if (q === "all" || q === "screen") return true;
  const range = RANGE.exec(q);
  if (range) {
    const px = lengthPx(range[2], range[3]);
    switch (range[1]) {
      case "<":
        return width < px;
      case "<=":
        return width <= px;
      case ">":
        return width > px;
      default:
        return width >= px;
    }
  }
  const minMax = MIN_MAX.exec(q);
  if (minMax) {
    const px = lengthPx(minMax[2], minMax[3]);
    return minMax[1] === "min" ? width >= px : width <= px;
  }
  const feature = FEATURE.exec(q);
  if (!feature) return false;
  const [, name, value] = feature;
  const coarse = Boolean(options.coarse);
  switch (name) {
    case "pointer":
    case "any-pointer":
      return value === (coarse ? "coarse" : "fine");
    case "hover":
    case "any-hover":
      return value === (coarse ? "none" : "hover");
    case "prefers-reduced-motion":
      return value === (options.reducedMotion ? "reduce" : "no-preference");
    case "prefers-color-scheme":
      return value === (options.dark ? "dark" : "light");
    case "prefers-contrast":
      return value === (options.moreContrast ? "more" : "no-preference");
    default:
      return false;
  }
}

/** A whole query: comma lists are alternatives, `and` joins conditions, as in CSS. */
function answer(query: string, width: number, options: ViewportOptions): boolean {
  return query
    .split(",")
    .some((alternative) =>
      alternative.split(/\s+and\s+/).every((part) => condition(part, width, options)),
    );
}

/** A list {@link viewportMatchMedia} handed out: what {@link setViewportWidth} flips. */
interface StubMediaQueryList {
  matches: boolean;
  readonly media: string;
  onchange: ((this: MediaQueryList, event: MediaQueryListEvent) => unknown) | null;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void;
  addListener(listener: EventListenerOrEventListenerObject | null): void;
  removeListener(listener: EventListenerOrEventListenerObject | null): void;
  dispatchEvent(event: Event): boolean;
}

/** One stub's viewport: its width now, and every list it has handed out. */
interface StubViewport {
  width: number;
  readonly options: ViewportOptions;
  readonly lists: Set<StubMediaQueryList>;
}

/** Each `matchMedia` {@link viewportMatchMedia} made → its viewport. Keyed by the function,
 *  so {@link setViewportWidth} finds whichever stub is in force however it was put in. */
const VIEWPORTS = new WeakMap<object, StubViewport>();

function mediaQueryList(query: string, viewport: StubViewport): StubMediaQueryList {
  // One set for both APIs: in a browser `addListener(fn)` IS `addEventListener("change",
  // fn)`, so adding the same function through both registers it once.
  const listeners = new Set<EventListenerOrEventListenerObject>();
  const list: StubMediaQueryList = {
    matches: answer(query, viewport.width, viewport.options),
    media: query,
    onchange: null,
    addEventListener(type, listener) {
      if (type === "change" && listener) listeners.add(listener);
    },
    removeEventListener(type, listener) {
      if (type === "change" && listener) listeners.delete(listener);
    },
    addListener(listener) {
      if (listener) listeners.add(listener);
    },
    removeListener(listener) {
      if (listener) listeners.delete(listener);
    },
    dispatchEvent(event) {
      if (event.type !== "change") return true;
      const self = list as unknown as MediaQueryList;
      list.onchange?.call(self, event as MediaQueryListEvent);
      for (const listener of [...listeners]) {
        if (typeof listener === "function") listener.call(self, event);
        else listener.handleEvent(event);
      }
      return !event.defaultPrevented;
    },
  };
  return list;
}

/** The `change` a browser fires at a list whose answer flipped: a `MediaQueryListEvent`'s
 *  `matches` and `media`, on an `Event` (jsdom has no `MediaQueryListEvent`). */
function changeEvent(list: StubMediaQueryList): Event {
  const event = new Event("change");
  for (const [key, value] of Object.entries({ matches: list.matches, media: list.media, target: list, currentTarget: list })) {
    Object.defineProperty(event, key, { value, enumerable: true });
  }
  return event;
}

/**
 * A `window.matchMedia` for a viewport `width` CSS px wide.
 *
 * Width queries answer from `width`: the range syntax the kit writes for `max-*`
 * (`(width < 768px)`) and every other comparison, `(min-width: …)` and `(max-width: …)`,
 * in px or rem; `and` and comma lists combine as in CSS. The features in `options` answer
 * as set there; every other query is false. The lists keep their listeners, and
 * {@link setViewportWidth} resizes the viewport under them the way a browser window
 * does: each list whose answer flips fires `change`.
 *
 * Hand it to the runner's own global stub where the suite undoes stubs that way —
 * `vi.stubGlobal("matchMedia", viewportMatchMedia(375))` — or use
 * {@link stubViewportWidth}.
 */
export function viewportMatchMedia(
  width: number,
  options: ViewportOptions = {},
): (query: string) => MediaQueryList {
  const viewport: StubViewport = { width, options, lists: new Set() };
  const matchMedia = (query: string) => {
    const list = mediaQueryList(query, viewport);
    viewport.lists.add(list);
    return list as unknown as MediaQueryList;
  };
  VIEWPORTS.set(matchMedia, viewport);
  return matchMedia;
}

/**
 * Resize the stubbed viewport to `width` CSS px, live — the window being dragged narrower,
 * a phone turned (0.34.1, keksdose's 0.34 report). Every list the stub in force has handed
 * out answers from the new width, and each one whose answer flipped fires `change` to its
 * `addEventListener` listeners, its legacy `addListener` ones and its `onchange`, as in a
 * browser; a list whose answer stayed the same tells nobody. So a mounted component that
 * listens to a breakpoint (`usePhoneLayout()`, `useBreakpoint()`) switches without being
 * rendered again.
 *
 * The stub in force is whatever `window.matchMedia` is now — one {@link stubViewportWidth}
 * or `vi.stubGlobal("matchMedia", viewportMatchMedia(…))` put in; its features
 * (`options`) stay as they were. Throws when `matchMedia` is not one of these stubs, rather
 * than resize nothing. Synchronous: wrap it in `act()` when a listener sets state.
 *
 * ```ts
 * undo = stubViewportWidth(1280);
 * render(<Page />);
 * act(() => setViewportWidth(375));
 * expect(screen.getByRole("list")).toBeInTheDocument(); // the cards
 * ```
 */
export function setViewportWidth(width: number): void {
  const viewport = typeof window === "undefined" ? undefined : VIEWPORTS.get(window.matchMedia);
  if (!viewport) {
    throw new Error(
      "setViewportWidth: no viewport stub is in force — put one in first with " +
        "stubViewportWidth(width), or vi.stubGlobal(\"matchMedia\", viewportMatchMedia(width)).",
    );
  }
  viewport.width = width;
  for (const list of [...viewport.lists]) {
    const matches = answer(list.media, width, viewport.options);
    if (matches === list.matches) continue;
    list.matches = matches;
    list.dispatchEvent(changeEvent(list));
  }
}

/**
 * Make `window.matchMedia` answer as a viewport `width` CSS px wide (see
 * {@link viewportMatchMedia}), and return the undo: it puts back what was there, which
 * in jsdom is nothing — no `matchMedia` at all, the desktop fallback of every kit hook.
 *
 * ```ts
 * let undo = () => {};
 * afterEach(() => undo());
 * it("shows cards on a phone", () => {
 *   undo = stubViewportWidth(375);
 *   …
 * });
 * ```
 *
 * Right at every text size: at Large the kit's phone query is `(width < 960px)`, which a
 * 375 px viewport matches and a 1280 px one does not, as in a browser.
 */
export function stubViewportWidth(width: number, options: ViewportOptions = {}): () => void {
  const before = Object.getOwnPropertyDescriptor(window, "matchMedia");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: viewportMatchMedia(width, options),
  });
  return () => {
    if (before) Object.defineProperty(window, "matchMedia", before);
    else Reflect.deleteProperty(window, "matchMedia");
  };
}

/** A box size for {@link ResizeObserverStub.resize}, in CSS px. */
export interface StubbedBoxSize {
  width: number;
  height: number;
}

/** What {@link stubResizeObserver} returns: the test drives the observers. */
export interface ResizeObserverStub {
  /**
   * Report `target` at `size` to every live observer watching it, as a browser does once
   * layout settles: one entry, with `contentRect` and the three box sizes all `size`.
   * Synchronous; wrap it in `act()` when the callback sets state.
   */
  resize(target: Element, size: StubbedBoxSize): void;
  /** The elements some live observer watches now, each once. */
  observed(): Element[];
  /** Put back the `ResizeObserver` that was there before — in jsdom, none. */
  restore(): void;
}

/**
 * Install a `ResizeObserver` the test drives. jsdom has none, and lays nothing out, so a
 * component that measures itself (a windowed list, a fitted chart, a measured grid)
 * either crashes on the missing global or never learns a size. Observers here record
 * what they watch and are called only by {@link ResizeObserverStub.resize}.
 *
 * ```ts
 * const ro = stubResizeObserver();
 * afterEach(() => ro.restore());
 * act(() => ro.resize(screen.getByRole("list"), { width: 400, height: 320 }));
 * ```
 */
export function stubResizeObserver(): ResizeObserverStub {
  const live = new Set<StubResizeObserver>();

  class StubResizeObserver {
    readonly targets = new Set<Element>();
    constructor(readonly callback: ResizeObserverCallback) {
      live.add(this);
    }
    observe(target: Element) {
      this.targets.add(target);
    }
    unobserve(target: Element) {
      this.targets.delete(target);
    }
    disconnect() {
      this.targets.clear();
      live.delete(this);
    }
  }

  const before = Object.getOwnPropertyDescriptor(globalThis, "ResizeObserver");
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: StubResizeObserver,
  });

  return {
    resize(target, { width, height }) {
      const box = [{ inlineSize: width, blockSize: height }];
      const contentRect = {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        width,
        height,
        right: width,
        bottom: height,
        toJSON: () => ({ x: 0, y: 0, width, height }),
      };
      const entry = {
        target,
        contentRect,
        borderBoxSize: box,
        contentBoxSize: box,
        devicePixelContentBoxSize: box,
      } as unknown as ResizeObserverEntry;
      for (const observer of [...live]) {
        if (observer.targets.has(target)) {
          observer.callback([entry], observer as unknown as ResizeObserver);
        }
      }
    },
    observed() {
      const all: Element[] = [];
      for (const observer of live) for (const target of observer.targets) if (!all.includes(target)) all.push(target);
      return all;
    },
    restore() {
      live.clear();
      if (before) Object.defineProperty(globalThis, "ResizeObserver", before);
      else Reflect.deleteProperty(globalThis, "ResizeObserver");
    },
  };
}
