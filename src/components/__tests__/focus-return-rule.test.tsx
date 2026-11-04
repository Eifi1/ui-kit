import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Trash2 } from "lucide-react";

import { AlertBanner } from "../alert-banner";
import { DatePicker } from "../date-picker";
import { EntityCombobox } from "../entity-combobox";
import { FloatingPanel } from "../floating-panel";
import { Modal } from "../modal";
import { Popover } from "../popover";
import { RowActions } from "../row-actions";
import { TourProvider, useTour } from "../../tour/tour";
import { stubPhone } from "../../test/viewport";

/**
 * The kit's one focus-restore rule, lib/focus-left `returnFocus` (0.52 code review
 * 2026-10-31, held to 0.55), one case per kind of overlay: the opener gets the focus back
 * if it still can, else the overlay's stated fallback — for the trap, the stops that
 * stood around the opener — never <body>; a focus the user or the app has put somewhere
 * real is left there. Each "removed while open" case left the focus on <body> before.
 */

/** A focused press: jsdom's `click` focuses nothing, and every browser but Safari does. */
function press(el: HTMLElement) {
  act(() => el.focus());
  fireEvent.click(el);
}

/** A history entry pushed by an overlay unwinds a task after its cleanup. */
async function settle() {
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

const button = (name: string) => screen.getByRole("button", { name });

beforeEach(() => window.history.replaceState(null, ""));
afterEach(async () => {
  vi.unstubAllGlobals();
  await settle();
});

/** The opener and a stop on each side; `gone` takes the opener (and what it opens) away. */
function Around({ gone, children }: { gone: boolean; children: ReactNode }) {
  return (
    <>
      <button type="button">Before</button>
      {!gone && children}
      <button type="button">After</button>
    </>
  );
}

describe("a dialog (Modal)", () => {
  function Page({ appFocus = false }: { appFocus?: boolean }) {
    const [open, setOpen] = useState(false);
    const [gone, setGone] = useState(false);
    const elsewhere = useRef<HTMLInputElement>(null);
    return (
      <>
        <input aria-label="Elsewhere" ref={elsewhere} />
        <Around gone={gone}>
          <button type="button" onClick={() => setOpen(true)}>
            Edit row
          </button>
        </Around>
        {open && (
          <Modal onClose={() => setOpen(false)} aria-label="Edit">
            <button
              type="button"
              onClick={() => {
                setGone(true);
                setOpen(false);
              }}
            >
              Delete row
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                if (appFocus) elsewhere.current?.focus();
              }}
            >
              Save
            </button>
          </Modal>
        )}
      </>
    );
  }

  it("gives the focus to the stop after an opener deleted from inside it", () => {
    render(<Page />);
    press(button("Edit row"));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete row" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(button("After")).toHaveFocus();
  });

  it("keeps a focus the app placed as it closed, rather than taking it to the opener", () => {
    render(<Page appFocus />);
    press(button("Edit row"));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }));
    expect(screen.getByRole("textbox", { name: "Elsewhere" })).toHaveFocus();
  });
});

describe("a popover", () => {
  function Page() {
    const [gone, setGone] = useState(false);
    return (
      <Around gone={gone}>
        <Popover
          trigger={({ toggle, ref }) => (
            <button type="button" ref={ref} onClick={toggle}>
              Filter
            </button>
          )}
        >
          {() => (
            <button type="button" onClick={() => setGone(true)}>
              Remove the column
            </button>
          )}
        </Popover>
      </Around>
    );
  }

  it("gives Escape's focus to the trigger even when the open took none (Safari)", async () => {
    render(<Page />);
    // Safari's click focuses no button: what had the focus as it opened was <body>.
    fireEvent.click(button("Filter"));
    const panel = await screen.findByRole("dialog");
    fireEvent.keyDown(panel, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(button("Filter")).toHaveFocus();
  });

  it("gives the focus to the stop after a trigger removed from inside it", async () => {
    render(<Page />);
    press(button("Filter"));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Remove the column" }));
    expect(screen.queryByRole("button", { name: "Filter" })).toBeNull();
    expect(button("After")).toHaveFocus();
  });
});

describe("a menu (RowActions' ⋯)", () => {
  function Rows() {
    const [rows, setRows] = useState(["Household", "Car"]);
    return (
      <ul>
        {rows.map((name) => (
          <li key={name}>
            {name}
            <RowActions
              name={name}
              collapse="menu"
              actions={[
                {
                  label: "Delete",
                  icon: Trash2,
                  tone: "danger",
                  confirm: false,
                  onSelect: () => setRows((all) => all.filter((r) => r !== name)),
                },
              ]}
            />
          </li>
        ))}
      </ul>
    );
  }

  it("gives the focus to the next row's ⋯ when the row it was opened from is deleted", async () => {
    render(<Rows />);
    press(button("Actions for Household"));
    const menu = await screen.findByRole("dialog", { name: "Actions for Household" });
    fireEvent.click(within(menu).getByRole("button", { name: "Delete" }));
    expect(screen.queryByText("Household")).toBeNull();
    expect(button("Actions for Car")).toHaveFocus();
  });
});

describe("a phone's sheet", () => {
  beforeEach(() => {
    stubPhone();
  });

  it("a date field's sheet gives the focus to the stop after a field removed while it is open", () => {
    function Page({ gone }: { gone: boolean }) {
      return (
        <Around gone={gone}>
          <DatePicker label="Due" value="" onChange={() => {}} />
        </Around>
      );
    }
    const { rerender } = render(<Page gone={false} />);
    press(screen.getByRole("combobox", { name: /Due/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    rerender(<Page gone />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(button("After")).toHaveFocus();
  });

  it("a picker's sheet gives the X's focus to the trigger, and leaves a focus the page took", () => {
    render(
      <>
        <input aria-label="Elsewhere" />
        <EntityCombobox<string>
          label="Shop"
          value={null}
          onChange={() => {}}
          options={[{ value: "a", label: "Alpha" }]}
        />
      </>,
    );
    const trigger = screen.getByRole("combobox", { name: /Shop/ });
    fireEvent.click(trigger);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
    expect(trigger).toHaveFocus();
  });
});

describe("a floating panel", () => {
  function Page() {
    const [open, setOpen] = useState(false);
    const notice = useRef<HTMLButtonElement>(null);
    return (
      <>
        <button type="button" ref={notice}>
          Sent — view it
        </button>
        <FloatingPanel
          title="Feedback"
          fabLabel="Send feedback"
          fabIcon={<Trash2 />}
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            // The app answers the close by putting the reader on what it made.
            if (!next) notice.current?.focus();
          }}
        >
          <p>Body</p>
        </FloatingPanel>
      </>
    );
  }

  it("keeps a focus the app placed in onOpenChange, and gives Escape's back to the FAB", () => {
    const { unmount } = render(<Page />);
    press(button("Send feedback"));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
    expect(button("Sent — view it")).toHaveFocus();
    unmount();

    render(
      <FloatingPanel title="Feedback" fabLabel="Send feedback" fabIcon={<Trash2 />}>
        <p>Body</p>
      </FloatingPanel>,
    );
    press(button("Send feedback"));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(button("Send feedback")).toHaveFocus();
  });
});

describe("the tour", () => {
  beforeAll(async () => {
    await import("../../tour/tour-overlay");
  });

  function Launcher() {
    const { start } = useTour();
    return (
      <button type="button" onClick={() => start([{ title: "Welcome", body: "This is the register." }])}>
        Take the tour
      </button>
    );
  }
  function Page({ gone }: { gone: boolean }) {
    return (
      <TourProvider>
        <Around gone={gone}>
          <Launcher />
        </Around>
      </TourProvider>
    );
  }

  it("gives the focus to the stop after a launcher that left while it was up", async () => {
    const { rerender } = render(<Page gone={false} />);
    press(button("Take the tour"));
    await screen.findByRole("dialog");
    await act(async () => {
      await Promise.resolve();
    });
    rerender(<Page gone />);
    fireEvent.click(button("Skip"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(button("After")).toHaveFocus();
  });
});

describe("AlertBanner's ×", () => {
  it("passes over a dismissFocusRef that cannot take the focus, to the stop after the banner", () => {
    function Page() {
      const [shown, setShown] = useState(true);
      const locked = useRef<HTMLButtonElement>(null);
      return (
        <>
          <button type="button" ref={locked} disabled>
            Locked
          </button>
          {shown && (
            <AlertBanner tone="info" onDismiss={() => setShown(false)} dismissFocusRef={locked}>
              Beta build
            </AlertBanner>
          )}
          <button type="button">After</button>
        </>
      );
    }
    render(<Page />);
    press(button("Dismiss"));
    expect(button("After")).toHaveFocus();
  });
});
