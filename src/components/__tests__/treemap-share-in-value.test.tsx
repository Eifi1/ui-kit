import type { ReactElement } from "react";
import { cloneElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Treemap, type TreemapNode } from "../treemap";
import { DEFAULT_TREEMAP_LABELS, type TreemapLabels } from "../treemap-labels";
import { UiKitProvider } from "../../i18n/kit-labels";
import { uiKitLabelsDeCh } from "../../i18n/locales/de-CH";
import { uiKitLabelsEn } from "../../i18n/locales/en";
import { uiKitLabelsEs } from "../../i18n/locales/es";
import { UI_KIT_LABELS_FR, uiKitLabelsFr } from "../../i18n/locales/fr";
import { uiKitLabelsHu } from "../../i18n/locales/hu";
import { uiKitLabelsIt } from "../../i18n/locales/it";
import { uiKitLabelsZh } from "../../i18n/locales/zh";

/**
 * `shareInValue` (0.53, keksdose after 0.52). A tile's name is "name: value (share)", the
 * value asked of the map's `valueFormatter` — and keksdose's formatter prints the share
 * itself ("CHF 412.30 · 12%"), so every tile said its share twice. Its only way out was to
 * override `labels.tile` and `labels.group` whole, which threw away the kit's seven
 * catalogues: it added `reports.treemap_group` in four locales, and its French override lost
 * the catalogue's typography. With the flag the map hands the templates the share as `""`,
 * and every template drops its " (share)". Real recharts at a fixed 800x300, as in
 * `treemap-text-alternative.test.tsx`.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 300 } as never),
  };
});

const DATA: TreemapNode[] = [
  { id: "rent", name: "Rent", value: 1200 },
  { id: "food", name: "Groceries", value: 600 },
  { id: "fun", name: "Leisure", value: 200 },
];

// keksdose's formatter: the amount and the share, in one string.
const moneyAndShare = (v: number, share: number | undefined) => `CHF ${v} · ${Math.round((share ?? 0) * 100)}%`;

// A total of 2000: Housing 1240 (62%), Bank fees 760 (38%).
const GROUPED: TreemapNode[] = [
  {
    id: "housing",
    name: "Housing",
    value: 1240,
    children: [
      { id: "rent", name: "Rent", value: 1000 },
      { id: "council", name: "Council tax", value: 240 },
    ],
  },
  { id: "fees", name: "Bank fees", value: 760 },
];

const names = () =>
  screen
    .getAllByRole("img")
    .map((tile) => tile.getAttribute("aria-label"))
    .sort();

describe("Treemap with shareInValue", () => {
  it("says the share once, the formatter's, in English", () => {
    render(<Treemap data={DATA} valueFormatter={moneyAndShare} shareInValue />);
    expect(names()).toEqual(["Groceries: CHF 600 · 30%", "Leisure: CHF 200 · 10%", "Rent: CHF 1200 · 60%"]);
  });

  it("changes nothing without it: the name says the share after the formatter's", () => {
    render(<Treemap data={DATA} valueFormatter={moneyAndShare} />);
    expect(names()).toContain("Rent: CHF 1200 · 60% (60%)");
  });

  it("keeps the French catalogue's typography: the space before the colon", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_FR} locale="fr-FR">
        <Treemap data={DATA} shareInValue />
      </UiKitProvider>,
    );
    const value = new Intl.NumberFormat("fr-FR").format(1200);
    expect(screen.getByRole("img", { name: `Rent\u00a0: ${value}` })).toBeInTheDocument();
  });

  it("leaves the share out of a group's name, and out of a tile's inside it", () => {
    render(<Treemap data={GROUPED} shareInValue />);
    expect(names()).toEqual([
      "Bank fees: 760",
      "Council tax: 240, in Housing",
      "Housing, group: 1,240",
      "Rent: 1,000, in Housing",
    ]);
  });

  it("hands an app's own template the share as an empty string", () => {
    const tile = vi.fn<TreemapLabels["tile"]>((name, value) => `${name} = ${value}`);
    const group = vi.fn<TreemapLabels["group"]>((name, value) => `${name} (all) = ${value}`);
    render(<Treemap data={GROUPED} shareInValue labels={{ tile, group }} />);
    expect(tile).toHaveBeenCalledWith("Bank fees", "760", "");
    expect(group).toHaveBeenCalledWith("Housing", "1,240", "");
  });
});

describe("Every catalogue's tile and group, handed an empty share", () => {
  const CATALOGUES: [string, Pick<TreemapLabels, "tile" | "group">][] = [
    ["default", DEFAULT_TREEMAP_LABELS],
    ["en", uiKitLabelsEn().treemap],
    ["de-CH", uiKitLabelsDeCh().treemap],
    ["es", uiKitLabelsEs().treemap],
    ["fr", uiKitLabelsFr().treemap],
    ["hu", uiKitLabelsHu().treemap],
    ["it", uiKitLabelsIt().treemap],
    ["zh", uiKitLabelsZh().treemap],
  ];

  it.each(CATALOGUES)("%s drops the share's brackets and nothing else", (_, labels) => {
    for (const say of [labels.tile, labels.group]) {
      const withShare = say("NAME", "VALUE", "SHARE");
      const without = say("NAME", "VALUE", "");
      // The name ends at the value: no "()", no "（）", no trailing space.
      expect(without.endsWith("VALUE"), without).toBe(true);
      // And the rest is the catalogue's own words, typography and all.
      expect(withShare.startsWith(without), `${withShare} / ${without}`).toBe(true);
      expect(withShare.slice(without.length)).toMatch(/^\s?[(（]SHARE[)）]$/);
    }
  });
});
