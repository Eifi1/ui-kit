import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeldChangesBanner } from "../held-changes-banner";
import { ConfirmProvider } from "../../components/confirm-dialog";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";

/**
 * docs/top-bar-harmonization.md §2.6.1: keksdose's budget-switch banner and kastlan's
 * handover sync banner as one kit part. The app keeps what is held and how it goes; the
 * banner says how many, offers the way back, and asks before it lets them go.
 */

const wrap = (node: ReactNode) => <ConfirmProvider>{node}</ConfirmProvider>;

/** A promise the test settles by hand, to see the banner while it runs. */
function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const discardButton = () => screen.getByRole("button", { name: "Discard…" });
const ask = () => screen.findByRole("alertdialog", { name: "Discard 2 changes that cannot be sent from here?" });

describe("HeldChangesBanner", () => {
  it("renders nothing while nothing is held", () => {
    const { container } = render(wrap(<HeldChangesBanner count={0} onDiscard={vi.fn()} />));
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says how many, in the kit's words or the app's sentence", () => {
    const { rerender } = render(wrap(<HeldChangesBanner count={1} onDiscard={vi.fn()} />));
    expect(
      screen.getByText(
        "1 change cannot be sent from here. It stays on this device until it can be sent, or until you discard it.",
      ),
    ).toBeInTheDocument();

    rerender(wrap(<HeldChangesBanner count={3} onDiscard={vi.fn()} />));
    expect(screen.getByText(/^3 changes cannot be sent from here\. They stay on this device/)).toBeInTheDocument();

    rerender(
      wrap(
        <HeldChangesBanner
          count={3}
          message="3 changes were made in “Holiday”, which is no longer the active budget."
          onDiscard={vi.fn()}
        />,
      ),
    );
    expect(screen.getByText("3 changes were made in “Holiday”, which is no longer the active budget.")).toBeVisible();
    expect(screen.queryByText(/cannot be sent from here/)).toBeNull();
  });

  it("speaks the provider's language: de-CH, Swiss spelling in the confirm", async () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <ConfirmProvider>
          <HeldChangesBanner count={2} onSwitchBack={vi.fn()} onDiscard={vi.fn()} />
        </ConfirmProvider>
      </UiKitProvider>,
    );
    expect(screen.getByText(/^2 Änderungen können von hier aus nicht gesendet werden\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zurückwechseln" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Verwerfen…" }));
    const dialog = await screen.findByRole("alertdialog", {
      name: "2 Änderungen verwerfen, die von hier aus nicht gesendet werden können?",
    });
    expect(dialog).toHaveAccessibleDescription(
      "Sie lassen sich nicht wiederherstellen. Dieses Gerät synchronisiert anschliessend mit dem Stand des Servers.",
    );
  });

  it("offers the way back only when the app has one, and takes it without asking", () => {
    const onSwitchBack = vi.fn();
    const onDiscard = vi.fn();
    const { rerender } = render(wrap(<HeldChangesBanner count={2} onDiscard={onDiscard} />));
    expect(screen.queryByRole("button", { name: "Switch back" })).toBeNull();

    rerender(wrap(<HeldChangesBanner count={2} onSwitchBack={onSwitchBack} onDiscard={onDiscard} />));
    // The safe action first (keksdose): the destructive one is never the first button found.
    const [first, second] = screen.getAllByRole("button");
    expect(first).toHaveAccessibleName("Switch back");
    expect(second).toHaveAccessibleName("Discard…");

    fireEvent.click(first!);
    expect(onSwitchBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it("asks before it discards, with the count that would be lost", async () => {
    const onDiscard = vi.fn();
    render(wrap(<HeldChangesBanner count={2} onDiscard={onDiscard} />));

    fireEvent.click(discardButton());
    const dialog = await ask();
    expect(dialog).toHaveAccessibleDescription(
      "They cannot be recovered. This device then syncs with what the server has.",
    );
    // The danger tone: a reflexive Enter lands on Cancel.
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it("changes nothing on cancel", async () => {
    const onDiscard = vi.fn();
    render(wrap(<HeldChangesBanner count={2} onDiscard={onDiscard} />));

    fireEvent.click(discardButton());
    fireEvent.click(within(await ask()).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(onDiscard).not.toHaveBeenCalled();
    expect(discardButton()).not.toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(/^2 changes cannot be sent from here/)).toBeInTheDocument();
  });

  it("on yes, awaits the app's discard and is busy while it runs", async () => {
    const run = deferred();
    const onDiscard = vi.fn(() => run.promise);
    const { rerender } = render(wrap(<HeldChangesBanner count={2} onSwitchBack={vi.fn()} onDiscard={onDiscard} />));

    fireEvent.click(discardButton());
    fireEvent.click(within(await ask()).getByRole("button", { name: "Discard" }));

    await waitFor(() => expect(onDiscard).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(discardButton()).toHaveAttribute("aria-busy", "true"));
    // One action at a time: the way back waits while the changes are being dropped.
    expect(screen.getByRole("button", { name: "Switch back" })).toBeDisabled();
    // A second press while it runs asks nothing and discards nothing more.
    fireEvent.click(discardButton());
    expect(screen.queryByRole("alertdialog")).toBeNull();

    run.resolve();
    await waitFor(() => expect(discardButton()).not.toHaveAttribute("aria-busy", "true"));
    expect(screen.getByRole("button", { name: "Switch back" })).toBeEnabled();
    expect(onDiscard).toHaveBeenCalledTimes(1);

    // The app's count reaching 0 is what takes the banner away.
    rerender(wrap(<HeldChangesBanner count={0} onSwitchBack={vi.fn()} onDiscard={onDiscard} />));
    expect(screen.queryByRole("button", { name: "Discard…" })).toBeNull();
  });

  it("keeps the banner and shows the error when the discard is refused", async () => {
    const onDiscard = vi.fn(() => Promise.reject(new Error("offline")));
    const { rerender } = render(wrap(<HeldChangesBanner count={2} onDiscard={onDiscard} />));

    fireEvent.click(discardButton());
    fireEvent.click(within(await ask()).getByRole("button", { name: "Discard" }));

    // Inline, so a live region: the answer to the button just pressed is heard.
    expect(await screen.findByRole("alert")).toHaveTextContent("That didn’t work. Please try again.");
    expect(screen.getByText(/^2 changes cannot be sent from here/)).toBeInTheDocument();
    expect(discardButton()).not.toHaveAttribute("aria-busy", "true");

    // The app's words for the refusal win; a new try clears the old error first.
    rerender(
      wrap(
        <HeldChangesBanner
          count={2}
          onDiscard={onDiscard}
          formatError={(error) => `Could not discard: ${(error as Error).message}`}
        />,
      ),
    );
    fireEvent.click(discardButton());
    fireEvent.click(within(await ask()).getByRole("button", { name: "Discard" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Could not discard: offline"));
    expect(onDiscard).toHaveBeenCalledTimes(2);
  });

  it("shows a refused switch back the same way, and forgets the error once nothing is held", async () => {
    const onSwitchBack = vi.fn(() => Promise.reject(new Error("no access")));
    const { rerender } = render(wrap(<HeldChangesBanner count={2} onSwitchBack={onSwitchBack} onDiscard={vi.fn()} />));
    fireEvent.click(screen.getByRole("button", { name: "Switch back" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That didn’t work. Please try again.");

    rerender(wrap(<HeldChangesBanner count={0} onSwitchBack={onSwitchBack} onDiscard={vi.fn()} />));
    rerender(wrap(<HeldChangesBanner count={1} onSwitchBack={onSwitchBack} onDiscard={vi.fn()} />));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("is a warning, a box by default and a strip on request, with the app's data attributes", () => {
    const { container, rerender } = render(
      wrap(<HeldChangesBanner count={2} onDiscard={vi.fn()} data-tour="held-changes" />),
    );
    const box = container.querySelector('[data-tour="held-changes"]');
    expect(box?.className).toMatch(/warning/);
    expect(box?.className).not.toMatch(/\bborder-b\b/);

    rerender(wrap(<HeldChangesBanner count={2} variant="strip" onDiscard={vi.fn()} data-tour="held-changes" />));
    const strip = container.querySelector('[data-tour="held-changes"]');
    expect(strip?.className).toMatch(/warning/);
    // A band: no radius, only the line under it.
    expect(strip?.className).toMatch(/\bborder-b\b/);
    // One line on a phone, with More for the rest (keksdose dev#611).
    expect(screen.getByRole("button", { name: "More" })).toHaveAttribute("aria-expanded", "false");
  });
});
