import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import {
  FIELD_SYNC_FRAME,
  FIELD_SYNC_SAVED_MS,
  FieldSyncIndicator,
  FieldSyncRow,
  useFieldSync,
} from "../field-sync";
import type { FieldSyncState, UseFieldSyncReturn } from "../field-sync";

/**
 * The states are easy; the transitions between them are where a field loses a
 * keystroke. Each test here is one of those transitions, and several are written
 * against a specific way this can go wrong rather than against the happy path.
 */

/** A save whose settling this test controls. */
function deferred() {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useFieldSync", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts synced and goes edited → pending → synced on a debounced save", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFieldSync({ value: "a", onSave, debounceMs: 100 }));

    expect(result.current.state).toBe("synced");
    expect(result.current.dirty).toBe(false);

    act(() => result.current.setValue("ab"));
    expect(result.current.state).toBe("edited");
    expect(result.current.dirty).toBe(true);
    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(onSave).toHaveBeenCalledExactlyOnceWith("ab");
    await waitFor(() => expect(result.current.state).toBe("synced"));
  });

  it("restarts the debounce on each keystroke, so typing saves once", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFieldSync({ value: "", onSave, debounceMs: 100 }));

    for (const v of ["a", "ab", "abc"]) {
      act(() => result.current.setValue(v));
      act(() => {
        vi.advanceTimersByTime(60); // each below the threshold
      });
    }
    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(onSave).toHaveBeenCalledExactlyOnceWith("abc");
  });

  it("save() flushes immediately and cancels the pending debounce", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFieldSync({ value: "a", onSave, debounceMs: 5000 }));

    act(() => result.current.setValue("ab"));
    await act(async () => {
      result.current.save();
    });
    expect(onSave).toHaveBeenCalledExactlyOnceWith("ab");

    // The cancelled timer must not fire a second write later.
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("debounceMs: 0 never auto-saves — save() is the only way", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFieldSync({ value: "a", onSave, debounceMs: 0 }));

    act(() => result.current.setValue("ab"));
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.state).toBe("edited");
  });

  it("does NOT lose an edit made while a save is in flight", async () => {
    // The failure this pins: cancel-on-new-edit drops the keystroke that arrived
    // mid-flight, and fire-immediately lets two writes land out of order. The hook
    // re-compares once the first settles and sends the difference exactly once.
    const first = deferred();
    const onSave = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValue(undefined);
    const { result } = renderHook(() => useFieldSync({ value: "a", onSave, debounceMs: 10 }));

    act(() => result.current.setValue("ab"));
    await act(async () => {
      vi.advanceTimersByTime(10);
    });
    expect(result.current.state).toBe("pending");
    expect(onSave).toHaveBeenCalledExactlyOnceWith("ab");

    // Type again while "ab" is still in the air.
    act(() => result.current.setValue("abc"));
    expect(onSave).toHaveBeenCalledTimes(1); // not raced

    await act(async () => {
      first.resolve();
    });
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(onSave).toHaveBeenLastCalledWith("abc");
    await waitFor(() => expect(result.current.state).toBe("synced"));
  });

  it("enters error with the rejection's message, and retry() resends", async () => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error("row is locked"))
      .mockResolvedValue(undefined);
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useFieldSync({ value: "a", onSave, debounceMs: 10, onError }),
    );

    act(() => result.current.setValue("ab"));
    await act(async () => {
      vi.advanceTimersByTime(10);
    });
    await waitFor(() => expect(result.current.state).toBe("error"));
    expect(result.current.error?.message).toBe("row is locked");
    expect(result.current.dirty).toBe(true);
    expect(onError).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ message: "row is locked" }));

    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.state).toBe("synced"));
    expect(result.current.error).toBeNull();
  });

  it("clears the error as soon as the value is edited again", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("nope"));
    const { result } = renderHook(() => useFieldSync({ value: "a", onSave, debounceMs: 10 }));

    act(() => result.current.setValue("ab"));
    await act(async () => {
      vi.advanceTimersByTime(10);
    });
    await waitFor(() => expect(result.current.state).toBe("error"));

    act(() => result.current.setValue("abc"));
    expect(result.current.state).toBe("edited");
    expect(result.current.error).toBeNull();
  });

  it("typing back to the persisted value returns to synced without a save", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFieldSync({ value: "a", onSave, debounceMs: 10 }));

    act(() => result.current.setValue("ab"));
    act(() => result.current.setValue("a"));
    expect(result.current.state).toBe("synced");

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("adopts a new server value while clean", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ value }) => useFieldSync({ value, onSave, debounceMs: 10 }),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "server" });
    expect(result.current.value).toBe("server");
    expect(result.current.state).toBe("synced");
  });

  it("does NOT overwrite a dirty draft when the server value changes", () => {
    // Adopting here would delete what somebody is typing — a data-loss bug, and the
    // reason the effect checks the draft before taking the new value.
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ value }) => useFieldSync({ value, onSave, debounceMs: 5000 }),
      { initialProps: { value: "a" } },
    );

    act(() => result.current.setValue("mine"));
    rerender({ value: "theirs" });

    expect(result.current.value).toBe("mine");
    expect(result.current.state).toBe("edited");
  });

  it("reset() discards the draft and returns to the persisted value", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFieldSync({ value: "a", onSave, debounceMs: 5000 }));

    act(() => result.current.setValue("ab"));
    act(() => result.current.reset());

    expect(result.current.value).toBe("a");
    expect(result.current.state).toBe("synced");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("does not set state after unmount", async () => {
    // A row scrolled out of a virtualised table, or a closed dialog, while the save
    // is still in the air. React logs an error for a post-unmount update, so an
    // empty console IS the assertion.
    const d = deferred();
    const onSave = vi.fn().mockReturnValue(d.promise);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result, unmount } = renderHook(() =>
      useFieldSync({ value: "a", onSave, debounceMs: 10 }),
    );

    act(() => result.current.setValue("ab"));
    await act(async () => {
      vi.advanceTimersByTime(10);
    });
    unmount();
    await act(async () => {
      d.resolve();
    });

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("a debounce that has not fired yet is cancelled by unmount", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() =>
      useFieldSync({ value: "a", onSave, debounceMs: 100 }),
    );

    act(() => result.current.setValue("ab"));
    unmount();
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("FieldSyncIndicator", () => {
  /** What a screen reader is handed: the live region, not the hover bubble.
   *
   *  The state text is deliberately in the DOM twice — once inside the live region
   *  (announced, and present whether or not it is visible) and once as the Tooltip's
   *  own `role="tooltip"` bubble (seen on hover). Asserting on the live region is
   *  therefore both unambiguous and the thing that actually matters. */
  const announced = (): HTMLElement => {
    const el = document.querySelector<HTMLElement>("[aria-live]");
    if (!el) throw new Error("no live region rendered");
    return el;
  };

  it("names every state in text, not only in colour", () => {
    // WCAG 1.4.1: the four colours include the green/red pair, so the state has to
    // survive without colour. Each renders an icon plus a text node.
    for (const [state, text] of [
      ["synced", "Saved"],
      ["edited", "Unsaved changes"],
      ["pending", "Saving…"],
    ] as const) {
      const { unmount } = render(<FieldSyncIndicator state={state} />);
      expect(announced()).toHaveTextContent(text);
      unmount();
    }
  });

  it("shows the failure's own message rather than the generic label", () => {
    render(<FieldSyncIndicator state="error" error={new Error("row is locked")} />);
    expect(announced()).toHaveTextContent("row is locked");
    expect(announced()).not.toHaveTextContent("Could not save");
  });

  it("falls back to the generic label when the failure carries no message", () => {
    render(<FieldSyncIndicator state="error" error={new Error("   ")} />);
    expect(announced()).toHaveTextContent("Could not save");
  });

  it("announces politely, except an error which interrupts", () => {
    const { rerender } = render(<FieldSyncIndicator state="pending" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");

    rerender(<FieldSyncIndicator state="error" error={new Error("boom")} />);
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
  });

  it("offers retry only in the error state, and only when handed a handler", () => {
    const onRetry = vi.fn();
    const { rerender } = render(<FieldSyncIndicator state="edited" onRetry={onRetry} />);
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();

    rerender(<FieldSyncIndicator state="error" error={new Error("boom")} onRetry={onRetry} />);
    screen.getByRole("button", { name: "Retry" }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("takes translated labels", () => {
    render(<FieldSyncIndicator state="synced" labels={{ synced: "Gespeichert" }} />);
    expect(announced()).toHaveTextContent("Gespeichert");
  });

  it("keeps the state text in the DOM even when it is only a tooltip visually", () => {
    // The live region has to have something to announce. If the text existed only in
    // the Tooltip bubble, a state change would be silent to a screen reader.
    render(<FieldSyncIndicator state="pending" showLabel={false} />);
    const srOnly = announced().querySelector(".sr-only");
    expect(srOnly).not.toBeNull();
    expect(srOnly).toHaveTextContent("Saving…");
  });
});

describe("FieldSyncRow", () => {
  /** A hand-built sync result, so each state can be rendered without driving saves. */
  function fake(state: FieldSyncState, error: Error | null = null): UseFieldSyncReturn<string> {
    return {
      value: "x",
      setValue: () => {},
      state,
      error,
      dirty: state !== "synced",
      save: vi.fn(),
      retry: vi.fn(),
      reset: () => {},
    };
  }
  const field = (sync: UseFieldSyncReturn<string>) => (
    <FieldSyncRow sync={sync}>
      <input aria-label="Name" defaultValue="x" />
    </FieldSyncRow>
  );

  it("colours the frame and puts an icon at the END of the field, not a line under it", () => {
    for (const state of ["edited", "pending", "error"] as const) {
      const { container, unmount } = render(field(fake(state, state === "error" ? new Error("no") : null)));
      const wrapper = container.firstElementChild!;
      for (const cls of FIELD_SYNC_FRAME[state].split(" ")) expect(wrapper.classList).toContain(cls);
      // The icon sits inside the field's box, pinned to its end edge.
      expect(container.querySelector(".absolute.end-0 svg")).not.toBeNull();
      // Nothing is laid out under the field: the only other child is the sr-only region.
      expect(container.querySelectorAll("p")).toHaveLength(0);
      unmount();
    }
  });

  it("reserves the icon's room on the input in every state, so text never reflows", () => {
    const { container } = render(field(fake("synced")));
    expect(container.firstElementChild!.className).toContain("[&_:is(input,select,textarea)]:pe-9");
  });

  it("shows the error on hover of the mark, and retries on click", () => {
    const sync = fake("error", new Error("Name already taken"));
    render(field(sync));
    // Announced assertively…
    expect(screen.getByRole("alert")).toHaveTextContent("Name already taken");
    // …and the mark is a real button that retries.
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(sync.retry).toHaveBeenCalledTimes(1);
  });

  it("saves when focus leaves the field, not while typing", () => {
    const sync = fake("edited");
    render(field(sync));
    const input = screen.getByLabelText("Name");
    input.focus();
    fireEvent.change(input, { target: { value: "xy" } });
    expect(sync.save).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(sync.save).toHaveBeenCalledTimes(1);
  });

  it("shows the green saved state briefly after a save lands, then an ordinary field", () => {
    vi.useFakeTimers();
    try {
      const { container, rerender } = render(field(fake("pending")));
      rerender(field(fake("synced")));
      const wrapper = container.firstElementChild!;
      expect(wrapper.className).toContain("border-[var(--status-synced)]");
      expect(screen.getByRole("status")).toHaveTextContent("Saved");
      act(() => {
        vi.advanceTimersByTime(FIELD_SYNC_SAVED_MS + 10);
      });
      expect(wrapper.className).not.toContain("border-[var(--status-synced)]");
    } finally {
      vi.useRealTimers();
    }
  });

  it("a field that STARTS synced shows no saved state at all", () => {
    const { container } = render(field(fake("synced")));
    expect(container.firstElementChild!.className).not.toContain("border-[var(--status-synced)]");
  });
});
