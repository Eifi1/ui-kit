import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { Autocomplete, type AutocompleteProps } from "../autocomplete";
import type { ComboOption } from "../combobox-core";

/**
 * The inline async field — kastlan's address autocomplete and keksdose's address
 * search on one control.
 *
 * Driven with `fireEvent` under fake timers rather than `user-event`: the debounce
 * is the thing under test, and advancing it by hand is what makes "no request yet"
 * and "one request now" exact rather than a race against real time.
 */
const ADDRESSES: ComboOption<string>[] = [
  { value: "1", label: "Bahnhofstrasse 1, 8001 Zürich" },
  { value: "2", label: "Bahnhofstrasse 12, 8001 Zürich" },
  { value: "3", label: "Rue de Lausanne 12, 1201 Genève" },
];

function Harness(props: Partial<AutocompleteProps<string>> & { initial?: string }) {
  const { initial = "", onChange, ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <Autocomplete<string>
      label="Address"
      {...rest}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

const field = () => screen.getByRole("combobox", { name: "Address" });
const status = () => screen.getByRole("status");

/** Let the debounce elapse and the lookup's promise settle, inside act. */
async function settle(ms = 300) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

describe("Autocomplete", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks nothing on focus, nor below minChars, and debounces the rest", async () => {
    const load = vi.fn(async (q: string) => ADDRESSES.filter((a) => a.label.includes(q)));
    render(<Harness loadOptions={load} minChars={3} />);

    fireEvent.focus(field());
    await settle(1000);
    expect(load).not.toHaveBeenCalled();
    expect(field()).toHaveAttribute("aria-expanded", "false");

    fireEvent.change(field(), { target: { value: "Ba" } });
    await settle(1000);
    expect(load).not.toHaveBeenCalled();

    fireEvent.change(field(), { target: { value: "Bah" } });
    fireEvent.change(field(), { target: { value: "Bahn" } });
    await settle(299);
    expect(load).not.toHaveBeenCalled();
    await settle(1);
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith("Bahn");

    expect(field()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(status()).toHaveTextContent("2 results");
  });

  it("wires the APG combobox: aria-controls, aria-activedescendant, Enter takes the row", async () => {
    const onSelect = vi.fn();
    render(<Harness loadOptions={async () => ADDRESSES} onSelect={onSelect} />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "Bahn" } });
    await settle();

    const listbox = screen.getByRole("listbox");
    expect(field()).toHaveAttribute("aria-controls", listbox.id);
    expect(field()).not.toHaveAttribute("aria-activedescendant");

    fireEvent.keyDown(field(), { key: "ArrowDown" });
    fireEvent.keyDown(field(), { key: "ArrowDown" });
    const activeId = field().getAttribute("aria-activedescendant");
    expect(document.getElementById(activeId!)).toHaveTextContent("Bahnhofstrasse 12");

    fireEvent.keyDown(field(), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(ADDRESSES[1]);
    // Free text by default: the taken label is now the field's value.
    expect(field()).toHaveValue("Bahnhofstrasse 12, 8001 Zürich");
    expect(field()).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps the typed text when a row is an action (fillOnSelect={false})", async () => {
    const onSelect = vi.fn();
    render(
      <Harness
        options={ADDRESSES}
        filter={false}
        onSelect={onSelect}
        fillOnSelect={false}
      />,
    );
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "zzz" } });
    // `filter={false}`: a server-ranked list is shown as given, even when no label
    // contains the text.
    expect(screen.getAllByRole("option")).toHaveLength(3);
    fireEvent.click(screen.getAllByRole("option")[2]);
    expect(onSelect).toHaveBeenCalledWith(ADDRESSES[2]);
    expect(field()).toHaveValue("zzz");
  });

  it("filters static options client-side by default", () => {
    render(<Harness options={ADDRESSES} />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "genève" } });
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Rue de Lausanne 12, 1201 Genève",
    ]);
  });

  it("says a lookup failed, and drops the previous rows with it", async () => {
    let fail = false;
    const load = vi.fn(async () => {
      if (fail) throw new Error("503");
      return ADDRESSES;
    });
    render(<Harness loadOptions={load} />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "Bahn" } });
    await settle();
    expect(screen.getAllByRole("option")).toHaveLength(3);

    fail = true;
    fireEvent.change(field(), { target: { value: "Bahnh" } });
    await settle();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(status()).toHaveTextContent("Couldn’t load results");
    // The text is the user's, and a failure does not touch it.
    expect(field()).toHaveValue("Bahnh");
  });

  it("ignores a slow response to a superseded query", async () => {
    const resolvers: Array<(r: ComboOption<string>[]) => void> = [];
    const load = vi.fn(
      () => new Promise<ComboOption<string>[]>((resolve) => resolvers.push(resolve)),
    );
    render(<Harness loadOptions={load} />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "Rue" } });
    await settle();
    fireEvent.change(field(), { target: { value: "Bahn" } });
    await settle();
    expect(load).toHaveBeenCalledTimes(2);
    expect(status()).toHaveTextContent("Loading…");

    await act(async () => resolvers[1]([ADDRESSES[0]]));
    await act(async () => resolvers[0]([ADDRESSES[2]]));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Bahnhofstrasse 1, 8001 Zürich",
    ]);
  });

  it("looks a seeded query up on focus, and never resets it", async () => {
    const load = vi.fn(async () => ADDRESSES);
    render(<Harness loadOptions={load} initial="8001 Zürich" />);
    expect(load).not.toHaveBeenCalled();
    fireEvent.focus(field());
    await settle();
    expect(load).toHaveBeenCalledWith("8001 Zürich");
    fireEvent.keyDown(field(), { key: "Escape" });
    expect(field()).toHaveAttribute("aria-expanded", "false");
    fireEvent.blur(field());
    fireEvent.focus(field());
    expect(field()).toHaveValue("8001 Zürich");
  });

  it("says 'No results' for an answered empty query, and the caller's status over it", async () => {
    const { rerender } = render(<Harness loadOptions={async () => []} />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "xyz" } });
    await settle();
    expect(status()).toHaveTextContent("No results");

    rerender(<Harness loadOptions={async () => []} status="You are offline" />);
    expect(status()).toHaveTextContent("You are offline");
  });

  it("Escape closes the list and stops there; with no list it reaches the page", async () => {
    const outer = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div onKeyDown={(e) => e.key === "Escape" && outer()}>
        <Harness options={ADDRESSES} />
      </div>,
    );
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "Bahn" } });
    fireEvent.keyDown(field(), { key: "Escape" });
    expect(outer).not.toHaveBeenCalled();
    fireEvent.keyDown(field(), { key: "Escape" });
    expect(outer).toHaveBeenCalledTimes(1);
  });

  it("carries error, invalid, disabled and the ref like Input", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(
      <Autocomplete
        ref={ref}
        label="Address"
        value=""
        onChange={() => {}}
        aria-describedby="hint"
        error="Street is required"
        disabled
      />,
    );
    expect(ref.current).toBe(field());
    expect(field()).toBeDisabled();
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(field()).toHaveAccessibleDescription(/Street is required/);
    expect(field().getAttribute("aria-describedby")).toMatch(/^hint /);
  });
});
