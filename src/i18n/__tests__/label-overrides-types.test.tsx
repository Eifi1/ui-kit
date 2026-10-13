import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  UiKitProvider,
  useKitLabelOverrides,
  useKitLabels,
  type LabelOverride,
  type UiKitLabelOverrides,
} from "../kit-labels";
import { PasskeysSetting } from "../../account/passkeys-setting";
import type { PasskeysSettingLabels } from "../../account/account-settings-labels";
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

/**
 * Round 0.35 R3: `useKitLabelOverrides` said `Partial<…>` — partial at the top only — while
 * the provider is handed, and merges, a partial at every depth (phase C3a). So a section the
 * provider named one key of (`accountSettings.passkeys.title`) was typed as the whole
 * section, and a caller read the other keys as strings that were not there.
 */
describe("useKitLabelOverrides (deep partial, round 0.35 R3)", () => {
  it("is typed as deep as the provider's labels, and fits a component's `labels` prop", () => {
    // Type tests — checked by `tsc --noEmit`; the probe is never rendered.
    function Probe() {
      const over = useKitLabelOverrides("accountSettings");
      // What a section's `labels` prop takes…
      const passkeys: LabelOverride<PasskeysSettingLabels> | undefined = over?.passkeys;
      // @ts-expect-error — …and not the whole section: the provider may have named one key of it
      const whole: PasskeysSettingLabels | undefined = over?.passkeys;
      // @ts-expect-error — a record inside a namespace is partial too (`dataTable.presets`)
      const presets: Record<string, string> | undefined = useKitLabelOverrides("dataTable")?.presets;
      void [passkeys, whole, presets];
      // …so it is handed to one with no cast.
      return (
        <PasskeysSetting passkeys={[]} onAdd={() => {}} onRename={() => {}} onDelete={() => {}} labels={over?.passkeys} />
      );
    }
    expect(Probe).toBeTypeOf("function");
  });

  it("returns what the providers said, merged at every depth, and nothing else", () => {
    let seen: ReturnType<typeof useKitLabelOverrides<"accountSettings">> = {};
    let outside: unknown = "unset";
    function Probe() {
      seen = useKitLabelOverrides("accountSettings");
      return null;
    }
    function Outside() {
      outside = useKitLabelOverrides("accountSettings");
      return null;
    }
    render(
      <>
        <Outside />
        <UiKitProvider labels={{ accountSettings: { passkeys: { title: "Security keys" } } }}>
          <UiKitProvider labels={{ accountSettings: { passkeys: { add: "Register a key" } } }}>
            <Probe />
          </UiKitProvider>
        </UiKitProvider>
      </>,
    );
    // The inner provider's key joins the outer one's in the same section; no English
    // default is filled in — that is `useKitLabels`' job, not this hook's.
    expect(seen).toEqual({ passkeys: { title: "Security keys", add: "Register a key" } });
    expect(outside).toBeUndefined();
  });
});
