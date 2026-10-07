import { useEffect, type ReactNode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, useLocation, useNavigate, useNavigationType, type InitialEntry } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import {
  SETTINGS_FROM_LIST_STATE,
  resolveSettingsLocation,
  useSettingsRoute,
  type SettingsRoute,
  type UseSettingsRouteOptions,
} from "../use-settings-route";
import type { SettingsEntry, SettingsGroup } from "../settings-catalogue";

/**
 * The route rules of docs/settings-harmonization.md §3.1 and §10.1–§10.2: the canonical
 * path, aliases, unknown and hidden groups, the legacy hash on EVERY navigation with the
 * whole query carried, and the push/replace rule with the back marker.
 */

type G = "appearance" | "account" | "security" | "data" | "billing";

const GROUPS: SettingsGroup<G>[] = [
  { id: "appearance", icon: null, title: "Appearance", help: "Look" },
  { id: "account", icon: null, title: "Account", help: "You" },
  { id: "security", icon: null, title: "Security", help: "Locks" },
  { id: "data", icon: null, title: "Data", help: "Export" },
  { id: "billing", icon: null, title: "Billing", help: "Money", visible: false },
];

const ENTRIES: SettingsEntry<G>[] = [
  { id: "theme", group: "appearance", anchor: "theme-card", title: "Theme" },
  { id: "profile", group: "account", anchor: "profile-card", title: "Profile" },
  { id: "password", group: "security", anchor: "password-card", title: "Password" },
  { id: "export", group: "data", anchor: "export-card", title: "Export", visible: false },
  { id: "invoices", group: "billing", anchor: "invoices-card", title: "Invoices" },
];

type Probe = {
  location: ReturnType<typeof useLocation>;
  navigate: ReturnType<typeof useNavigate>;
  type: string;
  route: SettingsRoute<G>;
};
let probe: Probe | null = null;

function Page(props: Partial<UseSettingsRouteOptions<G>>) {
  const route = useSettingsRoute<G>({ groups: GROUPS, entries: ENTRIES, basePath: "/settings", ...props });
  const location = useLocation();
  const navigate = useNavigate();
  const type = useNavigationType();
  // In an effect, not during render: read after `act`, which flushes it.
  useEffect(() => {
    probe = { location, navigate, type, route };
  });
  return (
    <>
      {/* Links followed INSIDE the app, with the page staying mounted. */}
      <Link to="/settings?tour=t1&tourStep=3#security/codes">legacy link</Link>
      <Link to="/settings#account">plain legacy link</Link>
      <button type="button" onClick={() => route.select("security")}>
        open security
      </button>
      <button type="button" onClick={() => route.selectSub("codes")}>
        sub codes
      </button>
      <button type="button" onClick={() => route.back()}>
        back
      </button>
    </>
  );
}

function mount(initial: InitialEntry, props: Partial<UseSettingsRouteOptions<G>> = {}, extra?: ReactNode) {
  return render(
    <MemoryRouter initialEntries={["/before", initial]} initialIndex={1}>
      <Page {...props} />
      {extra}
    </MemoryRouter>,
  );
}

const path = () => `${probe!.location.pathname}${probe!.location.search}${probe!.location.hash}`;

afterEach(() => {
  probe = null;
});

describe("useSettingsRoute — the canonical path", () => {
  it("replaces /settings with the default group on a desktop", () => {
    mount("/settings");
    expect(path()).toBe("/settings/appearance");
    expect(probe!.type).toBe("REPLACE");
    expect(probe!.route.group).toBe("appearance");
  });

  it("takes defaultGroup over the first group", () => {
    mount("/settings", { defaultGroup: "security" });
    expect(path()).toBe("/settings/security");
  });

  it("leaves /settings alone on a phone: it is the list", () => {
    mount("/settings", { layout: "phone" });
    expect(path()).toBe("/settings");
    expect(probe!.route.group).toBeNull();
  });

  it("reads the group and the card's sub-segment from the path", () => {
    mount("/settings/security/codes");
    expect(probe!.route.group).toBe("security");
    expect(probe!.route.sub).toBe("codes");
    expect(probe!.route.redirecting).toBe(false);
  });

  it("sends /settings?focus=<anchor> to the anchor's group", () => {
    mount("/settings?focus=password-card", { layout: "phone" });
    expect(path()).toBe("/settings/security?focus=password-card");
    expect(probe!.route.focus).toBe("password-card");
  });
});

describe("useSettingsRoute — unknown, hidden and retired groups", () => {
  it("replaces an unknown group with the default on a desktop, keeping the query — never a 404", () => {
    mount("/settings/bogus?tour=t1");
    expect(path()).toBe("/settings/appearance?tour=t1");
    expect(probe!.type).toBe("REPLACE");
  });

  it("replaces an unknown group with the list on a phone", () => {
    mount("/settings/bogus?tour=t1", { layout: "phone" });
    expect(path()).toBe("/settings?tour=t1");
    expect(probe!.route.group).toBeNull();
  });

  it("treats a hidden group (visible: false) as unknown", () => {
    mount("/settings/billing");
    expect(path()).toBe("/settings/appearance");
    expect(probe!.route.groups.map((g) => g.id)).not.toContain("billing");
  });

  it("treats a group whose entries are all hidden as unknown", () => {
    mount("/settings/data", { layout: "phone" });
    expect(path()).toBe("/settings");
    expect(probe!.route.groups.map((g) => g.id)).toEqual(["appearance", "account", "security"]);
  });

  it("applies an alias with a replace, keeping sub, query and hash", () => {
    mount("/settings/overview/x?tour=t1#top", { aliases: { overview: "security" } });
    expect(path()).toBe("/settings/security/x?tour=t1#top");
    expect(probe!.type).toBe("REPLACE");
  });
});

describe("useSettingsRoute — the legacy hash (§10.1)", () => {
  it("converts /settings?<query>#group/sub on load, carrying the WHOLE query", () => {
    mount("/settings?tour=t1&tourStep=3&focus=password-card#security/codes");
    expect(path()).toBe("/settings/security/codes?tour=t1&tourStep=3&focus=password-card");
    expect(probe!.type).toBe("REPLACE");
  });

  it("converts a legacy link followed INSIDE the app, with the page still mounted", () => {
    mount("/settings/appearance");
    expect(path()).toBe("/settings/appearance");
    fireEvent.click(screen.getByText("legacy link"));
    expect(path()).toBe("/settings/security/codes?tour=t1&tourStep=3");
    fireEvent.click(screen.getByText("plain legacy link"));
    expect(path()).toBe("/settings/account");
  });

  it("resolves an aliased legacy hash in the same step", () => {
    mount("/settings#overview", { aliases: { overview: "account" } });
    expect(path()).toBe("/settings/account");
  });

  it("drops an unknown legacy group to the default", () => {
    mount("/settings?x=1#nothing-here");
    expect(path()).toBe("/settings/appearance?x=1");
  });

  it("leaves a hash on a group page alone: there it is an in-page anchor", () => {
    mount("/settings/account#profile");
    expect(path()).toBe("/settings/account#profile");
  });
});

describe("useSettingsRoute — history", () => {
  it("on a phone, opening a group from the list PUSHES and marks the list as the entry before", () => {
    mount("/settings", { layout: "phone" });
    fireEvent.click(screen.getByText("open security"));
    expect(path()).toBe("/settings/security");
    expect(probe!.type).toBe("PUSH");
    expect(probe!.location.state).toEqual({ [SETTINGS_FROM_LIST_STATE]: true });
    expect(probe!.route.fromList).toBe(true);

    // Back goes BACK — the list is the previous entry.
    fireEvent.click(screen.getByText("back"));
    expect(path()).toBe("/settings");
    expect(probe!.type).toBe("POP");
  });

  it("on a desktop, switching groups REPLACES and leaves the old group's query behind", () => {
    mount("/settings/appearance?focus=theme-card&filter=x");
    fireEvent.click(screen.getByText("open security"));
    expect(path()).toBe("/settings/security");
    expect(probe!.type).toBe("REPLACE");
    // Back leaves settings instead of walking through every group looked at.
    act(() => void probe!.navigate(-1));
    expect(path()).toBe("/before");
  });

  it("back from a deep link replaces with the list instead of leaving the app", () => {
    mount("/settings/security", { layout: "phone" });
    expect(probe!.route.fromList).toBe(false);
    fireEvent.click(screen.getByText("back"));
    expect(path()).toBe("/settings");
    expect(probe!.type).toBe("REPLACE");
    // The entry before is still the one before settings.
    act(() => void probe!.navigate(-1));
    expect(path()).toBe("/before");
  });

  it("selectSub replaces, keeping the query and the back marker", () => {
    mount("/settings", { layout: "phone" });
    fireEvent.click(screen.getByText("open security"));
    act(() => void probe!.navigate("/settings/security?tour=t1", { replace: true, state: probe!.location.state }));
    fireEvent.click(screen.getByText("sub codes"));
    expect(path()).toBe("/settings/security/codes?tour=t1");
    expect(probe!.type).toBe("REPLACE");
    expect(probe!.route.sub).toBe("codes");
    expect(probe!.route.fromList).toBe(true);
    fireEvent.click(screen.getByText("back"));
    expect(path()).toBe("/settings");
  });
});

describe("resolveSettingsLocation (pure)", () => {
  const rules = {
    basePath: "/admin/",
    groups: ["metrics", "users"] as const,
    defaultGroup: "metrics" as const,
    aliases: { overview: "metrics" as const },
    phone: false,
  };
  const at = (pathname: string, search = "", hash = "") =>
    resolveSettingsLocation<"metrics" | "users">({ pathname, search, hash }, { ...rules, groups: [...rules.groups] });

  it("is canonical for a known group", () => {
    expect(at("/admin/users")).toEqual({ group: "users", sub: null, redirect: null });
  });

  it("maps a retired id through its alias", () => {
    expect(at("/admin/overview", "?q=a")).toEqual({ group: "metrics", sub: null, redirect: "/admin/metrics?q=a" });
  });

  it("converts the legacy hash with the query in front of it", () => {
    expect(at("/admin", "?q=a&page=2", "#users")).toEqual({
      group: "users",
      sub: null,
      redirect: "/admin/users?q=a&page=2",
    });
  });

  it("leaves a path outside the base path alone", () => {
    expect(at("/elsewhere")).toEqual({ group: "metrics", sub: null, redirect: null });
  });
});
