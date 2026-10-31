import type { ReactElement } from "react";
import { cloneElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { PieChart, type PieChartSlice } from "../pie-chart";
import { UiKitProvider } from "../../i18n/kit-labels";
import { uiKitLabelsFr } from "../../i18n/locales/fr";

/**
 * A slice's name under `redact` (0.52 code review; Marcel's decision). `redact` tags every
 * figure ON SCREEN `data-private` and leaves the ring untagged — a blurred ring is no
 * picture at all — but each slice was named "Occupied: €6.00 (60%)" (`labels.slice`) in an
 * `aria-label` on that untagged ring: the amount, in an attribute a session replay or a
 * redaction keyed on `[data-private]` reads as it is. keksdose's demo mode is `redact`.
 * Real recharts at a fixed 400x300, as in `pie-chart.test.tsx`.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 400, height: 300 } as never),
  };
});

const DATA: PieChartSlice[] = [
  { key: "occupied", label: "Occupied", value: 6 },
  { key: "vacant", label: "Vacant", value: 3 },
  { key: "reserved", label: "Reserved", value: 1 },
];

const money = (v: number) => `€${v.toFixed(2)}`;
/** 60 % as German writes it — with the no-break space Intl puts before the sign. */
const sixtyGerman = new Intl.NumberFormat("de-DE", { style: "percent" }).format(0.6);
const slices = (container: HTMLElement) => [...container.querySelectorAll<SVGGElement>("[data-slice]")];

/** Every attribute value in the chart, and every text node not under `[data-private]`. */
function exposed(container: HTMLElement) {
  const attributes = [...container.querySelectorAll("*")].flatMap((el) => [...el.attributes].map((a) => a.value));
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const texts: string[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.parentElement?.closest("[data-private]")) texts.push(node.textContent ?? "");
  }
  return [...attributes, ...texts];
}

describe("PieChart's slice names under redact", () => {
  it("say the label and the share, never the amount", () => {
    const { container } = render(<PieChart data={DATA} formatValue={money} redact locale="en-US" />);
    expect(slices(container).map((s) => s.getAttribute("aria-label"))).toEqual([
      "Occupied: 60%",
      "Vacant: 30%",
      "Reserved: 10%",
    ]);
  });

  it("leave no amount anywhere outside data-private, a slice focused or not", () => {
    const { container } = render(
      <PieChart data={DATA} formatValue={money} redact sliceLabels="value" locale="en-US" />,
    );
    expect(exposed(container).filter((s) => s.includes("€"))).toEqual([]);
    // Focused, the centre reads the slice out: its amount is tagged with the centre.
    act(() => slices(container)[0].focus());
    expect(container.textContent).toContain("€6.00");
    expect(exposed(container).filter((s) => s.includes("€"))).toEqual([]);
  });

  it("still say the amount without redact", () => {
    const { container } = render(<PieChart data={DATA} formatValue={money} locale="en-US" />);
    expect(slices(container)[0]).toHaveAttribute("aria-label", "Occupied: €6.00 (60%)");
  });

  it("take the provider's words (`pieChart.sliceShare`)", () => {
    const { container } = render(
      <UiKitProvider locale="de-DE" labels={{ pieChart: { sliceShare: (l, p) => `${l} – ${p}` } }}>
        <PieChart data={DATA} formatValue={money} redact />
      </UiKitProvider>,
    );
    expect(slices(container)[0]).toHaveAttribute("aria-label", `Occupied – ${sixtyGerman}`);
  });

  it("say the share in each language's own way", () => {
    const { container } = render(
      <UiKitProvider locale="fr-FR" labels={uiKitLabelsFr()}>
        <PieChart data={DATA} formatValue={money} redact />
      </UiKitProvider>,
    );
    const sixty = new Intl.NumberFormat("fr-FR", { style: "percent" }).format(0.6);
    expect(slices(container)[0]).toHaveAttribute("aria-label", `Occupied\u00a0: ${sixty}`);
  });
});
