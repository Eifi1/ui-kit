import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tabs } from "../tabs";
import { MenuItem } from "../menu-item";
import { Breadcrumbs } from "../breadcrumbs";
import { MultiSelect } from "../multi-select";
import { CountrySelect } from "../country-select";
import { TreeRow } from "../tree-view";
import { ToggleGroup } from "../toggle-group";

/**
 * Text size §10.17, round 0.34 T1: nothing is cut at Large. 0.33 fixed the floating label,
 * the names and emails and the file names (D.2 groups 1–3); group 4 — "measure, don't
 * assume" — is Tabs, MenuItem, Breadcrumbs, the AppShell sidebar, the combobox family,
 * MultiSelect, Country/CurrencySelect and the DataTable column chooser, and the size
 * sweep (`npm run check:sweep`, the release gate since 0.34) measured the rest.
 *
 * jsdom has no layout and compiles no CSS, so this pins the CLASS: `truncate-until-large`
 * is `truncate` at Normal and wraps from Large up (tokens.css). What the sweep proves in
 * a browser, this keeps from quietly coming back.
 */

describe("group 4 parts wrap from Large up", () => {
  it("Tabs: the label and the detail line", () => {
    render(
      <Tabs
        aria-label="Loops"
        tabs={[{ id: "a", label: "80 km/h", detail: "loop 2 · 31 points" }]}
        active="a"
        onChange={() => {}}
      />,
    );
    for (const text of ["80 km/h", "loop 2 · 31 points"]) {
      const line = screen.getByText(text);
      expect(line, text).toHaveClass("truncate-until-large");
      expect(line, text).not.toHaveClass("truncate");
    }
  });

  it("MenuItem: the label, beside a badge that never shrinks", () => {
    render(<MenuItem badge={<span>Shared</span>}>Holiday house on the coast</MenuItem>);
    expect(screen.getByText("Holiday house on the coast")).toHaveClass("truncate-until-large");
  });

  it("Breadcrumbs: a link, a plain crumb and the current page", () => {
    render(<Breadcrumbs items={[{ label: "Estates", href: "/estates" }, { label: "Riverside" }, { label: "Unit 4" }]} />);
    for (const text of ["Estates", "Riverside", "Unit 4"]) {
      expect(screen.getByText(text), text).toHaveClass("truncate-until-large");
    }
  });

  it("MultiSelect and CountrySelect: the value on the trigger", () => {
    render(
      <>
        <MultiSelect
          label="Markets"
          options={[
            { value: 1, label: "Europe" },
            { value: 2, label: "Asia" },
            { value: 3, label: "Africa" },
          ]}
          value={[1, 2]}
          onChange={() => {}}
        />
        <CountrySelect label="Country" value="CH" onChange={() => {}} />
      </>,
    );
    const summary = screen.getByRole("combobox", { name: /Markets/ }).querySelector(".truncate-until-large");
    expect(summary).not.toBeNull();
    expect(screen.getByText("Switzerland")).toHaveClass("truncate-until-large");
  });
});

describe("what the 0.34 sweep found", () => {
  it("TreeRow's label wraps in its min-h-8 row", () => {
    render(<TreeRow level={1} label="1020 Operating account" />);
    expect(screen.getByText("1020 Operating account")).toHaveClass("truncate-until-large");
  });

  it("ToggleGroup: the strip wraps its row at Large too, and a segment wraps rather than cuts", () => {
    render(
      <ToggleGroup
        label="Status"
        labelPlacement="strip"
        value="open"
        onChange={() => {}}
        options={[
          { value: "open", label: "Open" },
          { value: "done", label: "Done" },
        ]}
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "Status" });
    expect(group).toHaveClass("large:flex-wrap");
    expect(screen.getByRole("radio", { name: "Open" })).toHaveClass("truncate-until-large");
  });
});

/** The kit's sources, as text — read, never run. */
const SOURCES = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>("/src/**/*.tsx", { query: "?raw", import: "default", eager: true }),
  ).filter(([path]) => !path.includes("/__tests__/")),
);

/** The double-quoted string literals of `source` outside comments — where a class is. */
function classLiterals(source: string): string[] {
  return source
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line))
    .flatMap((line) => line.match(/"[^"\n]*"/g) ?? []);
}

/** A bare `truncate` class — not `truncate-until-large`, not a `[&_.truncate]` selector. */
const BARE = /(?<![\w.-])truncate(?![\w-])/;

describe("no part of group 4 truncates at Large", () => {
  const GROUP_4 = [
    // ui.tsx's ten controls, one module each since 0.34 (MOD-2); ui.tsx is a re-export shim.
    "components/button.tsx",
    "components/icon-button.tsx",
    "components/field-base.tsx",
    "components/input.tsx",
    "components/select.tsx",
    "components/textarea.tsx",
    "components/card.tsx",
    "components/spinner.tsx",
    "components/empty-state.tsx",
    "components/tabs.tsx",
    "components/menu-item.tsx",
    "components/breadcrumbs.tsx",
    "shell/app-shell.tsx",
    "components/combobox.tsx",
    // InlineEntityCombobox and the list both typed comboboxes share (MOD-9).
    "components/inline-entity-combobox.tsx",
    "components/combobox-suggestions.tsx",
    "components/combobox-core.tsx",
    "components/entity-combobox.tsx",
    "components/multi-entity-combobox.tsx",
    "components/multi-select.tsx",
    "components/country-select.tsx",
    "components/currency-select.tsx",
    "components/data-table.tsx",
    // DataTable's header, column panel, phone layout and shared row parts, one module
    // each since 0.34 (MOD-3).
    "components/data-table-head.tsx",
    "components/data-table-column-settings.tsx",
    "components/data-table-mobile.tsx",
    "components/data-table-shared.tsx",
    "components/data-table-row-actions.tsx",
  ];

  it.each(GROUP_4)("%s has no bare `truncate` class", (file) => {
    const source = SOURCES[`/src/${file}`];
    expect(source, file).toBeDefined();
    expect(classLiterals(source!).filter((literal) => BARE.test(literal)), file).toEqual([]);
  });

  it("the DataTable column chooser's label wraps, and its checkbox keeps its size", () => {
    const source = SOURCES["/src/components/data-table-column-settings.tsx"];
    expect(source).toMatch(/<span className="min-w-0 truncate-until-large">\{headerLabel\}<\/span>/);
    expect(source).toMatch(/className="size-3\.5 shrink-0"/);
  });
});

/**
 * Where the kit cuts at Large ON PURPOSE (`data-truncate-ok`): few, each with its reason
 * beside it, and never on a name or an email (§10.17). A new one is a decision, so it is
 * added here by hand.
 */
const TRUNCATE_OK = new Map([
  // The phone bar's cell label: two lines, then a clamp (0.32, §10.7).
  ["shell/app-shell.tsx", 1],
]);

describe("data-truncate-ok", () => {
  it("sits only where it was decided, with a reason in the code", () => {
    const found = new Map<string, number>();
    for (const [path, source] of Object.entries(SOURCES)) {
      const count = source.match(/data-truncate-ok=/g)?.length ?? 0;
      if (count) found.set(path.replace(/^\/src\//, ""), count);
    }
    expect(found).toEqual(TRUNCATE_OK);
    const shell = SOURCES["/src/shell/app-shell.tsx"];
    // The reason, right above the attribute's component.
    expect(shell).toMatch(/`data-truncate-ok` \(text size §10\.17, round 0\.34 T1\)[\s\S]{0,600}function MobileCellLabel/);
  });
});
