import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_FR } from "../../i18n/locales/fr";
import { PwaUpdatePrompt } from "../pwa-update-prompt";

const mocks = vi.hoisted(() => {
  const toast = Object.assign(vi.fn(), { dismiss: vi.fn() });
  return { toast };
});
vi.mock("../../components/toast", () => ({ toast: mocks.toast }));

type Options = { id: string; duration: number; action: { label: string; onClick: () => void }; onDismiss: () => void };
const lastOptions = () => mocks.toast.mock.calls.at(-1)![1] as Options;

beforeEach(() => {
  mocks.toast.mockClear();
  mocks.toast.dismiss.mockClear();
});
afterEach(cleanup);

describe("PwaUpdatePrompt", () => {
  it("shows nothing until a new version waits", () => {
    const { rerender, container } = render(<PwaUpdatePrompt needRefresh={false} onReload={() => {}} />);
    expect(container).toBeEmptyDOMElement();
    expect(mocks.toast).not.toHaveBeenCalled();
    rerender(<PwaUpdatePrompt needRefresh onReload={() => {}} />);
    expect(mocks.toast).toHaveBeenCalledTimes(1);
    expect(mocks.toast.mock.calls[0][0]).toBe("A new version is available.");
    expect(lastOptions()).toMatchObject({ id: "pwa-update", duration: Infinity, action: { label: "Reload" } });
  });

  it("Reload calls onReload", () => {
    const onReload = vi.fn();
    render(<PwaUpdatePrompt needRefresh onReload={onReload} />);
    lastOptions().action.onClick();
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("a dismissal by the person is reported", () => {
    const onDismiss = vi.fn();
    render(<PwaUpdatePrompt needRefresh onReload={() => {}} onDismiss={onDismiss} />);
    lastOptions().onDismiss();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("hold defers the prompt; it shows once the hold drops", () => {
    const { rerender } = render(<PwaUpdatePrompt needRefresh hold onReload={() => {}} />);
    expect(mocks.toast).not.toHaveBeenCalled();
    rerender(<PwaUpdatePrompt needRefresh hold onReload={() => {}} />);
    expect(mocks.toast).not.toHaveBeenCalled();
    rerender(<PwaUpdatePrompt needRefresh hold={false} onReload={() => {}} />);
    expect(mocks.toast).toHaveBeenCalledTimes(1);
  });

  it("a hold that starts takes the toast down without telling the app it was dismissed", () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<PwaUpdatePrompt needRefresh onReload={() => {}} onDismiss={onDismiss} />);
    const shown = lastOptions();
    rerender(<PwaUpdatePrompt needRefresh hold onReload={() => {}} onDismiss={onDismiss} />);
    expect(mocks.toast.dismiss).toHaveBeenCalledWith("pwa-update");
    shown.onDismiss(); // sonner fires it for the programmatic dismiss too
    expect(onDismiss).not.toHaveBeenCalled();
    rerender(<PwaUpdatePrompt needRefresh onReload={() => {}} onDismiss={onDismiss} />);
    expect(mocks.toast).toHaveBeenCalledTimes(2);
  });

  it("does not raise the toast again for new callbacks on a re-render", () => {
    const { rerender } = render(<PwaUpdatePrompt needRefresh onReload={() => {}} />);
    const onReload = vi.fn();
    rerender(<PwaUpdatePrompt needRefresh onReload={onReload} />);
    expect(mocks.toast).toHaveBeenCalledTimes(1);
    lastOptions().action.onClick();
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("speaks the provider's language", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_FR}>
        <PwaUpdatePrompt needRefresh onReload={() => {}} />
      </UiKitProvider>,
    );
    expect(mocks.toast.mock.calls[0][0]).toBe("Une nouvelle version est disponible.");
    expect(lastOptions().action.label).toBe("Recharger");
  });
});
