import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { parseChangelog } from "../../lib/changelog";
import { ReleaseNotes } from "../release-notes";

/**
 * 0.55: the release card keksdose (release-notes.tsx) and kastlan (changelog-page.tsx)
 * each drew, on the kit's parser. The lines below are the generator's own shapes: a
 * compare link before the date, `**scope:**`, the commit link, the trailing references.
 */
const CHANGELOG = `# Changelog

## [0.13.9](https://github.com/Eifi1/kastlan/compare/v0.13.8...v0.13.9) (2026-10-20)

### Features

* **accounts:** a Depot is worth its positions ([3c1eb85](https://github.com/x/commit/3c1eb85)), closes [#455](https://github.com/x/issues/455)
* **accounts:** buying one moves the money ([4d2fa96](https://github.com/x/commit/4d2fa96))
* **reports:** a year at a glance ([5e3ab07](https://github.com/x/commit/5e3ab07))

### Bug Fixes

* **admin:** a company rename logs both names again ([8f698eb](https://github.com/x/commit/8f698eb))
* **admin:** a company rename logs both names again ([9a7b0c1](https://github.com/x/commit/9a7b0c1))

### Known issues

* the export is slow on large books

### Reverts

* [#12](https://github.com/x/issues/12)
`;

const [release] = parseChangelog(CHANGELOG);

describe("ReleaseNotes (0.55)", () => {
  it("card: the version as its title, the day at its end, written the app's way", () => {
    render(<ReleaseNotes release={release} />);
    expect(screen.getByRole("heading", { level: 2, name: "v0.13.9" })).toBeInTheDocument();
    const time = document.querySelector("time")!;
    expect(time).toHaveAttribute("dateTime", "2026-10-20");
    // The kit's medium date, not the raw heading's "2026-10-20".
    expect(time.textContent).not.toBe("2026-10-20");
    expect(time.textContent).toMatch(/2026/);
  });

  it("names a section by its key, whichever preset wrote it, and keeps an unknown heading as written", () => {
    render(<ReleaseNotes release={release} />);
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    // "Features" is `added` ("New"), "Bug Fixes" `fixed`; "Known issues" has no key; the
    // Reverts section held a bare reference only and is left out.
    expect(headings).toEqual(["New", "Fixed", "Known issues"]);
  });

  it("groups the notes by scope: one note beside its chip, several in a list, repeats once", () => {
    const { container } = render(<ReleaseNotes release={release} />);
    const accounts = container.querySelector('[data-scope="accounts"]') as HTMLElement;
    expect(
      within(accounts)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["a Depot is worth its positions", "buying one moves the money"]);
    const reports = container.querySelector('[data-scope="reports"]') as HTMLElement;
    expect(within(reports).queryByRole("list")).toBeNull();
    expect(reports).toHaveTextContent("reportsa year at a glance");
    // The same sentence twice (two commits) is one note.
    const admin = container.querySelector('[data-scope="admin"]') as HTMLElement;
    expect(admin).toHaveTextContent(/^admina company rename logs both names again$/);
    // No commit link, no reference left in the text.
    expect(container.textContent).not.toMatch(/3c1eb85|#455|closes/);
  });

  it("plain: the same parts without the card, for a dialog", () => {
    const { container } = render(<ReleaseNotes release={release} frame="plain" />);
    expect(container.querySelector('[data-slot="card-header"]')).toBeNull();
    expect(screen.getByRole("heading", { level: 3, name: "v0.13.9" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(3);
  });

  it("takes a backend's raw bullets and its own heading level and date", () => {
    render(
      <ReleaseNotes
        headingAs="h3"
        formatDate={(date) => `on ${date}`}
        release={{
          version: "0.4.72",
          date: "2026-09-02",
          sections: [{ title: "Performance", items: ["**sync:** a budget opens without a wait"] }],
        }}
      />,
    );
    expect(screen.getByRole("heading", { level: 3, name: "v0.4.72" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "Changed" })).toBeInTheDocument();
    expect(screen.getByText("on 2026-09-02")).toBeInTheDocument();
    expect(screen.getByText("a budget opens without a wait")).toBeInTheDocument();
  });

  it("shows a hand-written release's prose when it has no section", () => {
    const [handWritten] = parseChangelog("## [0.2.0] - 2026-04-10\n\nThe first release.\nTwo lines.\n");
    render(<ReleaseNotes release={handWritten} />);
    expect(screen.getByText(/The first release\.\s+Two lines\./)).toBeInTheDocument();
  });

  it("speaks the provider's language, and takes the app's words over the kit's", () => {
    const { rerender } = render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <ReleaseNotes release={release} />
      </UiKitProvider>,
    );
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Neu",
      "Behoben",
      "Known issues",
    ]);
    rerender(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <ReleaseNotes
          release={release}
          labels={{ sections: { fixed: "Korrigiert" }, version: (v) => `Version ${v}` }}
        />
      </UiKitProvider>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Version 0.13.9" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Korrigiert" })).toBeInTheDocument();
  });
});
