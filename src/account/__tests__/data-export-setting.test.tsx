import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataExportSetting } from "../data-export-setting";
import type { DataExportFile } from "../data-export-setting";

/**
 * docs/user-admin-harmonization.md §6.5: the app fetches, the kit saves the file through
 * a link with a name, and the throttle is said. jsdom has no object URLs and does not
 * download, so both are stubbed and the link's click is recorded.
 */

let clicks: { href: string; download: string; inBody: boolean }[];
let created: Blob[];
let revoked: string[];

beforeEach(() => {
  clicks = [];
  created = [];
  revoked = [];
  URL.createObjectURL = vi.fn((blob: Blob) => {
    created.push(blob);
    return `blob:test/${created.length}`;
  });
  URL.revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url);
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    clicks.push({ href: this.getAttribute("href") ?? "", download: this.download, inBody: document.body.contains(this) });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const today = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `account-export-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
};

function setup(onExport: () => Promise<DataExportFile>, props: Partial<Parameters<typeof DataExportSetting>[0]> = {}) {
  const user = userEvent.setup();
  const utils = render(<DataExportSetting onExport={onExport} {...props} />);
  return { user, ...utils };
}

const button = () => screen.getByRole("button", { name: "Download my data" });

describe("DataExportSetting", () => {
  it("says what it is, with the app's sentence under the kit's", () => {
    setup(async () => new Blob(["{}"]), {
      description: "Your account; your company’s records are your company’s, ask them.",
    });
    expect(screen.getByText("Export your data")).toBeInTheDocument();
    expect(screen.getByText("Download a copy of your account’s data as a JSON file.")).toBeInTheDocument();
    expect(screen.getByText("Your account; your company’s records are your company’s, ask them.")).toBeInTheDocument();
  });

  it("saves a Blob through a named link, busy until then, and keeps a link to save it again", async () => {
    let resolve!: (file: Blob) => void;
    const blob = new Blob(['{"format":"eifi1-account-export"}'], { type: "application/json" });
    const onExport = vi.fn(() => new Promise<Blob>((r) => (resolve = r)));
    const { user } = setup(onExport);
    await user.click(button());
    expect(onExport).toHaveBeenCalledTimes(1);
    expect(button()).toHaveAttribute("aria-busy", "true");
    resolve(blob);
    expect(await screen.findByRole("status")).toHaveTextContent("Your download has started.");
    expect(created).toEqual([blob]);
    expect(clicks).toEqual([{ href: "blob:test/1", download: today(), inBody: true }]);
    // The link is taken out again.
    expect(document.querySelectorAll("a[download]")).toHaveLength(1);
    const again = screen.getByRole("link", { name: "Didn’t start? Save the file" });
    expect(again).toHaveAttribute("href", "blob:test/1");
    expect(again).toHaveAttribute("download", today());
    expect(button()).not.toHaveAttribute("aria-busy");
  });

  it("takes the app's filename, and a { url, filename } answer's own name over it", async () => {
    const first = setup(async () => new Blob(["{}"]), { filename: "kastlan-account.json" });
    await first.user.click(button());
    await waitFor(() => expect(clicks).toHaveLength(1));
    expect(clicks[0]).toMatchObject({ download: "kastlan-account.json" });
    first.unmount();

    const second = setup(async () => ({ url: "/api/auth/me/export?sig=abc", filename: "keksdose-account.json" }), {
      filename: "ignored.json",
    });
    await second.user.click(button());
    await waitFor(() => expect(clicks).toHaveLength(2));
    expect(clicks[1]).toEqual({ href: "/api/auth/me/export?sig=abc", download: "keksdose-account.json", inBody: true });
    // A URL of the app's is never revoked by the kit.
    second.unmount();
    expect(revoked).toEqual(["blob:test/1"]);
  });

  it("revokes its object URL when the next export replaces it and when the card goes", async () => {
    const { user, unmount } = setup(async () => new Blob(["{}"]));
    await user.click(button());
    await waitFor(() => expect(clicks).toHaveLength(1));
    await user.click(button());
    await waitFor(() => expect(clicks).toHaveLength(2));
    expect(revoked).toEqual(["blob:test/1"]);
    unmount();
    expect(revoked).toEqual(["blob:test/1", "blob:test/2"]);
  });

  it("a 429 says rateLimited; the app's words come first; anything else failed", async () => {
    const first = setup(() => Promise.reject({ response: { status: 429 } }));
    await first.user.click(button());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You exported your data a moment ago. Please try again in a minute.",
    );
    expect(clicks).toHaveLength(0);
    first.unmount();

    const second = setup(() => Promise.reject({ response: { status: 403 } }), {
      describeError: () => "The demo account has nothing to export.",
    });
    await second.user.click(button());
    expect(await screen.findByRole("alert")).toHaveTextContent("The demo account has nothing to export.");
    second.unmount();

    setup(() => Promise.reject(new Error("offline")));
    await userEvent.setup().click(button());
    expect(await screen.findByRole("alert")).toHaveTextContent("The export failed. Please try again.");
  });

  it("names the wait a Retry-After asks for", async () => {
    setup(() => Promise.reject({ response: { status: 429, headers: { "retry-after": "42" } } }));
    await userEvent.setup().click(button());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You exported your data a moment ago. Try again in 42 s.",
    );
  });

  it("an answer with nothing to save is a failure, not a download", async () => {
    const { user } = setup(async () => ({ ok: true }) as unknown as DataExportFile);
    await user.click(button());
    expect(await screen.findByRole("alert")).toHaveTextContent("The export failed. Please try again.");
    expect(clicks).toHaveLength(0);
    expect(screen.queryByText("Your download has started.")).not.toBeInTheDocument();
  });
});
