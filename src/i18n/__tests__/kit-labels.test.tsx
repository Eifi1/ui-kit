import { render, screen } from "@testing-library/react";
import {
  DEFAULT_COMMON_LABELS,
  UiKitProvider,
  formatFileSize,
  missingKitLabels,
  useKitLabels,
  useKitLocale,
} from "../kit-labels";
import type { CommonLabels } from "../kit-labels";
import { DEFAULT_UI_KIT_LABELS } from "../defaults";
import { DEFAULT_DATA_TABLE_LABELS } from "../../components/data-table-labels";

/** Renders what `useKitLabels("common", …)` resolves to, and the locale. */
function Probe({ prop }: { prop?: Partial<CommonLabels> }) {
  const l = useKitLabels("common", DEFAULT_COMMON_LABELS, prop);
  const locale = useKitLocale();
  return (
    <p>
      <span data-testid="close">{l.close}</span>
      <span data-testid="clear">{l.clear}</span>
      <span data-testid="field">{l.fieldValue("A", "b")}</span>
      <span data-testid="locale">{locale ?? "none"}</span>
    </p>
  );
}

const text = (id: string) => screen.getByTestId(id).textContent;

describe("UiKitProvider", () => {
  it("is optional: without one, a component gets the English defaults", () => {
    render(<Probe />);
    expect(text("close")).toBe("Close");
    expect(text("locale")).toBe("none");
  });

  it("hands its labels and locale to everything below it", () => {
    render(
      <UiKitProvider labels={{ common: { close: "Schließen" } }} locale="de-DE">
        <Probe />
      </UiKitProvider>,
    );
    expect(text("close")).toBe("Schließen");
    // A key the provider did not name still falls back, rather than going undefined.
    expect(text("clear")).toBe("Clear");
    expect(text("locale")).toBe("de-DE");
  });

  it("a component's own prop wins over the provider", () => {
    render(
      <UiKitProvider labels={{ common: { close: "Schließen", clear: "Leeren" } }}>
        <Probe prop={{ close: "Zu" }} />
      </UiKitProvider>,
    );
    expect(text("close")).toBe("Zu");
    expect(text("clear")).toBe("Leeren");
  });

  it("nests as a merge: an inner provider overrides only what it names", () => {
    render(
      <UiKitProvider labels={{ common: { close: "Schließen", clear: "Leeren" } }} locale="de-DE">
        <UiKitProvider labels={{ common: { clear: "Löschen" } }}>
          <Probe />
        </UiKitProvider>
      </UiKitProvider>,
    );
    expect(text("close")).toBe("Schließen");
    expect(text("clear")).toBe("Löschen");
    expect(text("locale")).toBe("de-DE");
  });

  it("merges a record-valued key key-by-key (data-table presets)", () => {
    function Presets() {
      const l = useKitLabels("dataTable", DEFAULT_DATA_TABLE_LABELS);
      return <p>{`${l.presets.today}|${l.presets.yesterday}`}</p>;
    }
    render(
      <UiKitProvider labels={{ dataTable: { presets: { today: "Heute" } } }}>
        <Presets />
      </UiKitProvider>,
    );
    expect(screen.getByText("Heute|Yesterday")).toBeInTheDocument();
  });
});

describe("missingKitLabels", () => {
  it("lists every key of the reference when nothing is supplied", () => {
    const all = missingKitLabels(undefined, DEFAULT_UI_KIT_LABELS);
    expect(all).toContain("common.close");
    expect(all).toContain("dataTable.presets");
  });

  it("is empty for the reference itself", () => {
    expect(missingKitLabels(DEFAULT_UI_KIT_LABELS, DEFAULT_UI_KIT_LABELS)).toEqual([]);
  });

  it("names a missing preset by its full dot path", () => {
    const partial = {
      ...DEFAULT_UI_KIT_LABELS,
      dataTable: { ...DEFAULT_DATA_TABLE_LABELS, presets: { today: "Heute" } },
    };
    expect(missingKitLabels(partial, DEFAULT_UI_KIT_LABELS)).toContain("dataTable.presets.yesterday");
  });
});

describe("formatFileSize", () => {
  it("formats in the given locale, not with a glued-on English unit", () => {
    expect(formatFileSize(512, "en-GB")).toBe("512 bytes");
    expect(formatFileSize(12_300, "en-GB")).toBe("12 kB");
    expect(formatFileSize(3_400_000, "de-DE")).toBe("3,4 MB");
  });
});
