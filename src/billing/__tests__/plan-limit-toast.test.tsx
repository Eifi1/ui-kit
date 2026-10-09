import { render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "../../components/toast";
import type { ToastOptions } from "../../components/toast";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { UI_KIT_LABELS_FR } from "../../i18n/locales/fr";
import { documentNavigation } from "../../lib/document-navigation";
import { isPlanLimit } from "../plan-limit";
import { usePlanLimitToast } from "../plan-limit-toast";
import type { PlanLimitToastOptions } from "../plan-limit-toast";

/**
 * PlanLimitNotice's words as a toast (docs/billing-harmonization.md §14.11): the title,
 * what to do, the figure when there is one, the mode's action — one toast per dimension.
 */

let shown: Array<{ title: ReactNode; options: ToastOptions }>;

beforeEach(() => {
  shown = [];
  vi.spyOn(toast, "warning").mockImplementation((title, options) => {
    shown.push({ title, options: options ?? {} });
    return options?.id ?? "x";
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

function useToast(options: PlanLimitToastOptions, wrapper?: (props: { children: ReactNode }) => ReactNode) {
  return renderHook(() => usePlanLimitToast(options), { wrapper }).result.current;
}

/** The description as the reader sees it, line by line. */
function lines(description: ReactNode): string[] {
  const { container } = render(<>{description}</>);
  return [...container.querySelectorAll("span.block")].map((line) => line.textContent ?? "");
}

const HIT = { dimension: "budgets", plan: "free", limit: 3, used: 3 };

describe("usePlanLimitToast (§14.11)", () => {
  it("upgrade: the title, what to do, the figure, and Choose a plan through the app's navigation", () => {
    const onChoosePlan = vi.fn();
    const show = useToast({ mode: "upgrade", onChoosePlan, dimensionLabels: { budgets: "Budgets" } });
    expect(show(HIT)).toBe("plan-limit:budgets");
    const [{ title, options }] = shown;
    expect(title).toBe("Plan limit reached");
    expect(lines(options.description)).toEqual(["To add more, choose a plan with a higher limit.", "Budgets: 3 of 3"]);
    expect(options.action?.label).toBe("Choose a plan");
    options.action?.onClick({} as never);
    expect(onChoosePlan).toHaveBeenCalledTimes(1);
  });

  it("contact: Ask for more opens the mail to support, naming the dimension", () => {
    const go = vi.spyOn(documentNavigation, "replace").mockImplementation(() => {});
    const show = useToast({ mode: "contact", email: "support@keksdose.app", dimensionLabels: { scans: "Scans" } });
    show({ dimension: "scans", plan: "free", limit: 50, used: 50 });
    const { options } = shown[0];
    expect(lines(options.description)[0]).toBe("To add more, ask us for a higher limit.");
    expect(options.action?.label).toBe("Ask for more");
    options.action?.onClick({} as never);
    expect(go).toHaveBeenCalledWith("mailto:support@keksdose.app?subject=Plan%20limit%3A%20Scans");
  });

  it("replaces a repeat in place: one toast id per dimension", () => {
    const show = useToast({ mode: "upgrade", onChoosePlan: () => {} });
    show(HIT);
    show({ ...HIT, used: 4 });
    show({ dimension: "seats", plan: "free", limit: 2, used: 2 });
    expect(shown.map((s) => s.options.id)).toEqual(["plan-limit:budgets", "plan-limit:budgets", "plan-limit:seats"]);
  });

  it("draws no figure without a limit, and reads keksdose's legacy refusal as budgets", () => {
    const show = useToast({ mode: "upgrade", dimensionLabels: { budgets: "Budgets" } });
    const legacy = isPlanLimit({ response: { data: { detail: "…", code: "plan_budget_limit", plan: "FREE", limit: 1 } } });
    show(legacy);
    expect(shown[0].options.id).toBe("plan-limit:budgets");
    // `used` absent: refused for being AT the limit.
    expect(lines(shown[0].options.description)).toEqual([
      "To add more, choose a plan with a higher limit.",
      "Budgets: 1 of 1",
    ]);
    // No action without the app's navigation.
    expect(shown[0].options.action).toBeUndefined();

    show({ dimension: "budgets", plan: "free", limit: undefined, used: undefined });
    expect(lines(shown[1].options.description)).toHaveLength(1);
    show();
    expect(shown[2].options.id).toBe("plan-limit");
    expect(lines(shown[2].options.description)).toHaveLength(1);
  });

  it("writes the figures the app's way, and speaks the provider's language", () => {
    const de = ({ children }: { children: ReactNode }) => (
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH} locale="de-CH">
        {children}
      </UiKitProvider>
    );
    useToast({ mode: "upgrade", onChoosePlan: () => {}, dimensionLabels: { budgets: "Budgets" } }, de)({
      ...HIT,
      used: 1234,
      limit: 1000,
    });
    expect(shown[0].title).toBe("Tariflimit erreicht");
    const ch = new Intl.NumberFormat("de-CH");
    expect(lines(shown[0].options.description)[1]).toBe(`Budgets: ${ch.format(1234)} von ${ch.format(1000)}`);
    expect(shown[0].options.action?.label).toBe("Tarif wählen");

    const fr = ({ children }: { children: ReactNode }) => (
      <UiKitProvider labels={UI_KIT_LABELS_FR}>{children}</UiKitProvider>
    );
    useToast(
      { mode: "upgrade", formatValue: (_d, v) => `${v / 1000} Go`, dimensionLabels: { storage: "Stockage" } },
      fr,
    )({ dimension: "storage", plan: "free", limit: 5000, used: 5000 });
    // French puts a (non-breaking) space before the colon: why this is a key.
    expect(lines(shown[1].options.description)[1]).toBe("Stockage : 5 Go sur 5 Go");
  });
});
