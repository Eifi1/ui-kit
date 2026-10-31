import { act, render, screen } from "@testing-library/react";
import { Suspense, useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { drainTasks } from "../../test/tasks";
import { lazyWithFallback, type LazyFallbackProps } from "../lazy-with-fallback";

/**
 * The tour overlay, the search palette and the feedback dialog load late, above the
 * routes' error boundaries (0.52 code review, tour.tsx). A failed import draws the
 * fallback, once per mount; the next mount, or `retry`, fetches again.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

function Greeting({ name }: { name: string }) {
  return <p>Hello {name}</p>;
}

/** A loader that fails while `online` is false, counting its fetches. */
function flakyLoader() {
  const state = { online: false, fetches: 0 };
  const load = async () => {
    state.fetches += 1;
    if (!state.online) throw new TypeError("Failed to fetch dynamically imported module");
    return Greeting;
  };
  return { state, load };
}

const fallback: { retry: (() => void) | null } = { retry: null };
function Unavailable({ name, error, retry }: { name: string } & LazyFallbackProps) {
  useEffect(() => {
    fallback.retry = retry;
  });
  return <p role="alert">{`No greeting for ${name}: ${String((error as Error).message)}`}</p>;
}

describe("lazyWithFallback", () => {
  it("draws the component when its import resolves", async () => {
    const Lazy = lazyWithFallback(async () => Greeting, Unavailable);
    render(
      <Suspense fallback={<p>Loading</p>}>
        <Lazy name="Ada" />
      </Suspense>,
    );
    expect(await screen.findByText("Hello Ada")).toBeInTheDocument();
  });

  it("draws the fallback with the error, logged, and a re-render fetches nothing", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const { state, load } = flakyLoader();
    const Lazy = lazyWithFallback(load, Unavailable);
    const { rerender } = render(
      <Suspense fallback={null}>
        <Lazy name="Ada" />
      </Suspense>,
    );
    await drainTasks();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No greeting for Ada: Failed to fetch dynamically imported module",
    );
    expect(logged).toHaveBeenCalledTimes(1);
    // One fetch: the first mount suspended and was rendered anew, from the same attempt.
    expect(state.fetches).toBe(1);

    rerender(
      <Suspense fallback={null}>
        <Lazy name="Grace" />
      </Suspense>,
    );
    await drainTasks();
    expect(screen.getByRole("alert")).toHaveTextContent("No greeting for Grace");
    expect(state.fetches).toBe(1);
  });

  it("fetches again on the next mount", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { state, load } = flakyLoader();
    const Lazy = lazyWithFallback(load, Unavailable);
    const first = render(
      <Suspense fallback={null}>
        <Lazy name="Ada" />
      </Suspense>,
    );
    await drainTasks();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    first.unmount();

    state.online = true;
    render(
      <Suspense fallback={null}>
        <Lazy name="Ada" />
      </Suspense>,
    );
    expect(await screen.findByText("Hello Ada")).toBeInTheDocument();
    expect(state.fetches).toBe(2);
  });

  it("fetches again in place on `retry`, and draws the fallback again if that fails too", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { state, load } = flakyLoader();
    const Lazy = lazyWithFallback(load, Unavailable);
    render(
      <Suspense fallback={null}>
        <Lazy name="Ada" />
      </Suspense>,
    );
    await drainTasks();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    act(() => fallback.retry!());
    await drainTasks();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(state.fetches).toBe(2);

    state.online = true;
    act(() => fallback.retry!());
    expect(await screen.findByText("Hello Ada")).toBeInTheDocument();
    expect(state.fetches).toBe(3);
  });
});
