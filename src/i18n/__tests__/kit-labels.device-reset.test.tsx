import { act, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { UiKitProvider } from "../kit-labels";
import { deviceSettings, resetDeviceSettings } from "../../lib/device-settings";
import { DEFAULT_PERSIST_PREFIX } from "../../components/use-table-state";

/**
 * `UiKitProvider` joins the reset of this device's settings with the prefix its tables
 * keep their views under (docs/settings-harmonization.md §11.4): a view, by prefix, no
 * `reset` (a table reads its view when it next mounts), while the provider is mounted.
 * It joins a microtask after the mount (a literal `import()`, see the provider), so each
 * test waits for it.
 */

const tablePrefixes = () => deviceSettings().filter((e) => e.kind === "view" && e.prefix);

afterEach(() => localStorage.clear());

describe("UiKitProvider joins the device reset with its tables' prefix", () => {
  it("its own prefix, as a view by prefix with no reset; left on unmount", async () => {
    const { unmount } = render(<UiKitProvider tableStorageKeyPrefix="app-table:">x</UiKitProvider>);
    await waitFor(() => expect(tablePrefixes()).toEqual([{ key: "app-table:", prefix: true, kind: "view" }]));
    unmount();
    expect(tablePrefixes()).toEqual([]);
  });

  it("the kit's default prefix when none is set — the tables' own default", async () => {
    render(<UiKitProvider>x</UiKitProvider>);
    await waitFor(() => expect(tablePrefixes().map((e) => e.key)).toEqual([DEFAULT_PERSIST_PREFIX]));
    expect(DEFAULT_PERSIST_PREFIX).toBe("hbui-table:");
  });

  it("an inherited prefix; two nested providers with one prefix keep one entry until the outer goes", async () => {
    const tree = (inner: boolean) => (
      <UiKitProvider tableStorageKeyPrefix="app-table:">
        {inner ? <UiKitProvider locale="de-CH">x</UiKitProvider> : "x"}
      </UiKitProvider>
    );
    const { rerender, unmount } = render(tree(true));
    await waitFor(() => expect(tablePrefixes().map((e) => e.key)).toEqual(["app-table:"]));
    rerender(tree(false));
    await act(async () => {});
    expect(tablePrefixes().map((e) => e.key)).toEqual(["app-table:"]);
    unmount();
    expect(tablePrefixes()).toEqual([]);
  });

  it("an inner provider with a prefix of its own joins it beside the outer's", async () => {
    render(
      <UiKitProvider tableStorageKeyPrefix="app-table:">
        <UiKitProvider tableStorageKeyPrefix="admin-table:">x</UiKitProvider>
      </UiKitProvider>,
    );
    await waitFor(() => expect(tablePrefixes().map((e) => e.key).sort()).toEqual(["admin-table:", "app-table:"]));
  });

  it("never joins when it unmounts before the join lands", async () => {
    const { unmount } = render(<UiKitProvider tableStorageKeyPrefix="gone-table:">x</UiKitProvider>);
    unmount();
    await act(async () => {});
    expect(tablePrefixes()).toEqual([]);
  });

  it("a reset removes every table view under the prefix, and nothing else", async () => {
    localStorage.setItem("app-table:invoices", "{}");
    localStorage.setItem("app-table:people", "{}");
    localStorage.setItem("app-auth", "token");
    render(<UiKitProvider tableStorageKeyPrefix="app-table:">x</UiKitProvider>);
    await waitFor(() => expect(tablePrefixes()).toHaveLength(1));
    expect(resetDeviceSettings().sort()).toEqual(["app-table:invoices", "app-table:people"]);
    expect(localStorage.getItem("app-table:invoices")).toBeNull();
    expect(localStorage.getItem("app-auth")).toBe("token");
  });
});
