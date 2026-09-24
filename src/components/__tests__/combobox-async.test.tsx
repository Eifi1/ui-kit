import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { EntityCombobox } from "../entity-combobox";
import { MultiEntityCombobox } from "../multi-entity-combobox";
import { Combobox, InlineEntityCombobox } from "../combobox";
import type { ComboOption } from "../combobox-core";

/**
 * The core fixes of 0.6.0 (Keksdose proposal §2), pinned on the trigger pickers
 * that sit on `useComboboxCore` — and the `error`/`disabled` parity lenkbank asked
 * for across the family.
 */
const OPTIONS: ComboOption<number>[] = [
  { value: 1, label: "Checking" },
  { value: 2, label: "Savings" },
  { value: 3, label: "Credit card", sublabel: "Visa" },
];

const trigger = () => screen.getByRole("combobox", { name: /Account/ });
const search = () => screen.getByRole("textbox");
const liveStatus = () => screen.getByRole("status");

async function settle(ms = 150) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

describe("useComboboxCore's async source", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("still loads on open by default (minChars 0), and announces the count", async () => {
    const load = vi.fn(async () => OPTIONS);
    render(<EntityCombobox label="Account" value={null} onChange={() => {}} loadOptions={load} />);
    fireEvent.click(trigger());
    await settle(0);
    expect(load).toHaveBeenCalledWith("");
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(liveStatus()).toHaveTextContent("3 results");
  });

  it("reports a rejected lookup instead of keeping the last rows", async () => {
    const load = vi.fn(async (q: string) => {
      if (q === "boom") throw new Error("down");
      return OPTIONS;
    });
    render(<EntityCombobox label="Account" value={null} onChange={() => {}} loadOptions={load} />);
    fireEvent.click(trigger());
    await settle(0);
    expect(screen.getAllByRole("option")).toHaveLength(3);

    fireEvent.change(search(), { target: { value: "boom" } });
    await settle();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(liveStatus()).toHaveTextContent("Couldn’t load results");
  });

  it("honours minChars and debounceMs — no request on open with an empty query", async () => {
    const load = vi.fn(async () => OPTIONS);
    render(
      <MultiEntityCombobox
        label="Account"
        value={[]}
        onChange={() => {}}
        loadOptions={load}
        minChars={2}
        debounceMs={400}
      />,
    );
    fireEvent.click(trigger());
    await settle(1000);
    expect(load).not.toHaveBeenCalled();
    expect(liveStatus()).toHaveTextContent("Type at least 2 characters");

    fireEvent.change(search(), { target: { value: "Ch" } });
    await settle(399);
    expect(load).not.toHaveBeenCalled();
    await settle(1);
    expect(load).toHaveBeenCalledWith("Ch");
  });

  it("filter={false} shows static options as given", () => {
    render(
      <EntityCombobox
        label="Account"
        value={null}
        onChange={() => {}}
        options={OPTIONS}
        filter={false}
      />,
    );
    fireEvent.click(trigger());
    fireEvent.change(search(), { target: { value: "zzz" } });
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });
});

describe("error and disabled across the family", () => {
  it("EntityCombobox and MultiEntityCombobox describe the trigger by the error", () => {
    render(
      <>
        <EntityCombobox
          label="Account"
          value={null}
          onChange={() => {}}
          options={OPTIONS}
          error="Pick an account"
        />
        <MultiEntityCombobox
          label="Accounts"
          value={[]}
          onChange={() => {}}
          options={OPTIONS}
          error="Pick one or more"
        />
      </>,
    );
    const [single, multi] = screen.getAllByRole("combobox");
    expect(single).toHaveAttribute("aria-invalid", "true");
    expect(single).toHaveAccessibleDescription("Pick an account");
    expect(multi).toHaveAccessibleDescription("Pick one or more");
  });

  it("Combobox takes error and disabled like Input", () => {
    render(
      <Combobox
        label="Customer"
        value=""
        onChange={() => {}}
        options={["ACME", "Globex"]}
        error="Required"
        disabled
      />,
    );
    const input = screen.getByRole("combobox", { name: "Customer" });
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Required");
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("a disabled Combobox's chevron does not open the list", () => {
    const { container } = render(
      <Combobox label="Customer" value="" onChange={() => {}} options={["ACME"]} disabled />,
    );
    fireEvent.mouseDown(container.querySelector("svg")!);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("InlineEntityCombobox takes error", () => {
    render(
      <InlineEntityCombobox
        label="Category"
        value={null}
        onChange={() => {}}
        options={OPTIONS}
        error="Pick a category"
      />,
    );
    expect(screen.getByRole("combobox", { name: "Category" })).toHaveAccessibleDescription(
      "Pick a category",
    );
  });
});
