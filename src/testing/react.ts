import { fireEvent, screen, within } from "@testing-library/react";

// `@eifi1/ui-kit/testing/react` (0.50) — helpers that drive the kit's components through
// Testing Library, from an app's own test suite.
//
// A sibling of `@eifi1/ui-kit/testing`, not part of it: that entry is pure (it reaches no
// package, so it runs under node or jsdom alike), and this one needs
// `@testing-library/react`, an optional peer only a test suite installs. Neither is part of
// the barrel, so an app's production bundle never carries either.

/** The words of the row's "⋯" button, when the app's tests render translated kit labels. */
export interface RowMenuLabels {
  /** The button's name on a row with no `name`. Default "Actions". */
  actions?: string;
  /** The button's name given the row's. Default `Actions for ${name}`. */
  actionsFor?: (name: string) => string;
}

// The kit's English defaults (DEFAULT_ROW_ACTIONS_LABELS, and the user roster's), written
// out rather than imported: the label module's type import would walk this entry into the
// components. src/testing/__tests__/react.test.tsx holds them equal.
const ACTIONS = "Actions";
const ACTIONS_FOR = (name: string) => `Actions for ${name}`;

/**
 * Open a row's "⋯" menu and find one of its actions — the entry, unclicked, so a test can
 * check it (locked, described) before it clicks it.
 *
 * `row` is the row's name as the app gave it to `RowActions` / `rowActionsColumn` /
 * `UserRoster` ("Actions for <row>"); `undefined` takes the FIRST "⋯" on the page, named
 * or not. Since 0.49 (KIT-12) a `tone: "danger"` action lives in that menu rather than as
 * an icon in the row, and at Large text every action does.
 *
 * The entries are BUTTONS in a dialog popover named like the "⋯" button — not `menuitem`s:
 * `getByRole("menuitem")` finds nothing there. A danger action asks for confirmation once
 * clicked (an `alertdialog`), unless the app turned that off.
 *
 * @example
 *   fireEvent.click(await rowMenuAction("Ada Example", "Delete"));
 *   fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));
 */
export async function rowMenuAction(
  row: string | undefined,
  action: string | RegExp,
  labels: RowMenuLabels = {},
): Promise<HTMLElement> {
  const actions = labels.actions ?? ACTIONS;
  const actionsFor = labels.actionsFor ?? ACTIONS_FOR;
  // Any row's name: the words around the name, whatever the language puts first.
  const [before, after] = actionsFor("\u0000").split("\u0000");
  const anyRow = (name: string) =>
    name === actions || (name.length > before.length + after.length && name.startsWith(before) && name.endsWith(after));
  const trigger = (await screen.findAllByRole("button", { name: row === undefined ? anyRow : actionsFor(row) }))[0];
  fireEvent.click(trigger);
  const title = trigger.getAttribute("aria-label") ?? trigger.textContent ?? "";
  const menu = await screen.findByRole("dialog", { name: title });
  return within(menu).getByRole("button", { name: action });
}
