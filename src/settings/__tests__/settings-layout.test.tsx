import { useEffect } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate, useNavigationType, type InitialEntry } from "react-router";
import { Database, KeyRound, Palette, User } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";
import { SettingsLayout, type SettingsLayoutProps } from "../settings-layout";
import { SettingsSection } from "../settings-section";
import { SettingsHeadingLevel } from "../settings-heading";
import { useSettingsLayout } from "../settings-context";
import { settingsSearchEntries, type SettingsEntry, type SettingsGroup } from "../settings-catalogue";
import { SETTINGS_FOCUS_RING } from "../use-settings-focus";
import { ListItem } from "../../components/list";
import { PasswordSetting, TwoFactorSetting } from "../../components/account-settings";

/**
 * SettingsLayout (docs/settings-harmonization.md §3.2–§3.5, §3.7): the search threshold
 * and its override, the desktop search's dimming and counts, `?focus=` removing only
 * itself, the phone's list and back, and the heading level the cards title themselves at.
 */

type G = "appearance" | "account" | "security" | "data";

const GROUPS: SettingsGroup<G>[] = [
  { id: "appearance", icon: <Palette />, title: "Appearance", help: "How it looks." },
  { id: "account", icon: <User />, title: "Account", help: "Who you are." },
  { id: "security", icon: <KeyRound />, title: "Security", help: "How you sign in." },
  { id: "data", icon: <Database />, title: "Data", help: "What you keep." },
];

/** Nine entries: one over the threshold. */
const ENTRIES: SettingsEntry<G>[] = [
  { id: "theme", group: "appearance", anchor: "theme-card", title: "Theme", keywords: "dark night" },
  { id: "language", group: "appearance", anchor: "language-card", title: "Language" },
  { id: "density", group: "appearance", anchor: "theme-card", title: "Density" },
  { id: "profile", group: "account", anchor: "profile-card", title: "Profile" },
  { id: "email", group: "account", anchor: "email-card", title: "Email address" },
  { id: "password", group: "security", anchor: "password-card", title: "Password", keywords: "passphrase" },
  { id: "twofactor", group: "security", anchor: "twofactor-card", title: "Two-factor authentication", keywords: "2fa totp" },
  { id: "export", group: "data", anchor: "export-card", title: "Export" },
  { id: "delete", group: "data", anchor: "delete-card", title: "Delete account" },
];

function SubPicker() {
  const layout = useSettingsLayout();
  return (
    <button type="button" onClick={() => layout?.selectSub("codes")}>
      pick codes ({layout?.sub ?? "none"})
    </button>
  );
}

function renderGroup(group: G) {
  switch (group) {
    case "appearance":
      return (
        <>
          <SettingsSection anchor="theme-card" title="Theme" description="Light, dark or the system's." />
          <SettingsSection anchor="language-card" title="Language" />
        </>
      );
    case "account":
      return (
        <>
          <SettingsSection anchor="profile-card" title="Profile" />
          <SettingsSection anchor="email-card" title="Email address" />
        </>
      );
    case "security":
      return (
        <>
          <PasswordSetting id="password-card" onSubmit={() => {}} />
          <TwoFactorSetting id="twofactor-card" enabled={false} setup={null} onStartSetup={() => {}} onEnable={() => {}} onDisable={() => {}} />
          <SubPicker />
        </>
      );
    case "data":
      return (
        <>
          <SettingsSection anchor="export-card" title="Export" />
          <SettingsSection anchor="delete-card" title="Delete account" tone="danger" />
        </>
      );
  }
}

type Probe = { location: ReturnType<typeof useLocation>; navigate: ReturnType<typeof useNavigate>; type: string };
let probe: Probe | null = null;
function Where() {
  const location = useLocation();
  const navigate = useNavigate();
  const type = useNavigationType();
  useEffect(() => {
    probe = { location, navigate, type };
  });
  return null;
}
const path = () => `${probe!.location.pathname}${probe!.location.search}`;

function mount(initial: InitialEntry, props: Partial<SettingsLayoutProps<G>> = {}) {
  return render(
    <MemoryRouter initialEntries={["/before", initial]} initialIndex={1}>
      <SettingsLayout<G>
        title="Settings"
        groups={GROUPS}
        entries={ENTRIES}
        basePath="/settings"
        renderGroup={renderGroup}
        {...props}
      />
      <Where />
    </MemoryRouter>,
  );
}

/** A phone: PHONE_QUERY matches. */
function mockPhone() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("max-width: 767px"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
}

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
  probe = null;
});

describe("SettingsLayout — when search shows (§3.4)", () => {
  it("shows the field once more than eight entries are visible", () => {
    mount("/settings/appearance");
    expect(screen.getByRole("searchbox", { name: "Search settings" })).toBeInTheDocument();
  });

  it("hides it at eight — hidden entries do not count", () => {
    const eight = ENTRIES.map((e, i) => (i === 0 ? { ...e, visible: false } : e));
    mount("/settings/appearance", { entries: eight });
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("lets an explicit `search` win over the count, both ways", () => {
    const { unmount } = mount("/settings/appearance", { search: false });
    expect(screen.queryByRole("searchbox")).toBeNull();
    unmount();
    mount("/settings/appearance", { entries: ENTRIES.slice(0, 2), search: true });
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });
});

describe("SettingsLayout — desktop (§3.2)", () => {
  it("is the page header, a vertical sidebar of links, and the group's heading over its cards", () => {
    mount("/settings/security");
    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
    const sidebar = screen.getByRole("tablist", { name: "Settings sections" });
    expect(sidebar).toHaveAttribute("aria-orientation", "vertical");
    expect(sidebar.className).toContain("md:sticky");
    const tab = within(sidebar).getByRole("tab", { name: "Account" });
    expect(tab).toHaveAttribute("href", "/settings/account");
    expect(within(sidebar).getByRole("tab", { name: "Security" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { level: 2, name: "Security" })).toBeInTheDocument();
    expect(screen.getByText("How you sign in.")).toBeInTheDocument();
  });

  it("switches groups in place from the sidebar, with a replace", () => {
    mount("/settings/security");
    fireEvent.click(screen.getByRole("tab", { name: "Data" }));
    expect(path()).toBe("/settings/data");
    expect(probe!.type).toBe("REPLACE");
    expect(screen.getByRole("heading", { level: 2, name: "Data" })).toBeInTheDocument();
  });

  it("hands cards selectSub through its context", () => {
    mount("/settings/security?tour=t1");
    fireEvent.click(screen.getByRole("button", { name: /pick codes \(none\)/ }));
    expect(path()).toBe("/settings/security/codes?tour=t1");
    expect(screen.getByRole("button", { name: /pick codes \(codes\)/ })).toBeInTheDocument();
  });
});

describe("SettingsLayout — the heading level (§3.7)", () => {
  it("titles the kit's cards and SettingsSection as h3 under the desktop's h2", () => {
    mount("/settings/security");
    expect(screen.getByRole("heading", { level: 3, name: "Change password" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Two-factor authentication" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Appearance" }));
    expect(screen.getByRole("heading", { level: 3, name: "Theme" })).toBeInTheDocument();
  });

  it("keeps the plain title outside a layout, and follows a SettingsHeadingLevel", () => {
    const { unmount } = render(<PasswordSetting onSubmit={() => {}} />);
    expect(screen.queryByRole("heading")).toBeNull();
    // The title, then the submit button of the same words.
    expect(screen.getAllByText("Change password")[0].tagName).toBe("DIV");
    unmount();
    render(
      <SettingsHeadingLevel level="h4">
        <PasswordSetting onSubmit={() => {}} />
      </SettingsHeadingLevel>,
    );
    expect(screen.getByRole("heading", { level: 4, name: "Change password" })).toBeInTheDocument();
  });

  it("keeps a hidden title for screen readers (titleVisible={false})", () => {
    render(
      <MemoryRouter initialEntries={["/settings/data"]}>
        <SettingsLayout<G>
          groups={GROUPS}
          entries={ENTRIES}
          basePath="/settings"
          renderGroup={() => <SettingsSection anchor="export-card" title="Export" titleVisible={false} />}
        />
      </MemoryRouter>,
    );
    const heading = screen.getByRole("heading", { level: 3, name: "Export" });
    expect(heading).toHaveClass("sr-only-fixed");
  });

  it("throws in development for a card with no catalogue entry", () => {
    expect(() =>
      render(
        <MemoryRouter initialEntries={["/settings/data"]}>
          <SettingsLayout<G>
            groups={GROUPS}
            entries={ENTRIES}
            basePath="/settings"
            renderGroup={() => <SettingsSection anchor="orphan-card" title="Orphan" />}
          />
        </MemoryRouter>,
      ),
    ).toThrow(/orphan-card.*no catalogue entry/);
  });
});

describe("SettingsLayout — search on a desktop (§3.4)", () => {
  it("lists the hits, dims the groups without any and counts the others'", () => {
    mount("/settings/appearance");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "passphrase" } });
    const results = screen.getByRole("list", { name: "Matching settings" });
    const hit = within(results).getByRole("link", { name: /Password/ });
    expect(hit).toHaveAttribute("href", "/settings/security?focus=password-card");
    // The group's name is the hit's trailing text.
    expect(within(results).getByText("Security")).toBeInTheDocument();
    // The counting badge is read as a count of matches, not a bare number.
    expect(screen.getByRole("tab", { name: /Security.*1 match/ })).toBeInTheDocument();
    const appearance = screen.getByRole("tab", { name: "Appearance" });
    expect(within(appearance).getByText("Appearance")).toHaveClass("opacity-40");
  });

  it("matches the group's name and folds accents", () => {
    mount("/settings/appearance");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "sécurity" } });
    const results = screen.getByRole("list", { name: "Matching settings" });
    expect(within(results).getAllByRole("link").map((a) => a.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining("Password"), expect.stringContaining("Two-factor")]),
    );
  });

  it("opens a hit: the group, the ring, focus on the card's heading, and `focus` gone again", () => {
    mount("/settings/appearance");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "passphrase" } });
    fireEvent.click(screen.getByRole("link", { name: /Password/ }));
    expect(path()).toBe("/settings/security");
    expect(screen.getByRole("searchbox")).toHaveValue("");
    const card = document.getElementById("password-card")!;
    expect(card).toHaveClass(...SETTINGS_FOCUS_RING);
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 3, name: "Change password" }));
  });

  it("says when nothing matches, and clears from there", () => {
    mount("/settings/appearance");
    const field = screen.getByRole("searchbox");
    fireEvent.change(field, { target: { value: "zzz" } });
    expect(screen.getByText("No settings match “zzz”.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(field).toHaveValue("");
    expect(document.activeElement).toBe(field);
    expect(screen.getByRole("heading", { level: 2, name: "Appearance" })).toBeInTheDocument();
  });
});

describe("SettingsLayout — ?focus= (§3.5)", () => {
  it("rings the card, focuses its heading and removes ONLY `focus`", async () => {
    mount("/settings/security?tour=t1&focus=twofactor-card&tourStep=2");
    const card = document.getElementById("twofactor-card")!;
    expect(card).toHaveClass("ring-2");
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 3, name: "Two-factor authentication" }));
    expect(path()).toBe("/settings/security?tour=t1&tourStep=2");
    expect(probe!.type).toBe("REPLACE");
    // 1.8 s later the ring is gone.
    await waitFor(() => expect(card).not.toHaveClass("ring-2"), { timeout: 3000 });
  });

  it("finds the anchor's group from /settings?focus=", () => {
    mount("/settings?focus=export-card&tour=t1");
    expect(path()).toBe("/settings/data?tour=t1");
    expect(document.getElementById("export-card")).toHaveClass("ring-2");
  });
});

describe("SettingsLayout — phone (§3.3)", () => {
  it("is a list of the groups on /settings, with the footer rows under it", () => {
    mockPhone();
    mount("/settings", { phoneFooter: <ListItem href="/admin" title="Administration" /> });
    expect(path()).toBe("/settings");
    expect(screen.queryByRole("tablist")).toBeNull();
    const list = screen.getByRole("list", { name: "Settings sections" });
    const rows = within(list).getAllByRole("link");
    expect(rows.map((r) => r.getAttribute("href"))).toEqual([
      "/settings/appearance",
      "/settings/account",
      "/settings/security",
      "/settings/data",
    ]);
    expect(within(rows[2]).getByText("How you sign in.")).toBeInTheDocument();
    // The footer row leaves settings, in a list of its own.
    const admin = screen.getByRole("link", { name: "Administration" });
    expect(list).not.toContainElement(admin);
  });

  it("opens a group as a page of its own (a push) and goes back to the list", () => {
    mockPhone();
    mount("/settings");
    fireEvent.click(screen.getByRole("link", { name: /Security/ }));
    expect(path()).toBe("/settings/security");
    expect(probe!.type).toBe("PUSH");
    expect(screen.getByRole("heading", { level: 1, name: "Security" })).toBeInTheDocument();
    // On a phone the cards sit under the page's h1, as h2.
    expect(screen.getByRole("heading", { level: 2, name: "Change password" })).toBeInTheDocument();

    const back = screen.getByRole("link", { name: "Back to settings" });
    expect(back).toHaveAttribute("href", "/settings");
    expect(back).toHaveTextContent("Settings");
    fireEvent.click(back);
    expect(path()).toBe("/settings");
    expect(probe!.type).toBe("POP");
    expect(screen.getByRole("list", { name: "Settings sections" })).toBeInTheDocument();
  });

  it("goes back to the list with a replace after a deep link", () => {
    mockPhone();
    mount("/settings/account");
    fireEvent.click(screen.getByRole("link", { name: "Back to settings" }));
    expect(path()).toBe("/settings");
    expect(probe!.type).toBe("REPLACE");
    act(() => void probe!.navigate(-1));
    expect(path()).toBe("/before");
  });

  it("replaces the list with the hits while searching", () => {
    mount("/settings", { layout: "phone", phoneFooter: <ListItem href="/admin" title="Administration" /> });
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "theme" } });
    expect(screen.queryByRole("list", { name: "Settings sections" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Administration" })).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: /Theme/ }));
    // Pushed with the list marked; the replace that then removes `focus` carries the
    // marker, so back is still a real back.
    expect(path()).toBe("/settings/appearance");
    fireEvent.click(screen.getByRole("link", { name: "Back to settings" }));
    expect(path()).toBe("/settings");
    expect(probe!.type).toBe("POP");
  });
});

describe("settingsSearchEntries (⌘K)", () => {
  it("builds GlobalSearch entries that link to the card, under the group's name", () => {
    const entries = settingsSearchEntries(GROUPS, ENTRIES, { basePath: "/settings/" });
    const password = entries.find((e) => e.id === "settings:password")!;
    expect(password).toMatchObject({
      title: "Password",
      group: "Security",
      href: "/settings/security?focus=password-card",
    });
    expect(password.keywords).toEqual(["Security", "passphrase"]);
  });

  it("leaves out hidden entries and the groups they empty", () => {
    const entries = settingsSearchEntries(
      GROUPS,
      ENTRIES.map((e) => (e.group === "data" ? { ...e, visible: false } : e)),
      { basePath: "/admin" },
    );
    expect(entries.some((e) => e.group === "Data")).toBe(false);
    expect(entries[0].id).toBe("admin:theme");
  });
});
