import { useState } from "react";
import type { ReactNode } from "react";
import { MemoryRouter, UNSAFE_LocationContext } from "react-router";
import {
  Languages,
  Mail,
  Settings,
  ShieldCheck,
  Sprout,
  Upload,
} from "lucide-react";
import {
  ADMIN_SECTIONS,
  AccountRoleChip,
  AdminForbidden,
  AdminOverview,
  AdminToolLinks,
  AttentionTile,
  SettingsLayout,
  SettingsSection,
  Switch,
  ToggleGroup,
  TopBarActionMenu,
  adminSectionOrder,
  adminSections,
  adminWaitingCount,
  useAdminAreaLabels,
  useAdminMenuEntry,
} from "@eifi1/ui-kit";
import type {
  AdminAttention,
  AdminSharedSection,
  AdminToolLink,
  RoleVocabulary,
} from "@eifi1/ui-kit";
import { Example, Note, code, NO_ROUTER } from "../lib/section";

/**
 * THE ADMIN AREA'S TEMPLATE (0.42, docs/admin-harmonization.md): the way in (the account
 * menu's "Administration" row with its waiting count, the role chip as a shortcut), the
 * shared sections in the template's order with an app's own between them, the overview
 * of what is waiting, the Tools list and the 403 page — for a made-up app, "Ada's Garden
 * Planner". On the "User administration" page. Nothing is sent; the counts are a pretend
 * `GET /admin/attention`, the people synthetic. Each frame has its own router, so its
 * links move the frame and not this page.
 */

/** The pretend answer — Ada's planner has no deletion requests to act on (`null`). */
const ATTENTION: AdminAttention = {
  feedback_waiting: 4,
  deletion_requests: null,
  invitations_pending: 2,
  users_total: 37,
  users_new_7d: 3,
  extra: { seeds_waiting: 5 },
};

/** The badge: only work that waits on this admin (§6.3). */
const WAITING = adminWaitingCount(ATTENTION, [
  "feedback_waiting",
  "seeds_waiting",
]);

type Role = "ADMIN" | "REVIEWER" | "MEMBER";
const ROLES: RoleVocabulary<Role> = {
  ADMIN: { label: "Admin", tone: "brand", icon: ShieldCheck, href: "/admin" },
  REVIEWER: {
    label: "Reviewer",
    tone: "info",
    icon: Languages,
    href: "/translations",
  },
  MEMBER: { label: "Member", tone: "neutral" },
};

const TOOLS: AdminToolLink[] = [
  {
    key: "translations",
    label: "Translations",
    href: "/translations",
    icon: <Languages />,
  },
  { key: "import", label: "Seed import", href: "/import", icon: <Upload /> },
];

/** A router of its own, so the frame's links stay in the frame. */
function Frame({
  initial,
  className,
  children,
}: {
  initial: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`overflow-hidden rounded-md border border-subtle bg-page ${className ?? ""}`}
    >
      <UNSAFE_LocationContext.Provider value={NO_ROUTER}>
        <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
      </UNSAFE_LocationContext.Provider>
    </div>
  );
}

/* ── The way in ─────────────────────────────────────────────────────────── */

export function AdminWayIn042Demo() {
  const [role, setRole] = useState<Role>("ADMIN");
  // 0.43: adminMenuEntry with the provider's words read for it.
  const admin = useAdminMenuEntry({ badge: WAITING });
  return (
    <Example
      label="The way in — useAdminMenuEntry, AccountRoleChip"
      hint="the Administration row with its waiting count; the role chip as a shortcut"
    >
      <ToggleGroup<Role>
        aria-label="Signed in as"
        value={role}
        onChange={setRole}
        options={[
          { value: "ADMIN", label: "Admin" },
          { value: "REVIEWER", label: "Reviewer" },
          { value: "MEMBER", label: "Member" },
        ]}
      />
      <Frame initial="/" className="mt-3 flex justify-end p-2">
        <TopBarActionMenu
          icon={<Settings className="size-5" aria-hidden />}
          aria-label="Account menu"
          header={{
            title: "Ada Example",
            subtitle: "ada@example.com",
            extra: (close) => (
              <AccountRoleChip value={role} roles={ROLES} onNavigate={close} />
            ),
          }}
          entries={[
            {
              kind: "link",
              key: "settings",
              to: "/settings",
              icon: <Settings className="size-4" aria-hidden />,
              label: "Settings",
            },
            ...(role === "ADMIN" ? [admin] : []),
            ...(role !== "MEMBER"
              ? [
                  {
                    kind: "link" as const,
                    key: "translations",
                    to: "/translations",
                    icon: <Languages className="size-4" aria-hidden />,
                    label: "Translations",
                  },
                ]
              : []),
          ]}
        />
      </Frame>
      <Note>
        Every account shows its role; a role whose vocabulary names an{" "}
        {code("href")} links there and closes the menu on the way. The row is
        for an admin only, and its badge is {code("adminWaitingCount")} over the
        counts that wait on this admin — here To triage and the app's own seeds,
        never invitations or users. A menu built from {code("HoverMenu")}{" "}
        children takes {code("AdminMenuRow")}, the same row.{" "}
        {code("useAdminMenuEntry")} (0.43) is{" "}
        {code("adminMenuEntry({ labels: useAdminAreaLabels() })")}: the plain
        function reads no provider, so without {code("labels")} it is English in
        every language.
      </Note>
    </Example>
  );
}

/* ── The area ───────────────────────────────────────────────────────────── */

type Own = "beds";

export function AdminArea042Demo() {
  const [layout, setLayout] = useState<"desktop" | "phone">("desktop");
  const [failed, setFailed] = useState(false);
  const labels = useAdminAreaLabels();
  // The shared five without billing, and the planner's own Beds between Invitations and Activity.
  const groups = adminSections<Own>(
    labels,
    [
      {
        id: "beds",
        icon: <Sprout />,
        title: "Beds",
        help: "The garden's beds and who tends them.",
      },
    ],
    {
      leaveOut: ["billing"],
    },
  );
  // 0.43: the overview needs no entry of its own (it is `standalone`).
  const entries = groups
    .filter((g) => g.id !== "overview")
    .map((g) => ({
      id: g.id,
      group: g.id,
      anchor: `${g.id}-card`,
      title: g.title,
    }));
  // 0.43: the same order as ids, with no words — for a router's paths.
  const order = adminSectionOrder<Own, "billing">([{ id: "beds" }], {
    leaveOut: ["billing"],
  });
  return (
    <Example
      label="The admin area — adminSections, AdminOverview, AdminToolLinks"
      hint="ADMIN_SECTIONS in the template's order, the overview of what is waiting, the Tools list under the sidebar"
    >
      <ToggleGroup<"desktop" | "phone">
        aria-label="Layout"
        value={layout}
        onChange={setLayout}
        options={[
          { value: "desktop", label: "Desktop" },
          { value: "phone", label: "Phone" },
        ]}
      />
      <Switch
        size="sm"
        className="mt-3"
        label="GET /admin/attention fails"
        checked={failed}
        onCheckedChange={setFailed}
      />
      <Frame
        key={layout}
        initial="/admin"
        className={layout === "phone" ? "mx-auto mt-3 max-w-[390px]" : "mt-3"}
      >
        <div className="h-[36rem] overflow-y-auto">
          <SettingsLayout<AdminSharedSection | Own>
            layout={layout}
            title={labels.title}
            labels={{
              back: "Back to administration",
              sections: "Administration sections",
            }}
            groups={groups}
            entries={entries}
            basePath="/admin"
            width="7xl"
            search={false}
            documentTitle={false}
            sidebarFooter={<AdminToolLinks links={TOOLS} />}
            phoneFooter={<AdminToolLinks links={TOOLS} variant="list" />}
            renderGroup={(section) =>
              // The overview is `standalone`: no catalogue entry, so it is not a SettingsSection
              // (which throws in development without one) — the tiles stand on their own.
              section === "overview" ? (
                <AdminOverview
                  attention={ATTENTION}
                  hrefs={{ feedback_waiting: "/feedback?status=OPEN" }}
                  extraTiles={[
                    {
                      key: "seeds_waiting",
                      label: "Seeds to approve",
                      count: ATTENTION.extra.seeds_waiting,
                      href: "/admin/beds",
                    },
                    // 0.43: no href, a quiet count.
                    { key: "beds_total", label: "Beds", count: 12 },
                  ]}
                  error={failed}
                  onRetry={() => setFailed(false)}
                />
              ) : (
                <SettingsSection
                  anchor={`${section}-card`}
                  title={groups.find((g) => g.id === section)?.title ?? section}
                  titleVisible={false}
                >
                  <p className="text-sm text-secondary">
                    The {section} section's cards.
                  </p>
                </SettingsSection>
              )
            }
          />
        </div>
      </Frame>
      <Note>
        {code("adminSections(labels, own, { leaveOut })")} builds the groups:
        the shared sections with the kit's icons (
        {ADMIN_SECTIONS.map((s) => s.id).join(", ")}) and words, an app's own
        after Invitations unless its {code("after")} names another place. The
        overview leaves out every {code("null")} count — this app has no
        deletion requests to act on — and each tile is a link to where the work
        is. The Tools list sits under the sidebar ({code("sidebarFooter")}) and
        in the phone footer; the feedback inbox is not in it, the top bar
        reaches it. Since 0.43 the Overview shows with no entry, an extra tile
        without {code("href")} is a quiet count, a failed answer shows{" "}
        {code("error")} with &ldquo;Try again&rdquo;, and{" "}
        {code("adminSectionOrder(own, { leaveOut })")} gives the ids alone:{" "}
        {order.join(", ")}.
      </Note>
    </Example>
  );
}

/* ── A tile, and the 403 page ──────────────────────────────────────────── */

export function AdminForbidden042Demo() {
  return (
    <>
      <Example
        label="One tile — AttentionTile"
        hint="a StatTile that is a link, its count the headline"
      >
        <Frame initial="/" className="max-w-xs p-3">
          <AttentionTile
            label="Pending invitations"
            count={2}
            href="/admin/invitations"
            icon={<Mail className="size-4" aria-hidden />}
          />
        </Frame>
      </Example>
      <Example
        label="The 403 page — AdminForbidden"
        hint="renders in place of the admin page; no redirect"
      >
        <Frame initial="/admin">
          <AdminForbidden
            appName="Ada's Garden Planner"
            homeHref="/garden"
            homeLabel="Back to the garden"
            reviewerHref="/translations"
            headingAs="h3"
          />
        </Frame>
        <Note>
          The app's client gate shows it on the same admin check the menu uses,
          inside the lazy route, so a bookmark keeps its address. The words say
          only that this area is closed to this account — never that the person
          runs nothing anywhere. A reviewer gets the translations as a second
          way out.
        </Note>
      </Example>
    </>
  );
}
