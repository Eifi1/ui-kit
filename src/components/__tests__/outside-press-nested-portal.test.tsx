import { useRef, useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Popover } from "../popover";
import { CurrencySelect } from "../currency-select";
import { DropdownPanel, useDropdown } from "../dropdown";
import { HoverMenu } from "../hover-menu";

/**
 * keksdose dev#623 (0.48 R12): a CurrencySelect inside a Popover. The currency list is
 * portalled to <body>, so in the DOM it is outside the popover's panel, and the popover's
 * outside-press handler closed the popover at pointerdown — the list went with it and the
 * choice never landed. A press inside a panel opened FROM INSIDE an owner (at any depth)
 * is a press inside that owner: kit panels pass every press on through the React tree,
 * which is where the portal still sits inside its opener.
 */

function opener(name: string) {
  return ({ toggle, ref }: { toggle: () => void; ref: React.Ref<HTMLButtonElement> }) => (
    <button type="button" ref={ref} onClick={toggle}>
      {name}
    </button>
  );
}

function Currency() {
  const [code, setCode] = useState("CHF");
  return <CurrencySelect label="Currency" value={code} options={["EUR", "CHF", "USD"]} onChange={setCode} />;
}

describe("an outside press ignores panels opened from inside (R12)", () => {
  it("choosing in a CurrencySelect inside a Popover keeps the popover open and applies the choice", async () => {
    const user = userEvent.setup();
    render(
      <>
        <p>page</p>
        <Popover aria-label="Edit" trigger={opener("Open")}>
          {() => <Currency />}
        </Popover>
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    const panel = screen.getByRole("dialog", { name: "Edit" });
    await user.click(within(panel).getByRole("combobox", { name: /Currency/ }));
    const list = screen.getByRole("listbox");
    expect(panel.contains(list)).toBe(false); // portalled — the case under test
    await user.click(within(list).getByRole("option", { name: /USD/ }));
    expect(screen.getByRole("dialog", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Currency: USD" })).toBeInTheDocument();
    // A real outside press still closes it.
    await user.click(screen.getByText("page"));
    expect(screen.queryByRole("dialog", { name: "Edit" })).toBeNull();
  });

  it("holds at depth 2: Popover > Popover > CurrencySelect", async () => {
    const user = userEvent.setup();
    render(
      <Popover aria-label="Outer" trigger={opener("Outer")}>
        {() => (
          <Popover aria-label="Inner" trigger={opener("Inner")}>
            {() => <Currency />}
          </Popover>
        )}
      </Popover>,
    );
    await user.click(screen.getByRole("button", { name: "Outer" }));
    await user.click(screen.getByRole("button", { name: "Inner" }));
    await user.click(screen.getByRole("combobox", { name: /Currency/ }));
    await user.click(within(screen.getByRole("listbox")).getByRole("option", { name: /EUR/ }));
    expect(screen.getByRole("dialog", { name: "Outer" })).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Inner" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Currency: EUR" })).toBeInTheDocument();
    // A press in the inner popover is inside the outer one too.
    await user.click(screen.getByRole("dialog", { name: "Inner" }));
    expect(screen.getByRole("dialog", { name: "Outer" })).toBeInTheDocument();
  });

  it("a portalled DropdownPanel keeps a Popover opened inside it", async () => {
    function Host() {
      const { open, setOpen, wrapperRef, panelRef } = useDropdown();
      const triggerRef = useRef<HTMLButtonElement>(null);
      return (
        <div ref={wrapperRef}>
          <button type="button" ref={triggerRef} onClick={() => setOpen((v) => !v)}>
            List
          </button>
          {open && (
            <DropdownPanel anchorRef={triggerRef} panelRef={panelRef} aria-label="List panel">
              <li>
                <Popover aria-label="Details" trigger={opener("Details")}>
                  {() => <button type="button">Inside details</button>}
                </Popover>
              </li>
            </DropdownPanel>
          )}
        </div>
      );
    }
    const user = userEvent.setup();
    render(<Host />);
    await user.click(screen.getByRole("button", { name: "List" }));
    await user.click(screen.getByRole("button", { name: "Details" }));
    await user.click(screen.getByRole("button", { name: "Inside details" }));
    expect(screen.getByRole("dialog", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
  });

  it("a HoverMenu stays open for a press in a popover opened from a row", async () => {
    const user = userEvent.setup();
    render(
      <HoverMenu
        aria-label="Account"
        trigger={({ toggle }) => (
          <button type="button" onClick={toggle}>
            Me
          </button>
        )}
      >
        {() => (
          <Popover aria-label="Pick" trigger={opener("Currency settings")}>
            {() => <Currency />}
          </Popover>
        )}
      </HoverMenu>,
    );
    await user.click(screen.getByRole("button", { name: "Me" }));
    await user.click(screen.getByRole("menuitem", { name: "Currency settings" }));
    await user.click(screen.getByRole("combobox", { name: /Currency/ }));
    await user.click(within(screen.getByRole("listbox")).getByRole("option", { name: /USD/ }));
    expect(screen.getByRole("menu", { name: "Account" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Currency: USD" })).toBeInTheDocument();
  });
});
