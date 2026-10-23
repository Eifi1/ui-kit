import { fireEvent, render, screen, within } from "@testing-library/react";
import { Pencil, Trash2 } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ROW_ACTIONS_LABELS, RowActions } from "../../components/row-actions";
import { DEFAULT_USER_ROSTER_LABELS } from "../../admin/user-roster-labels";
import { rowMenuAction } from "../react";

/** `@eifi1/ui-kit/testing/react` (0.50): keksdose's test/row-menu.ts, in the kit. */

const actions = (onDelete = () => {}) => [
  { label: "Edit", icon: Pencil, onSelect: () => {} },
  { label: "Delete", icon: Trash2, tone: "danger" as const, onSelect: onDelete },
];

describe("rowMenuAction", () => {
  it("opens the named row's ⋯ and returns the entry, unclicked", async () => {
    const onDelete = vi.fn();
    render(
      <>
        <RowActions actions={actions()} name="Grace Hopper" />
        <RowActions actions={actions(onDelete)} name="Ada Example" />
      </>,
    );
    const entry = await rowMenuAction("Ada Example", "Delete");
    expect(entry.tagName).toBe("BUTTON");
    // The menu it came from is that row's dialog, not a menu of menuitems.
    expect(within(screen.getByRole("dialog", { name: "Actions for Ada Example" })).getByRole("button", { name: "Delete" })).toBe(entry);
    expect(screen.queryByRole("menuitem")).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(entry);
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" }));
    await vi.waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  });

  it("takes the first ⋯ without a row, named or not", async () => {
    const { unmount } = render(<RowActions actions={actions()} name="Ada Example" />);
    expect(await rowMenuAction(undefined, /delete/i)).toHaveTextContent("Delete");
    unmount();
    render(<RowActions actions={actions()} />);
    expect(await rowMenuAction(undefined, "Delete")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Actions" })).toBeInTheDocument();
  });

  it("reads translated labels, the name before or after the words", async () => {
    const zh = { actions: "操作", actionsFor: (name: string) => `${name} 的操作` };
    render(<RowActions actions={actions()} name="Ada" labels={zh} />);
    expect(await rowMenuAction("Ada", "Delete", zh)).toBeInTheDocument();
  });

  it("finds an unnamed translated row from the name pattern alone", async () => {
    const zh = { actions: "操作", actionsFor: (name: string) => `${name} 的操作` };
    render(<RowActions actions={actions()} name="Ada" labels={zh} />);
    expect(await rowMenuAction(undefined, "Delete", zh)).toBeInTheDocument();
  });

  it("knows the kit's English defaults, the row's and the roster's", () => {
    expect(DEFAULT_ROW_ACTIONS_LABELS.actions).toBe("Actions");
    expect(DEFAULT_ROW_ACTIONS_LABELS.actionsFor("X")).toBe("Actions for X");
    expect(DEFAULT_USER_ROSTER_LABELS.actionsFor("X")).toBe("Actions for X");
  });
});
