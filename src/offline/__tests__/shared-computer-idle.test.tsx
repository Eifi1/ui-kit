import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_FR } from "../../i18n/locales/fr";
import { setSharedComputer } from "../shared-computer";
import { useSharedComputerIdleSignOut, type SharedComputerIdleSignOutOptions } from "../shared-computer-idle";

const mocks = vi.hoisted(() => ({ toast: Object.assign(vi.fn(), { dismiss: vi.fn() }) }));
vi.mock("../../components/toast", () => ({ toast: mocks.toast }));

const MINUTE = 60_000;
const ID = "shared-computer-idle";
type ToastOptions = { id: string; duration: number; action: { label: string; onClick: () => void } };
const lastToast = () => mocks.toast.mock.calls.at(-1) as [string, ToastOptions];

const after = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const fire = (target: EventTarget, type: string) => act(() => void target.dispatchEvent(new Event(type)));
const press = () => fire(window, "keydown");
/** The tab is shown again: `visibilitychange` with the page visible. */
const shown = (state: DocumentVisibilityState = "visible") => {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  fire(document, "visibilitychange");
};
/** The wall clock moves while no timer runs: a machine asleep, a tab frozen in the background. */
const sleep = (ms: number) => act(() => void vi.setSystemTime(Date.now() + ms));

const mount = (options: Partial<SharedComputerIdleSignOutOptions> = {}) => {
  const onSignOut = vi.fn();
  const hook = renderHook(
    (props: Partial<SharedComputerIdleSignOutOptions>) => useSharedComputerIdleSignOut({ onSignOut, ...props }),
    { initialProps: options },
  );
  return { onSignOut, ...hook };
};

beforeEach(() => {
  vi.useFakeTimers();
  mocks.toast.mockClear();
  mocks.toast.dismiss.mockClear();
  setSharedComputer(true);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.sessionStorage.clear();
  Reflect.deleteProperty(document, "visibilityState");
});

describe("useSharedComputerIdleSignOut", () => {
  it("signs out after 15 minutes without input, not before, and once", () => {
    const { onSignOut } = mount();
    after(15 * MINUTE - 1);
    expect(onSignOut).not.toHaveBeenCalled();
    after(1);
    expect(onSignOut).toHaveBeenCalledTimes(1);
    after(60 * MINUTE);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it.each(["pointerdown", "pointermove", "keydown", "wheel", "touchstart"])(
    "%s starts the 15 minutes again",
    (type) => {
      const { onSignOut } = mount();
      after(10 * MINUTE);
      fire(window, type);
      after(15 * MINUTE - 1);
      expect(onSignOut).not.toHaveBeenCalled();
      after(1);
      expect(onSignOut).toHaveBeenCalledTimes(1);
    },
  );

  it("the tab shown again is input; hidden is not", () => {
    const { onSignOut } = mount();
    after(5 * MINUTE);
    shown("hidden");
    after(5 * MINUTE);
    shown("visible");
    after(15 * MINUTE - 1);
    expect(onSignOut).not.toHaveBeenCalled();
    after(1);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("a stream of input sets no timer: an event only notes the time", () => {
    mount();
    after(MINUTE);
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    act(() => {
      for (let i = 0; i < 500; i++) {
        window.dispatchEvent(new Event("pointermove"));
        vi.advanceTimersByTime(10);
      }
    });
    expect(setTimeoutSpy).not.toHaveBeenCalled();
    expect(clearTimeoutSpy).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
  });

  it("idleMinutes sets the wait", () => {
    const { onSignOut } = mount({ idleMinutes: 5 });
    after(4 * MINUTE);
    expect(mocks.toast).toHaveBeenCalledTimes(1);
    after(MINUTE - 1);
    expect(onSignOut).not.toHaveBeenCalled();
    after(1);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("calls the onSignOut of the latest render", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook((props: { onSignOut: () => void }) => useSharedComputerIdleSignOut(props), {
      initialProps: { onSignOut: first },
    });
    after(MINUTE);
    rerender({ onSignOut: second });
    after(14 * MINUTE);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe("the warning a minute before", () => {
  it("is a toast offering to stay signed in; taking it starts over", () => {
    const { onSignOut } = mount();
    after(14 * MINUTE - 1);
    expect(mocks.toast).not.toHaveBeenCalled();
    after(1);
    expect(mocks.toast).toHaveBeenCalledTimes(1);
    const [message, options] = lastToast();
    expect(message).toBe("Nothing has happened here for a while. You will be signed out in a minute.");
    expect(options).toMatchObject({ id: ID, duration: Infinity, action: { label: "Stay signed in" } });

    act(() => options.action.onClick());
    expect(mocks.toast.dismiss).toHaveBeenCalledWith(ID);
    after(MINUTE);
    expect(onSignOut).not.toHaveBeenCalled();
    after(13 * MINUTE);
    expect(mocks.toast).toHaveBeenCalledTimes(2);
    after(MINUTE);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("a press or a key takes it down and starts over", () => {
    const { onSignOut } = mount();
    after(14 * MINUTE);
    press();
    expect(mocks.toast.dismiss).toHaveBeenCalledWith(ID);
    after(14 * MINUTE + 59_999);
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it("a pointer only moving does not: the toast stays under the pointer heading for its button", () => {
    const { onSignOut } = mount();
    after(14 * MINUTE);
    fire(window, "pointermove");
    expect(mocks.toast.dismiss).not.toHaveBeenCalled();
    after(MINUTE);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("goes when the hook signs out", () => {
    mount();
    after(15 * MINUTE);
    expect(mocks.toast.dismiss).toHaveBeenCalledWith(ID);
  });

  it("speaks the provider's language", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <UiKitProvider labels={UI_KIT_LABELS_FR}>{children}</UiKitProvider>
    );
    renderHook(() => useSharedComputerIdleSignOut({ onSignOut: () => {} }), { wrapper });
    after(14 * MINUTE);
    const [message, options] = lastToast();
    expect(message).toBe(UI_KIT_LABELS_FR.sharedComputer.idleWarning);
    expect(options.action.label).toBe(UI_KIT_LABELS_FR.sharedComputer.staySignedIn);
  });

  it("warn: false shows none", () => {
    const { onSignOut } = mount({ warn: false });
    after(15 * MINUTE);
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});

describe("a tab whose timers slept", () => {
  it("signs out at once when it is shown again past the limit, instead of starting over", () => {
    const { onSignOut } = mount();
    after(2 * MINUTE);
    sleep(20 * MINUTE);
    shown();
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("the same for a key, and for a page back from the back-forward cache", () => {
    const keyed = mount();
    sleep(16 * MINUTE);
    press();
    expect(keyed.onSignOut).toHaveBeenCalledTimes(1);
    keyed.unmount();

    const restored = mount();
    sleep(16 * MINUTE);
    fire(window, "pageshow");
    expect(restored.onSignOut).toHaveBeenCalledTimes(1);
  });
});

describe("when it does nothing", () => {
  it("on a computer not marked shared (the default reads isSharedComputer())", () => {
    setSharedComputer(false);
    const { onSignOut } = mount();
    expect(vi.getTimerCount()).toBe(0);
    after(60 * MINUTE);
    press();
    expect(onSignOut).not.toHaveBeenCalled();
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it("while enabled is false; the count starts when it turns true", () => {
    const { onSignOut, rerender } = mount({ enabled: false });
    after(20 * MINUTE);
    expect(onSignOut).not.toHaveBeenCalled();
    rerender({ enabled: true });
    after(15 * MINUTE - 1);
    expect(onSignOut).not.toHaveBeenCalled();
    after(1);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("after unmount: no timer, no listener, and the warning taken down", () => {
    const { onSignOut, unmount } = mount();
    after(14 * MINUTE);
    unmount();
    expect(mocks.toast.dismiss).toHaveBeenCalledWith(ID);
    expect(vi.getTimerCount()).toBe(0);
    sleep(30 * MINUTE);
    press();
    shown();
    after(60 * MINUTE);
    expect(onSignOut).not.toHaveBeenCalled();
  });
});
