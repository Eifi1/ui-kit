import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import type { UiKitLabels } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH, uiKitLabelsDeCh } from "../../i18n/locales/de-CH";
import { uiKitLabelsEn } from "../../i18n/locales/en";
import { uiKitLabelsEs } from "../../i18n/locales/es";
import { uiKitLabelsFr } from "../../i18n/locales/fr";
import { uiKitLabelsHu } from "../../i18n/locales/hu";
import { uiKitLabelsIt } from "../../i18n/locales/it";
import { uiKitLabelsZh } from "../../i18n/locales/zh";
import { setToday } from "../../lib/dates";
import { LegalChangeNotice } from "../legal-change-notice";
import type { LegalChangeAnnouncement } from "../legal-change-notice";

/**
 * The in-app notice of an announced change (0.58; keksdose's legal audit against the app,
 * Marcel 2026-11-09, docs/legal-harmonization.md decision 10 and §3.5). The terms promise a
 * material change 30 days ahead "by email and in the app": server-kit's mail is the email,
 * this banner is the app — one per announcement of `GET /api/v1/legal/changes`, until its
 * effective date has passed, dismissable per (page, effective), never in the way.
 */

const TERMS: LegalChangeAnnouncement = { page: "terms", effective: "2026-12-09" };
const PRIVACY: LegalChangeAnnouncement = { page: "privacy", effective: "2026-12-15", href: "/privacy?v=2026-12-15" };

const banners = () => [...document.querySelectorAll("[data-legal-change]")];

/** The kit's English, with the date written out the British way: "9 December 2026". */
function notice(announcements: unknown, props: { storageKey?: string } = {}) {
  return (
    <UiKitProvider locale="en-GB">
      <LegalChangeNotice announcements={announcements as LegalChangeAnnouncement[]} {...props} />
    </UiKitProvider>
  );
}

beforeEach(() => {
  setToday("2026-11-09");
  window.localStorage.clear();
});

afterEach(() => {
  setToday(null);
  vi.restoreAllMocks();
});

describe("LegalChangeNotice (0.58)", () => {
  it("shows one banner per announcement, soonest first, with the date and a link to the new text", () => {
    render(notice([PRIVACY, TERMS]));
    const [terms, privacy] = banners();
    expect(banners()).toHaveLength(2);
    expect(terms).toHaveAttribute("data-legal-change", "terms");
    expect(terms).toHaveTextContent("Our Terms of Service change on 9 December 2026. Read the new text");
    // Default href: the page's own route.
    expect(within(terms as HTMLElement).getByRole("link", { name: "Read the new text" })).toHaveAttribute(
      "href",
      "/terms",
    );
    // The verb agrees with the page's name.
    expect(privacy).toHaveTextContent("Our Privacy Policy changes on 15 December 2026.");
    expect(within(privacy as HTMLElement).getByRole("link", { name: "Read the new text" })).toHaveAttribute(
      "href",
      "/privacy?v=2026-12-15",
    );
  });

  it("puts the terms first on one day", () => {
    render(notice([{ page: "privacy", effective: "2026-12-09" }, TERMS]));
    expect(banners().map((b) => b.getAttribute("data-legal-change"))).toEqual(["terms", "privacy"]);
  });

  it("stays up to its effective date, that day included, and is gone the day after", () => {
    const { rerender } = render(notice([TERMS]));
    expect(banners()).toHaveLength(1);
    act(() => setToday("2026-12-09"));
    rerender(notice([TERMS]));
    expect(banners()).toHaveLength(1);
    act(() => setToday("2026-12-10"));
    rerender(notice([TERMS]));
    expect(banners()).toHaveLength(0);
  });

  it("follows the dev clock without a rerender of its own", () => {
    render(notice([TERMS]));
    expect(banners()).toHaveLength(1);
    act(() => setToday("2026-12-10"));
    expect(banners()).toHaveLength(0);
  });

  it("dismisses per (page, effective), remembered on this device; a later announcement shows again", () => {
    const { unmount } = render(notice([TERMS, PRIVACY]));
    fireEvent.click(within(banners()[0] as HTMLElement).getByRole("button", { name: "Dismiss" }));
    expect(banners().map((b) => b.getAttribute("data-legal-change"))).toEqual(["privacy"]);
    expect(window.localStorage.getItem("kit.legalChange.dismissed.terms.2026-12-09")).toBe("1");
    unmount();
    // Remembered across a reload.
    const { unmount: unmountAgain } = render(notice([TERMS, PRIVACY]));
    expect(banners().map((b) => b.getAttribute("data-legal-change"))).toEqual(["privacy"]);
    unmountAgain();
    // The next change to the same page is news again.
    render(notice([TERMS, { page: "terms", effective: "2027-01-20" }]));
    expect(banners()).toHaveLength(1);
    expect(banners()[0]).toHaveTextContent("20 January 2027");
  });

  it("keeps its dismissals under the app's storageKey", () => {
    render(notice([TERMS], { storageKey: "kk.legalChange" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(window.localStorage.getItem("kk.legalChange.terms.2026-12-09")).toBe("1");
    expect(window.localStorage.getItem("kit.legalChange.dismissed.terms.2026-12-09")).toBeNull();
  });

  it("hides on × where the browser refuses storage, and does not throw", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    render(notice([TERMS]));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(banners()).toHaveLength(0);
  });

  it("never blocks the app: no dialog, no alert, no focus taken", () => {
    const before = document.createElement("button");
    document.body.append(before);
    before.focus();
    render(notice([TERMS, PRIVACY]));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(document.activeElement).toBe(before);
    before.remove();
  });

  it("renders nothing for nothing: loading, an empty list, a bad answer", () => {
    for (const answer of [undefined, null, [], {}, "oops", [TERMS].map((a) => ({ ...a, effective: "2026-11-08" }))]) {
      const { container, unmount } = render(notice(answer));
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  it("leaves out an entry that is not an announcement, and shows the rest", () => {
    render(
      notice([
        { page: "impressum", effective: "2026-12-09" },
        { page: "terms", effective: "2026-12-9" },
        { page: "terms", effective: "2026-02-30" },
        { page: "terms" },
        null,
        42,
        // A Python model may write the absent href out as null: the page's route then.
        { page: "privacy", effective: "2026-12-15", href: null },
        // The same announcement twice: one banner.
        { page: "privacy", effective: "2026-12-15" },
      ]),
    );
    expect(banners()).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Read the new text" })).toHaveAttribute("href", "/privacy");
  });

  it("speaks the provider's language and writes its date", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH} locale="de-CH">
        <LegalChangeNotice announcements={[TERMS, PRIVACY]} />
      </UiKitProvider>,
    );
    const [terms, privacy] = banners();
    expect(terms).toHaveTextContent("Unsere Nutzungsbedingungen ändern sich am 9. Dezember 2026. Neuen Text lesen");
    expect(privacy).toHaveTextContent("Unsere Datenschutzerklärung ändert sich am 15. Dezember 2026.");
  });

  it("writes the date under the app's date preference, as the legal pages' as-of line does", () => {
    const formatDate = vi.fn((iso: string) => `«${iso}»`);
    render(
      <UiKitProvider locale="de-CH" formatDate={formatDate}>
        <LegalChangeNotice announcements={[TERMS]} />
      </UiKitProvider>,
    );
    expect(banners()[0]).toHaveTextContent("Our Terms of Service change on «2026-12-09».");
  });
});

describe("the notice's words in every catalogue (0.58)", () => {
  const CATALOGUES: Record<string, () => UiKitLabels> = {
    en: () => uiKitLabelsEn(),
    "de-CH": () => uiKitLabelsDeCh(),
    fr: () => uiKitLabelsFr(),
    it: () => uiKitLabelsIt(),
    es: () => uiKitLabelsEs(),
    hu: () => uiKitLabelsHu(),
    zh: () => uiKitLabelsZh(),
  };

  it.each(Object.entries(CATALOGUES))("%s: a sentence per page with the date in it, and the link", (_code, make) => {
    const words = make().legal.changeNotice!;
    expect(words.terms("«date»")).toContain("«date»");
    expect(words.privacy("«date»")).toContain("«date»");
    expect(words.terms("«date»")).not.toBe(words.privacy("«date»"));
    expect(words.read.length).toBeGreaterThan(0);
  });
});
