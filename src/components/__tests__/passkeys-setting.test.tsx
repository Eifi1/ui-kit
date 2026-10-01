import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { PasskeysSetting } from "../passkeys-setting";
import type { PasskeyItem } from "../passkeys-setting";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE } from "../../i18n/locales/de";

const KEYS: PasskeyItem[] = [
  { id: 1, name: "Laptop", createdAt: "2026-01-05T10:00:00Z", lastUsedAt: "2026-09-01T08:00:00Z" },
  { id: 2, name: "Phone", createdAt: "2026-02-10T10:00:00Z", lastUsedAt: null },
];
const fmt = (d: Date) => d.toISOString().slice(0, 10);

describe("PasskeysSetting", () => {
  it("lists name, created and last used — or 'Never used'", () => {
    render(<PasskeysSetting passkeys={KEYS} onAdd={vi.fn()} formatDate={fmt} />);
    const list = screen.getByRole("list", { name: "Your passkeys" });
    const [laptop, phone] = within(list).getAllByRole("listitem");
    expect(laptop).toHaveTextContent("Laptop");
    expect(laptop).toHaveTextContent("Added 2026-01-05 · Last used 2026-09-01");
    expect(phone).toHaveTextContent("Added 2026-02-10 · Never used");
  });

  it("shows a loading state until the list arrives, then the empty state", () => {
    const { rerender } = render(<PasskeysSetting passkeys={undefined} onAdd={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading passkeys…");
    rerender(<PasskeysSetting passkeys={[]} onAdd={vi.fn()} />);
    expect(screen.getByText("No passkeys yet")).toBeInTheDocument();
  });

  it("replaces list and add with the app's reason when passkeys are unavailable", () => {
    render(<PasskeysSetting passkeys={[]} onAdd={vi.fn()} unavailable="Not supported here" />);
    expect(screen.getByText("Not supported here")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add passkey/ })).toBeNull();
  });

  it("calls onAdd with the trimmed name and clears the field once it resolves", async () => {
    let resolve!: () => void;
    const onAdd = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    render(<PasskeysSetting passkeys={[]} onAdd={onAdd} />);
    const field = screen.getByLabelText("Name (optional)");
    fireEvent.change(field, { target: { value: "  Work laptop " } });
    fireEvent.click(screen.getByRole("button", { name: /Add passkey/ }));
    expect(onAdd).toHaveBeenCalledWith("Work laptop");
    expect(field).toHaveValue("  Work laptop ");
    await act(async () => resolve());
    expect(field).toHaveValue("");
  });

  it("keeps the name when the ceremony is rejected (the user cancelled the OS prompt)", async () => {
    const onAdd = vi.fn(() => Promise.reject(new Error("NotAllowedError")));
    render(<PasskeysSetting passkeys={[]} onAdd={onAdd} />);
    const field = screen.getByLabelText("Name (optional)");
    fireEvent.change(field, { target: { value: "Key" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Add passkey/ })));
    expect(field).toHaveValue("Key");
  });

  it("says it is waiting while adding and does not start a second ceremony", () => {
    const onAdd = vi.fn();
    render(<PasskeysSetting passkeys={[]} onAdd={onAdd} adding />);
    const button = screen.getByRole("button", { name: /Waiting for your device/ });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("renames inline: Enter saves the trimmed name, Escape cancels", async () => {
    const onRename = vi.fn(() => Promise.resolve());
    render(<PasskeysSetting passkeys={KEYS} onAdd={vi.fn()} onRename={onRename} />);
    fireEvent.click(screen.getByRole("button", { name: "Rename Laptop" }));
    const field = screen.getByRole("textbox", { name: "New name for Laptop" });
    fireEvent.keyDown(field, { key: "Escape" });
    expect(screen.queryByRole("textbox", { name: "New name for Laptop" })).toBeNull();
    expect(onRename).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Rename Laptop" }));
    const again = screen.getByRole("textbox", { name: "New name for Laptop" });
    fireEvent.change(again, { target: { value: " Desk " } });
    await act(async () => fireEvent.keyDown(again, { key: "Enter" }));
    expect(onRename).toHaveBeenCalledWith(1, "Desk");
    expect(screen.queryByRole("textbox", { name: "New name for Laptop" })).toBeNull();
    // Focus returns to the button that opened the field.
    expect(screen.getByRole("button", { name: "Rename Laptop" })).toHaveFocus();
  });

  it("deletes only after an inline confirm, which starts on Cancel", () => {
    const onDelete = vi.fn();
    render(<PasskeysSetting passkeys={KEYS} onAdd={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete Phone" }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Delete “Phone”?");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Delete Phone" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete passkey" }));
    expect(onDelete).toHaveBeenCalledWith(2);
  });

  it("disables a busy row's actions and offers none it was not given", () => {
    render(<PasskeysSetting passkeys={KEYS} onAdd={vi.fn()} onDelete={vi.fn()} busyId={1} />);
    expect(screen.getByRole("button", { name: "Delete Laptop" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete Phone" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /Rename/ })).toBeNull();
  });

  it("speaks the provider's language", () => {
    render(
      <UiKitProvider labels={{ accountSettings: UI_KIT_LABELS_DE.accountSettings }}>
        <PasskeysSetting passkeys={[]} onAdd={vi.fn()} />
      </UiKitProvider>,
    );
    expect(screen.getByText("Noch keine Passkeys")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Passkey hinzufügen/ })).toBeInTheDocument();
  });

  it("hands callbacks the app's own id type (0.16.0)", () => {
    // Numeric ids in, numbers out — typed, so keksdose's `id as number` casts can go.
    const numeric: PasskeyItem<number>[] = [{ id: 7, name: "Laptop" }];
    const onDelete = vi.fn((id: number) => void id.toFixed());
    render(<PasskeysSetting passkeys={numeric} onAdd={vi.fn()} onDelete={onDelete} busyId={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete Laptop" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete passkey" }));
    expect(onDelete).toHaveBeenCalledWith(7);
    // A callback for string ids does not fit numeric passkeys.
    // @ts-expect-error -- Id is inferred as number from `passkeys`
    void (<PasskeysSetting passkeys={numeric} onAdd={vi.fn()} onDelete={(id: string) => id} />);
  });

  it("passes id and data-* to the card, and rowProps to each row (0.16.0)", () => {
    const { container } = render(
      <PasskeysSetting
        id="passkeys"
        data-testid="passkeys-card"
        passkeys={KEYS}
        onAdd={vi.fn()}
        rowProps={(item) => ({ id: `passkey-${item.id}`, "data-kind": "key" })}
      />,
    );
    const card = screen.getByTestId("passkeys-card");
    expect(card).toHaveAttribute("id", "passkeys");
    const row = container.querySelector("#passkey-2");
    expect(row?.tagName).toBe("LI");
    expect(row).toHaveAttribute("data-kind", "key");
    expect(row).toHaveAttribute("data-passkey-id", "2");
    expect(row).toHaveTextContent("Phone");
  });
});
