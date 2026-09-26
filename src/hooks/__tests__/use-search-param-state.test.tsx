import { useEffect } from "react";
import { act, render } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { describe, expect, it } from "vitest";
import { useDialogParam, useSearchParamState, useTabParam } from "../use-search-param-state";

/**
 * The URL-bound state hooks (0.12.0): one param as state, the active tab, and a
 * dialog's open state with its history. Driven through a MemoryRouter, whose history
 * is the router's own — `go(-1)` and friends are observable through `useLocation`.
 */

let loc: ReturnType<typeof useLocation> | null = null;
let nav: ReturnType<typeof useNavigate> | null = null;
function Where() {
  const location = useLocation();
  const navigate = useNavigate();
  // In an effect, not during render: the probes are read after `act`, which flushes it.
  useEffect(() => {
    loc = location;
    nav = navigate;
  });
  return null;
}
const param = (key: string) => new URLSearchParams(loc!.search).get(key);

function setup<R>(useHook: () => R, initial = "/") {
  const out: { current: R | null } = { current: null };
  function Probe() {
    const value = useHook();
    useEffect(() => {
      out.current = value;
    });
    return null;
  }
  render(
    <MemoryRouter initialEntries={[initial]}>
      <Probe />
      <Where />
    </MemoryRouter>,
  );
  return out as { current: R };
}

describe("useSearchParamState", () => {
  it("reads the default when absent, and removes the param when set back to it", () => {
    const hook = setup(() => useSearchParamState("view", "list"), "/?other=1");
    expect(hook.current[0]).toBe("list");
    act(() => hook.current[1]("grid"));
    expect(hook.current[0]).toBe("grid");
    expect(param("view")).toBe("grid");
    act(() => hook.current[1]("list"));
    expect(param("view")).toBeNull();
    expect(param("other")).toBe("1");
  });

  it("parses and serialises typed values; an unparseable param is the default", () => {
    const hook = setup(
      () =>
        useSearchParamState<number>("page", 1, {
          parse: (raw) => {
            const n = Number(raw);
            return Number.isInteger(n) && n > 0 ? n : undefined;
          },
        }),
      "/?page=abc",
    );
    expect(hook.current[0]).toBe(1);
    act(() => hook.current[1](4));
    expect(param("page")).toBe("4");
    expect(hook.current[0]).toBe(4);
  });

  it("takes a functional update", () => {
    const hook = setup(() => useSearchParamState<number>("n", 0, { parse: Number }), "/?n=3");
    act(() => hook.current[1]((n) => n + 1));
    expect(hook.current[0]).toBe(4);
    act(() => hook.current[1]((n) => n - 4));
    expect(param("n")).toBeNull();
  });

  it("pushes by default and replaces when asked", () => {
    const pushed = setup(() => useSearchParamState("q", ""));
    act(() => pushed.current[1]("a"));
    act(() => nav!(-1));
    expect(param("q")).toBeNull();

    const replaced = setup(() => useSearchParamState("q", "", { replace: true }), "/start");
    act(() => replaced.current[1]("a"));
    // Replaced: there is no entry behind it to go back to, so Back stays put.
    act(() => nav!(-1));
    expect(loc!.pathname).toBe("/start");
    expect(param("q")).toBe("a");
  });

  it("replace-on-clear pushes a value and replaces its removal", () => {
    const hook = setup(() => useSearchParamState<string | null>("edit", null, { history: "replace-on-clear" }), "/p");
    act(() => hook.current[1]("7"));
    const key = loc!.key;
    act(() => hook.current[1](null));
    expect(param("edit")).toBeNull();
    // The removal rewrote the pushed entry instead of stacking another.
    expect(loc!.key).not.toBe(key);
    act(() => nav!(-1));
    expect(loc!.pathname).toBe("/p");
    expect(param("edit")).toBeNull();
  });
});

describe("useTabParam", () => {
  it("keeps the default tab out of the URL and rejects a tab that does not exist", () => {
    const hook = setup(
      () => useTabParam("overview", { tabs: ["overview", "history"] as const }),
      "/?tab=gone",
    );
    expect(hook.current[0]).toBe("overview");
    act(() => hook.current[1]("history"));
    expect(param("tab")).toBe("history");
    act(() => hook.current[1]("overview"));
    expect(param("tab")).toBeNull();
  });

  it("takes another key", () => {
    const hook = setup(() => useTabParam("a", { key: "section" }), "/?section=b");
    expect(hook.current[0]).toBe("b");
  });
});

describe("useDialogParam", () => {
  it("opens by pushing, and closing goes back over that entry", () => {
    const hook = setup(() => useDialogParam({ key: "dialog", value: "create" }), "/leases");
    expect(hook.current[0]).toBe(false);
    act(() => hook.current[1](true));
    expect(hook.current[0]).toBe(true);
    expect(param("dialog")).toBe("create");
    act(() => hook.current[1](false));
    expect(hook.current[0]).toBe(false);
    expect(loc!.search).toBe("");
    // Back from here leaves the page's first entry — there is no dead dialog entry.
    expect(loc!.key).toBe("default");
  });

  it("a deep-linked dialog closes in place", () => {
    const hook = setup(() => useDialogParam("edit"), "/leases?edit=1&x=2");
    expect(hook.current[0]).toBe(true);
    act(() => hook.current[1](false));
    expect(hook.current[0]).toBe(false);
    expect(param("edit")).toBeNull();
    expect(param("x")).toBe("2");
  });

  it("the Back gesture closes it", () => {
    const hook = setup(() => useDialogParam("edit"), "/leases");
    act(() => hook.current[1](true));
    expect(param("edit")).toBe("1");
    act(() => nav!(-1));
    expect(hook.current[0]).toBe(false);
  });

  it("a different value of the same key is a different dialog", () => {
    const hook = setup(() => useDialogParam({ key: "dialog", value: "a" }), "/?dialog=b");
    expect(hook.current[0]).toBe(false);
  });
});
