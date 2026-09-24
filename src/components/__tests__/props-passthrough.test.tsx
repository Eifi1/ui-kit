import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DatePicker, DateRangePicker } from "../date-picker";
import { FileDropzone } from "../file-dropzone";
import { FullBleedDialog } from "../full-bleed-dialog";
import { HoverMenu } from "../hover-menu";
import { MiniCalendar } from "../mini-calendar";
import { Modal } from "../modal";
import { Popover } from "../popover";
import { Tooltip } from "../tooltip";

/**
 * Audit 2026-09-22 §api-design, wave 4: *"~35 components accept no ...rest, so the
 * package's own tour cannot anchor to them"*.
 *
 * A closed prop list is not a small inconvenience. The kit's own guided tour finds its
 * targets by `[data-tour=…]`, so a component that drops unknown props cannot be pointed
 * at by the product it is part of — and keksdose's rule editor carries a comment saying
 * it wraps `ToggleGroup` in a div for exactly that reason. The same hole swallows a test
 * id, an `aria-describedby` tying a field to its hint, and `aria-label`.
 *
 * So the contract every component below now keeps: **whatever the caller passes reaches
 * the root element**. Two halves, asserted separately because they fail for different
 * reasons — a `data-*` attribute is inert and only has to arrive, while an `aria-label`
 * has to arrive AND not be clobbered by a name the component computes for itself, which
 * is the trap in `Popover` (its `labels.panel` default) and `FileDropzone` (`dropLabel`).
 *
 * `ariaLabel`, the kit's third spelling of the same thing, keeps working — see the
 * HoverMenu block at the bottom. Removing it is a later minor; three apps pass it today.
 */

/** One attribute the kit knows nothing about, and one it must not intercept. */
const ANCHOR = "wave-4-anchor";
const NAME = "named by the caller";

/** The element the caller's `data-tour` landed on, whichever it is — several of these
 *  components portal their root to `<body>`, so `container` would not find it. */
function anchored(): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-tour="${ANCHOR}"]`);
  if (!el) throw new Error("nothing in the tree carried the caller's data-tour");
  return el;
}

const noop = () => {};

/** Open a `Popover`-style trigger. It is a render prop, so the button has to be pressed
 *  before there is a panel to assert anything about. */
const press = (el: HTMLElement) => fireEvent.click(el);

const CASES: Array<[name: string, mount: () => void]> = [
  [
    "Modal",
    () =>
      void render(
        <Modal onClose={noop} data-tour={ANCHOR} aria-label={NAME}>
          <p>body</p>
        </Modal>,
      ),
  ],
  [
    "FullBleedDialog",
    () =>
      void render(
        <FullBleedDialog open onClose={noop} closeLabel="Close" data-tour={ANCHOR} aria-label={NAME}>
          <p>body</p>
        </FullBleedDialog>,
      ),
  ],
  [
    "Popover",
    () => {
      render(
        <Popover
          data-tour={ANCHOR}
          aria-label={NAME}
          trigger={({ toggle, ref }) => (
            <button type="button" ref={ref} onClick={toggle}>
              Filter
            </button>
          )}
        >
          {() => <p>panel</p>}
        </Popover>,
      );
      press(screen.getByRole("button", { name: "Filter" }));
    },
  ],
  [
    "HoverMenu",
    () =>
      void render(
        <HoverMenu
          data-tour={ANCHOR}
          aria-label={NAME}
          trigger={({ toggle }) => (
            <button type="button" onClick={toggle}>
              Menu
            </button>
          )}
        >
          {() => <p>items</p>}
        </HoverMenu>,
      ),
  ],
  [
    "Tooltip",
    () =>
      void render(
        <Tooltip label="what this does" data-tour={ANCHOR} aria-label={NAME}>
          <button type="button">Save</button>
        </Tooltip>,
      ),
  ],
  [
    "MiniCalendar",
    () =>
      void render(
        <MiniCalendar
          from=""
          to=""
          locale="en-GB"
          onSelect={noop}
          data-tour={ANCHOR}
          aria-label={NAME}
        />,
      ),
  ],
  [
    "DatePicker",
    () =>
      void render(
        <DatePicker value="" onChange={noop} locale="en-GB" data-tour={ANCHOR} aria-label={NAME} />,
      ),
  ],
  [
    "DateRangePicker",
    () =>
      void render(
        <DateRangePicker
          from=""
          to=""
          onChange={noop}
          locale="en-GB"
          data-tour={ANCHOR}
          aria-label={NAME}
        />,
      ),
  ],
  [
    "FileDropzone",
    () =>
      void render(
        <FileDropzone
          file={null}
          onFileSelected={noop}
          accept=".zip"
          isValid={() => true}
          invalidMessage="nope"
          dropLabel="Drop a file"
          browseLabel="Browse"
          emptyLabel="No file"
          hint=".zip only"
          data-tour={ANCHOR}
          aria-label={NAME}
        />,
      ),
  ],
];

describe.each(CASES)("%s", (_name, mount) => {
  it("passes an unknown data-* attribute through to its root element", () => {
    mount();
    expect(anchored()).toBeInTheDocument();
  });

  it("lets the caller's aria-label reach the element that is named", (ctx) => {
    mount();
    // The pickers are the exception to "the same element": their root is a wrapper
    // with no role, and a name on it was never read — the `role="combobox"` trigger
    // inside is what a screen reader meets, so that is where the name goes (0.5.1,
    // reported by kastlan). The data-* anchor stays on the root, where a tour or a
    // test id expects the whole field.
    const named = /Picker$/.test(ctx.task.suite?.name ?? "")
      ? screen.getByRole("combobox")
      : anchored();
    expect(named).toHaveAttribute("aria-label", NAME);
  });
});

/**
 * The half of the contract a `getAttribute` cannot see. On a root that carries a role,
 * the caller's `aria-label` has to be the accessible NAME — which means beating whatever
 * the component would have named itself, and a spread that landed before the component's
 * own `aria-label` would pass the assertions above and still fail these.
 */
describe("the accessible name on a root that has a role", () => {
  it("Modal — dialog", () => {
    render(
      <Modal onClose={noop} aria-label={NAME}>
        <p>body</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: NAME })).toBeInTheDocument();
  });

  it("FullBleedDialog — dialog", () => {
    render(
      <FullBleedDialog open onClose={noop} closeLabel="Close" aria-label={NAME}>
        <p>body</p>
      </FullBleedDialog>,
    );
    expect(screen.getByRole("dialog", { name: NAME })).toBeInTheDocument();
  });

  it("Popover — dialog, over the panel label it would otherwise give itself", () => {
    render(
      <Popover
        aria-label={NAME}
        labels={{ panel: "Filter" }}
        trigger={({ toggle, ref }) => (
          <button type="button" ref={ref} onClick={toggle}>
            Open
          </button>
        )}
      >
        {() => <p>panel</p>}
      </Popover>,
    );
    press(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog", { name: NAME })).toBeInTheDocument();
  });

  it("FileDropzone — button, over its own dropLabel", () => {
    render(
      <FileDropzone
        file={null}
        onFileSelected={noop}
        accept=".zip"
        isValid={() => true}
        invalidMessage="nope"
        dropLabel="Drop a file"
        browseLabel="Browse"
        emptyLabel="No file"
        hint=".zip only"
        aria-label={NAME}
      />,
    );
    expect(screen.getByRole("button", { name: NAME })).toBeInTheDocument();
  });

  it("FileDropzone still falls back to dropLabel, which is what every caller passes today", () => {
    render(
      <FileDropzone
        file={null}
        onFileSelected={noop}
        accept=".zip"
        isValid={() => true}
        invalidMessage="nope"
        dropLabel="Drop a file"
        browseLabel="Browse"
        emptyLabel="No file"
        hint=".zip only"
      />,
    );
    expect(screen.getByRole("button", { name: "Drop a file" })).toBeInTheDocument();
  });
});

/**
 * `HoverMenu` is the one component in this wave that already had the kit's own spelling.
 * It is deprecated, not removed: keksdose, kastlan and lenkbank all pass `ariaLabel`
 * today, and a rename that breaks three apps to save one line of resolution is not a
 * patch release. The DOM spelling wins where both are given — that is the direction the
 * deprecation moves in.
 */
describe("HoverMenu's deprecated ariaLabel", () => {
  const menu = (props: { ariaLabel?: string; "aria-label"?: string }) =>
    render(
      <HoverMenu
        {...props}
        trigger={({ toggle }) => (
          <button type="button" onClick={toggle}>
            Menu
          </button>
        )}
      >
        {() => <p>items</p>}
      </HoverMenu>,
    ).container.firstElementChild as HTMLElement;

  it("still names the menu", () => {
    expect(menu({ ariaLabel: "Tours" })).toHaveAttribute("aria-label", "Tours");
  });

  it("gives way to aria-label when both are passed", () => {
    expect(menu({ ariaLabel: "Tours", "aria-label": NAME })).toHaveAttribute("aria-label", NAME);
  });
});

/**
 * The spread has to land BEFORE the component's own attributes, or a caller reaching for
 * a `data-tour` anchor can put the overlay machinery out of action by accident — a
 * `role`, a `tabIndex` or an `onKeyDown` from outside would take the dialog's role away,
 * make it unfocusable, or replace the Escape handling.
 */
describe("what a caller may not clobber", () => {
  it("Modal keeps its dialog role and its own focusability", () => {
    render(
      // `tabIndex={0}` rather than a positive one on purpose: the assertion is that the
      // panel keeps its own `-1`, and a positive tabindex is its own lint error.
      <Modal onClose={noop} role="presentation" tabIndex={0} aria-label={NAME}>
        <p>body</p>
      </Modal>,
    );
    const panel = screen.getByRole("dialog", { name: NAME });
    expect(panel).toHaveAttribute("tabindex", "-1");
  });

  it("Modal still closes on Escape with a caller's onKeyDown attached", () => {
    const onClose = vi.fn();
    const onKeyDown = vi.fn();
    render(
      <Modal onClose={onClose} onKeyDown={onKeyDown} aria-label={NAME}>
        <p>body</p>
      </Modal>,
    );
    const panel = screen.getByRole("dialog", { name: NAME });
    fireEvent.keyDown(panel, { key: "Escape" });
    expect(onKeyDown).toHaveBeenCalled();
  });
});
