import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { PasskeysSetting } from "../passkeys-setting";
import { UiKitProvider } from "../../i18n/kit-labels";

const addButton = () => screen.getByRole("button", { name: /Add passkey/ });
const typeName = (value: string) => fireEvent.change(screen.getByLabelText("Name (optional)"), { target: { value } });

describe("PasskeysSetting 0.18 — mode", () => {
  it("says 'instead of a password' by default and the alongside line for mode='alongside'", () => {
    const { rerender } = render(<PasskeysSetting passkeys={[]} onAdd={vi.fn()} />);
    expect(screen.getByText(/instead of a password/)).toBeInTheDocument();
    rerender(<PasskeysSetting passkeys={[]} onAdd={vi.fn()} mode="alongside" />);
    expect(screen.queryByText(/instead of a password/)).toBeNull();
    expect(screen.getByText(/Your password keeps working too/)).toBeInTheDocument();
  });

  it("takes descriptionAlongside from the prop over the provider", () => {
    render(
      <UiKitProvider labels={{ accountSettings: { passkeys: { descriptionAlongside: "provider" } } }}>
        <PasskeysSetting passkeys={[]} onAdd={vi.fn()} mode="alongside" />
        <PasskeysSetting passkeys={[]} onAdd={vi.fn()} mode="alongside" labels={{ descriptionAlongside: "prop" }} />
      </UiKitProvider>,
    );
    expect(screen.getByText("provider")).toBeInTheDocument();
    expect(screen.getByText("prop")).toBeInTheDocument();
  });
});

describe("PasskeysSetting 0.18 — beforeAdd", () => {
  it("runs beforeAdd first and calls onAdd only on true, then clears the field", async () => {
    let answer!: (go: boolean) => void;
    const beforeAdd = vi.fn(() => new Promise<boolean>((r) => (answer = r)));
    const onAdd = vi.fn(() => Promise.resolve());
    render(<PasskeysSetting passkeys={[]} onAdd={onAdd} beforeAdd={beforeAdd} />);
    typeName(" Laptop ");
    fireEvent.click(addButton());
    // Called in the click, with the trimmed name; the button is busy meanwhile.
    expect(beforeAdd).toHaveBeenCalledWith("Laptop");
    expect(onAdd).not.toHaveBeenCalled();
    expect(addButton()).toBeDisabled();
    expect(addButton()).toHaveAttribute("aria-busy", "true");
    // A second click while the step is open starts nothing.
    fireEvent.click(addButton());
    expect(beforeAdd).toHaveBeenCalledTimes(1);
    await act(async () => answer(true));
    expect(onAdd).toHaveBeenCalledWith("Laptop");
    expect(screen.getByLabelText("Name (optional)")).toHaveValue("");
    expect(addButton()).toBeEnabled();
  });

  it.each([
    ["resolves false", () => Promise.resolve(false)],
    ["rejects", () => Promise.reject(new Error("closed"))],
    [
      "throws",
      () => {
        throw new Error("boom");
      },
    ],
  ])("stops quietly when beforeAdd %s, keeping the name", async (_, step) => {
    const onAdd = vi.fn();
    render(<PasskeysSetting passkeys={[]} onAdd={onAdd} beforeAdd={step as () => Promise<boolean>} />);
    typeName("Key");
    await act(async () => fireEvent.click(addButton()));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Name (optional)")).toHaveValue("Key");
    expect(addButton()).toBeEnabled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("covers Kurvenschmiede's password dialog: the step's result reaches onAdd through a ref", async () => {
    const ceremony = vi.fn((_options: string, _name: string) => Promise.resolve());
    function Card() {
      const [asking, setAsking] = useState(false);
      const answer = useRef<(go: boolean) => void>(() => {});
      const options = useRef<string | null>(null);
      return (
        <>
          <PasskeysSetting
            passkeys={[]}
            mode="alongside"
            beforeAdd={() =>
              new Promise<boolean>((resolve) => {
                answer.current = resolve;
                setAsking(true);
              })
            }
            onAdd={(name) => ceremony(options.current!, name)}
          />
          {asking && (
            <div role="dialog" aria-label="Confirm password">
              <button
                onClick={() => {
                  options.current = "challenge-1";
                  setAsking(false);
                  answer.current(true);
                }}
              >
                Continue
              </button>
              <button
                onClick={() => {
                  setAsking(false);
                  answer.current(false);
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </>
      );
    }
    render(<Card />);
    typeName("Phone");
    fireEvent.click(addButton());
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Cancel" })));
    expect(ceremony).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Name (optional)")).toHaveValue("Phone");

    fireEvent.click(addButton());
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Continue" })));
    expect(ceremony).toHaveBeenCalledWith("challenge-1", "Phone");
    expect(screen.getByLabelText("Name (optional)")).toHaveValue("");
  });

  it("still calls onAdd synchronously in the click without beforeAdd (the old open-promise way)", () => {
    const onAdd = vi.fn(() => new Promise<void>(() => {}));
    render(<PasskeysSetting passkeys={[]} onAdd={onAdd} />);
    fireEvent.click(addButton());
    expect(onAdd).toHaveBeenCalledWith("");
  });
});
