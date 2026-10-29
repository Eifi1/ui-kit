import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Pencil, Trash2 } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { RowActions } from "../row-actions";
import { ConfirmProvider } from "../confirm-dialog";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";

/** 0.49 KIT-12: a delete is not an icon in every row, and it asks first. */

function row(onDelete: () => void, extra: Record<string, unknown> = {}) {
  return [
    { label: "Edit", icon: Pencil, onSelect: () => {} },
    { label: "Delete", icon: Trash2, tone: "danger" as const, onSelect: onDelete, ...extra },
  ];
}

const openMenu = () => fireEvent.click(screen.getByRole("button", { name: "Actions for Ada Example" }));

describe("RowActions danger actions (KIT-12)", () => {
  it("keeps the other actions inline and puts the danger one into the ⋯ menu", () => {
    render(<RowActions actions={row(() => {})} name="Ada Example" />);
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    openMenu();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it('dangerPlacement="inline" keeps it an icon', () => {
    render(<RowActions actions={row(() => {})} name="Ada Example" dangerPlacement="inline" />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("opens a confirmation first; Cancel runs nothing, the danger button runs it", async () => {
    const onDelete = vi.fn();
    render(<RowActions actions={row(onDelete)} name="Ada Example" />);
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Delete “Ada Example”?" });
    expect(dialog).toHaveTextContent("This cannot be undone.");
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(onDelete).not.toHaveBeenCalled();

    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const again = await screen.findByRole("alertdialog");
    fireEvent.click(within(again).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  });

  it("uses the app's ConfirmProvider when there is one", async () => {
    const onDelete = vi.fn();
    render(
      <ConfirmProvider>
        <RowActions actions={row(onDelete)} name="Ada Example" />
      </ConfirmProvider>,
    );
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findAllByRole("alertdialog")).toHaveLength(1);
  });

  it("confirm={false} runs it at once; custom words replace the defaults", async () => {
    const onDelete = vi.fn();
    const { unmount } = render(<RowActions actions={row(onDelete, { confirm: false })} name="Ada Example" />);
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    unmount();

    render(
      <RowActions
        actions={row(() => {}, {
          confirm: { title: "Remove Ada?", body: "Her bookings stay.", confirmLabel: "Remove" },
        })}
        name="Ada Example"
      />,
    );
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Remove Ada?" });
    expect(dialog).toHaveTextContent("Her bookings stay.");
    expect(within(dialog).getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("an action of another tone runs at once", () => {
    const onEdit = vi.fn();
    render(<RowActions actions={[{ label: "Edit", icon: Pencil, onSelect: onEdit }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("asks in the provider's language", async () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <RowActions actions={[{ label: "Löschen", icon: Trash2, tone: "danger", onSelect: () => {} }]} name="Ada" />
      </UiKitProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Aktionen für Ada" }));
    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Löschen: «Ada»?" });
    expect(dialog).toHaveTextContent("Das lässt sich nicht rückgängig machen.");
  });
});
