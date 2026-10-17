import { render, screen, within } from "@testing-library/react";
import { BarChart3, Languages, Upload, UsersRound } from "lucide-react";
import { describe, expect, it } from "vitest";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { ADMIN_SECTIONS, adminSections } from "../admin-sections";
import { AdminForbidden } from "../admin-forbidden";
import { AdminOverview, AttentionTile, adminWaitingCount, type AdminAttention } from "../admin-overview";
import { AdminToolLinks } from "../admin-tool-links";
import { DEFAULT_ADMIN_AREA_LABELS } from "../admin-area-labels";

/**
 * 0.42.0 (docs/admin-harmonization.md §2–§7): the admin area's template — the shared
 * sections and the catalogue helper, the 403 page, the overview and the Tools list.
 */

const ids = (groups: { id: string }[]) => groups.map((g) => g.id);

describe("ADMIN_SECTIONS", () => {
  it("lists the five shared sections in the template's order", () => {
    expect(ADMIN_SECTIONS.map((s) => s.id)).toEqual(["overview", "users", "invitations", "billing", "activity"]);
  });
});

describe("adminSections", () => {
  it("gives the shared sections the kit's words and icons", () => {
    const groups = adminSections(undefined);
    expect(groups.map((g) => [g.id, g.title, g.help])).toEqual([
      ["overview", "Overview", "What is waiting, at a glance."],
      ["users", "Users", "Who has an account, and what each may do."],
      ["invitations", "Invitations", "The links that let a new person in."],
      ["billing", "Billing", "The plan, the payment and the invoices."],
      ["activity", "Activity", "What the admins did, newest first."],
    ]);
    render(<>{groups[0].icon}</>);
    expect(document.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    // No `visible` unless asked: the layout's default (shown) holds.
    expect(groups.every((g) => !("visible" in g))).toBe(true);
  });

  it("puts an app's own sections between Invitations and Billing by default (§2.3)", () => {
    const groups = adminSections(undefined, [
      { id: "company", icon: null, title: "Company", help: "…" },
      { id: "teams", icon: null, title: "Teams", help: "…" },
    ]);
    expect(ids(groups)).toEqual(["overview", "users", "invitations", "company", "teams", "billing", "activity"]);
    expect(groups.find((g) => g.id === "company")).not.toHaveProperty("after");
  });

  it("places a section where it names (§6.8): keksdose's metrics after the overview, health after billing", () => {
    const groups = adminSections(
      undefined,
      [
        { id: "metrics", icon: <BarChart3 />, title: "Metrics", help: "…", after: "overview" },
        { id: "messaging", icon: null, title: "Messaging", help: "…" },
        { id: "health", icon: null, title: "Health", help: "…", after: "billing" },
        { id: "scheduler", icon: null, title: "Scheduler", help: "…", after: "health" },
        { id: "system", icon: null, title: "System", help: "…", after: "scheduler" },
      ],
      // A left-out section's followers keep its place.
      { leaveOut: ["billing"] },
    );
    expect(ids(groups)).toEqual([
      "overview",
      "metrics",
      "users",
      "invitations",
      "messaging",
      "health",
      "scheduler",
      "system",
      "activity",
    ]);
  });

  it("Kurvenschmiede's Teams sits between Invitations and Activity", () => {
    const groups = adminSections(undefined, [{ id: "teams", icon: <UsersRound />, title: "Teams", help: "…" }], {
      leaveOut: ["billing"],
    });
    expect(ids(groups)).toEqual(["overview", "users", "invitations", "teams", "activity"]);
  });

  it("hides a shared section that is off: kastlan's billing", () => {
    const off = adminSections(undefined, [], { visible: { billing: false } });
    expect(off.find((g) => g.id === "billing")?.visible).toBe(false);
    const on = adminSections(undefined, [], { visible: { billing: true } });
    expect(on.find((g) => g.id === "billing")?.visible).toBe(true);
  });

  it("speaks the language it is handed", () => {
    const groups = adminSections(UI_KIT_LABELS_DE_CH.adminArea);
    expect(groups.map((g) => g.title)).toEqual(["Übersicht", "Benutzer", "Einladungen", "Abrechnung", "Aktivität"]);
  });

  it("refuses a catalogue it cannot build", () => {
    expect(() => adminSections(undefined, [{ id: "users" as never, icon: null, title: "x", help: "" }])).toThrow(
      /shared section/,
    );
    expect(() =>
      adminSections(undefined, [
        { id: "a", icon: null, title: "A", help: "" },
        { id: "a", icon: null, title: "A", help: "" },
      ]),
    ).toThrow(/twice/);
    expect(() =>
      adminSections(undefined, [{ id: "a", icon: null, title: "A", help: "", after: "nowhere" as never }]),
    ).toThrow(/no section/);
    expect(() =>
      adminSections<"a" | "b">(undefined, [
        { id: "a", icon: null, title: "A", help: "", after: "b" },
        { id: "b", icon: null, title: "B", help: "", after: "a" },
      ]),
    ).toThrow(/circle/);
  });
});

describe("AdminForbidden", () => {
  it("says the area is only for administrators, in keksdose's words, with the way home", () => {
    render(<AdminForbidden appName="Keksdose" homeHref="/budget" homeLabel="Back to the budget" />);
    expect(screen.getByRole("heading", { level: 1, name: "Only for administrators" })).toBeInTheDocument();
    expect(
      screen.getByText("This is where administrators run Keksdose. Your account cannot open this page."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the budget" })).toHaveAttribute("href", "/budget");
    expect(screen.queryByRole("link", { name: "Review translations" })).toBeNull();
  });

  it("offers a reviewer the translations, and the kit's home words by default", () => {
    render(<AdminForbidden appName="Kastlan" homeHref="/dashboard" reviewerHref="/translations" headingAs="h2" />);
    expect(screen.getByRole("heading", { level: 2, name: "Only for administrators" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to the start page" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Review translations" })).toHaveAttribute("href", "/translations");
  });

  it("speaks Swiss German, formally, with ss", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <AdminForbidden appName="Kastlan" homeHref="/" />
      </UiKitProvider>,
    );
    expect(screen.getByRole("heading", { name: "Nur mit Administratorrechten" })).toBeInTheDocument();
    expect(screen.getByText("Hier wird Kastlan verwaltet. Ihr Konto kann diese Seite nicht öffnen.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/ß/);
  });
});

const ATTENTION: AdminAttention = {
  feedback_waiting: 4,
  deletion_requests: 1,
  invitations_pending: 0,
  users_total: 42,
  users_new_7d: 3,
  extra: { support_waiting: 2, awaiting_verdict: null },
};

const tiles = () =>
  [...document.querySelectorAll<HTMLElement>("[data-attention]")].map((t) => t.getAttribute("data-attention"));

describe("AdminOverview", () => {
  it("shows the shared tiles in order, each a link to where the work is", () => {
    render(<AdminOverview attention={ATTENTION} hrefs={{ feedback_waiting: "/feedback?status=OPEN" }} />);
    expect(tiles()).toEqual(["feedback_waiting", "deletion_requests", "invitations_pending", "users_total"]);
    expect(screen.getByRole("link", { name: /To triage/ })).toHaveAttribute("href", "/feedback?status=OPEN");
    expect(screen.getByRole("link", { name: /Deletion requests/ })).toHaveAttribute(
      "href",
      "/admin/users?state=deletion_requested",
    );
    expect(screen.getByRole("link", { name: /Pending invitations/ })).toHaveAttribute("href", "/admin/invitations");
    expect(screen.getByRole("link", { name: /Users/ })).toHaveAttribute("href", "/admin/users");
    // A 0 is a quiet tile, not a missing one; the users tile carries the week's new ones.
    expect(screen.getByText("3 new in 7 days")).toBeInTheDocument();
  });

  it("leaves out every null count, and adds the app's own tiles after the shared ones", () => {
    render(
      <AdminOverview
        attention={{ ...ATTENTION, deletion_requests: null, users_new_7d: null }}
        extraTiles={[
          { key: "support_waiting", label: "Support waiting", count: ATTENTION.extra.support_waiting, href: "/admin/messaging" },
          { key: "awaiting_verdict", label: "Awaiting your verdict", count: ATTENTION.extra.awaiting_verdict, href: "/feedback" },
        ]}
      />,
    );
    expect(tiles()).toEqual(["feedback_waiting", "invitations_pending", "users_total", "support_waiting"]);
    expect(screen.getByRole("link", { name: /Support waiting/ })).toHaveAttribute("href", "/admin/messaging");
    expect(screen.queryByText(/new in 7 days/)).toBeNull();
  });

  it("shows its skeletons while the answer loads, and nothing when every count is null", () => {
    const { container, rerender } = render(<AdminOverview attention={undefined} />);
    expect(container.querySelector("[aria-busy='true']")).not.toBeNull();
    rerender(
      <AdminOverview
        attention={{
          feedback_waiting: null,
          deletion_requests: null,
          invitations_pending: null,
          users_total: null,
          users_new_7d: null,
          extra: {},
        }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("speaks the provider's language", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <AdminOverview attention={ATTENTION} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("link", { name: /Zu sichten/ })).toBeInTheDocument();
    expect(screen.getByText("3 neu in 7 Tagen")).toBeInTheDocument();
  });
});

describe("AttentionTile", () => {
  it("is a StatTile that links, its count the headline", () => {
    render(<AttentionTile label="Jobs failing" count={2} href="/admin/health" />);
    const link = screen.getByRole("link", { name: /Jobs failing/ });
    expect(link).toHaveAttribute("href", "/admin/health");
    expect(link.closest("[data-slot='attention-tile']")).toHaveTextContent("2");
  });
});

describe("adminWaitingCount", () => {
  it("sums the counts the app names, shared or extra, skipping nulls (§6.3)", () => {
    expect(adminWaitingCount(ATTENTION, ["feedback_waiting", "support_waiting", "awaiting_verdict"])).toBe(6);
    expect(adminWaitingCount(ATTENTION, ["feedback_waiting", "deletion_requests"])).toBe(5);
    expect(adminWaitingCount({ ...ATTENTION, feedback_waiting: null }, ["feedback_waiting"])).toBe(0);
    expect(adminWaitingCount(ATTENTION, ["nothing"])).toBe(0);
  });

  it("is null while there is no answer, so the badge shows nothing", () => {
    expect(adminWaitingCount(undefined, ["feedback_waiting"])).toBeNull();
    expect(adminWaitingCount(null, ["feedback_waiting"])).toBeNull();
  });
});

const TOOLS = [
  { key: "translations", label: "Translations", href: "/translations", icon: <Languages /> },
  { key: "import", label: "Data import", href: "/import", icon: <Upload /> },
];

describe("AdminToolLinks", () => {
  it("is a nav named and headed Tools for the sidebar foot, without the feedback inbox", () => {
    render(<AdminToolLinks links={TOOLS} />);
    const nav = screen.getByRole("navigation", { name: DEFAULT_ADMIN_AREA_LABELS.tools });
    expect(within(nav).getByText("Tools")).toBeInTheDocument();
    expect(within(nav).getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Translations", "/translations"],
      ["Data import", "/import"],
    ]);
  });

  it("is bare rows for the phone footer's list", () => {
    render(
      <ul>
        <AdminToolLinks links={TOOLS} variant="list" />
      </ul>,
    );
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("leaves out a link that is not visible, and renders nothing for none", () => {
    const { container, rerender } = render(<AdminToolLinks links={[{ ...TOOLS[0], visible: false }, TOOLS[1]]} />);
    expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["Data import"]);
    rerender(<AdminToolLinks links={[{ ...TOOLS[0], visible: false }]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
