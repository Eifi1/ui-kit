import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { UiKitProvider, useKitLabels, type UiKitLabelOverrides } from "../kit-labels";
import { PasskeysSetting } from "../../components/passkeys-setting";
import { DEFAULT_DATA_TABLE_LABELS } from "../../components/data-table-labels";

describe("UiKitLabelOverrides (deep partial)", () => {
  it("takes a nested partial with no cast, and rejects a wrong key", () => {
    // Type tests — checked by `tsc --noEmit`, not at run time.
    const nested: UiKitLabelOverrides = {
      accountSettings: { passkeys: { title: "Security keys" } },
      dataTable: { presets: { today: "Heute" } },
      // Function-valued labels stay functions.
      common: { fieldValue: (f, v) => `${f} = ${v}` },
    };
    const wrongNested: UiKitLabelOverrides = {
      // @ts-expect-error — not a key of PasskeysSettingLabels
      accountSettings: { passkeys: { titel: "typo" } },
    };
    const wrongNamespace: UiKitLabelOverrides = {
      // @ts-expect-error — not a namespace
      acountSettings: {},
    };
    const wrongLeaf: UiKitLabelOverrides = {
      // @ts-expect-error — a function-valued label is not a partial record
      common: { fieldValue: { a: "b" } },
    };
    expect([nested, wrongNested, wrongNamespace, wrongLeaf]).toHaveLength(4);
  });

  it("a nested partial is merged onto the section's other keys at run time", () => {
    render(
      <UiKitProvider labels={{ accountSettings: { passkeys: { title: "Security keys" } } }}>
        <UiKitProvider labels={{ accountSettings: { passkeys: { add: "Register a key" } } }}>
          <PasskeysSetting passkeys={[]} onAdd={() => {}} onRename={() => {}} onDelete={() => {}} />
        </UiKitProvider>
      </UiKitProvider>,
    );
    // The outer provider's title survives the inner provider's `add`.
    expect(screen.getByText("Security keys")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Register a key/ })).toBeInTheDocument();
  });

  it("merges records at every depth and skips undefined inside them", () => {
    let presets: Record<string, string> = {};
    function Probe() {
      presets = useKitLabels("dataTable", DEFAULT_DATA_TABLE_LABELS).presets;
      return null;
    }
    render(
      <UiKitProvider labels={{ dataTable: { presets: { today: "Heute", yesterday: undefined } } }}>
        <Probe />
      </UiKitProvider>,
    );
    expect(presets.today).toBe("Heute");
    expect(presets.yesterday).toBe(DEFAULT_DATA_TABLE_LABELS.presets.yesterday);
  });
});
