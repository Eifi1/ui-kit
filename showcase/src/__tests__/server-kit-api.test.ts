import {
  SERVER_KIT_API,
  findModule,
  formatSignature,
  installLine,
  kindHeading,
  membersByKind,
  moduleShort,
  resolveTarget,
  targetAnchor,
  wheelUrl,
} from "../server-kit/api";
import { KIT_COUNTERPARTS, serverModulesFor, serverPageOf } from "../server-kit/links";
import { GROUPS, PAGES } from "../routes";
import { SERVER_KIT_MODULES, SERVER_KIT_VERSION } from "../search/server-kit.generated";
import { buildSearchEntries } from "../search/showcase-search";
import { en } from "../i18n";
import { createSearchIndex } from "@eifi1/ui-kit";

/**
 * The rules the Server kit pages share (server-kit/api.ts) and the cross-link map
 * (server-kit/links.ts), against the committed export.
 */

const api = SERVER_KIT_API;

describe("the pinned export", () => {
  it("is the release the search index was generated from", () => {
    expect(api.format).toBe("eifi1-server-kit-api");
    expect(SERVER_KIT_VERSION).toBe(api.kit_version);
    expect(SERVER_KIT_MODULES.map((m) => `eifi1_server_kit.${m.module}`)).toEqual(api.modules.map((m) => m.name));
  });

  it("puts every module on exactly one Server kit page, and names no module it lacks", () => {
    const group = GROUPS.find((g) => g.slug === "server-kit")!;
    const shown = group.pages.flatMap((p) => p.serverModules ?? []);
    expect([...shown].sort()).toEqual(api.modules.map((m) => moduleShort(m.name)).sort());
    expect(new Set(shown).size).toBe(shown.length);
    for (const short of shown) expect(serverPageOf(short)).toMatch(/^server-/);
  });
});

describe("cross-links", () => {
  it("maps every module, and only to pages that exist", () => {
    const slugs = new Set(PAGES.map((p) => p.slug));
    expect(Object.keys(KIT_COUNTERPARTS).sort()).toEqual(api.modules.map((m) => moduleShort(m.name)).sort());
    for (const [module, pages] of Object.entries(KIT_COUNTERPARTS)) {
      for (const slug of pages) {
        expect(slugs.has(slug), `${module} → /${slug}`).toBe(true);
        expect(slug.startsWith("server-"), `${module} → /${slug} is a server page`).toBe(false);
      }
    }
  });

  it("reads the map both ways", () => {
    expect(KIT_COUNTERPARTS.auth).toContain("auth-account");
    expect(KIT_COUNTERPARTS.user_admin).toContain("user-admin");
    expect(serverModulesFor("user-admin")).toEqual(["user_admin"]);
    expect(serverModulesFor("auth-account")).toEqual(expect.arrayContaining(["auth", "user_admin", "mail"]));
    expect(serverModulesFor("tokens")).toEqual([]);
    // server-kit 0.9: the Notifications page's server half, and the feedback router;
    // 0.16 adds the notifications router (inbox routes, the tick job).
    expect(serverModulesFor("notifications")).toEqual(["notifications", "notifications.router"]);
    expect(serverModulesFor("feedback-compose")).toEqual(expect.arrayContaining(["feedback", "feedback.router"]));
    expect(serverPageOf("feedback.router")).toBe("server-feedback");
    expect(serverPageOf("notifications")).toBe("server-notifications");
  });
});

describe("a nested module (server-kit 0.9's feedback.router)", () => {
  it("is named by its dotted path minus the package, and documented beside its package", () => {
    expect(moduleShort("eifi1_server_kit.feedback.router")).toBe("feedback.router");
    expect(findModule(api, "feedback.router")?.name).toBe("eifi1_server_kit.feedback.router");
    expect(PAGES.find((p) => p.slug === "server-feedback")?.serverModules).toEqual([
      "feedback",
      "feedback.router",
      "uploads",
      "clock",
    ]);
  });

  it("has an anchor no member shares: `feedback` has no member `router`", () => {
    // The rule (api.ts anchors; scripts/sync-server-kit.mjs anchorClashes): `#a.b` is
    // member `b` of module `a` unless `a.b` is a module, and then `a` has no member `b`.
    expect(findModule(api, "feedback")!.members.some((m) => m.name === "router")).toBe(false);
    const anchors = api.modules.flatMap((mod) => {
      const short = moduleShort(mod.name);
      return [
        targetAnchor({ module: short }),
        ...mod.members.map((m) => targetAnchor({ module: short, member: m.name })),
      ];
    });
    expect(anchors).toContain("feedback.router");
    expect(new Set(anchors).size).toBe(anchors.length);
  });

  it("resolves roles to the module, its members, and its package's members", () => {
    const anchor = (target: string, module: string) => {
      const found = resolveTarget(api, target, { module });
      return found && targetAnchor(found);
    };
    expect(resolveTarget(api, "eifi1_server_kit.feedback.router", { module: "feedback" })).toEqual({
      module: "feedback.router",
    });
    // The longest module that prefixes the path owns the member.
    expect(anchor("~eifi1_server_kit.feedback.router.feedback_router", "feedback")).toBe(
      "feedback.router.feedback_router",
    );
    expect(anchor("FeedbackDeps", "feedback.router")).toBe("feedback.router.FeedbackDeps");
    // From inside the router, the package's own members are still the package's.
    expect(anchor("~eifi1_server_kit.feedback.FeedbackService", "feedback.router")).toBe("feedback.FeedbackService");
  });
});

describe("install", () => {
  it("installs the release's wheel by URL", () => {
    expect(wheelUrl("0.5.0")).toBe(
      "https://github.com/Eifi1/server-kit/releases/download/v0.5.0/eifi1_server_kit-0.5.0-py3-none-any.whl",
    );
    expect(installLine("0.5.0")).toBe(`uv add "eifi1-server-kit @ ${wheelUrl("0.5.0")}"`);
  });
});

describe("members", () => {
  it("groups by kind, functions first and constants last", () => {
    const auth = findModule(api, "auth")!;
    const kinds = membersByKind(auth.members).map(([kind]) => kind);
    expect(kinds[0]).toBe("function");
    expect(kinds[kinds.length - 1]).toBe("constant");
    expect(kindHeading("auth", "function")).toBe("auth · Functions");
    expect(kindHeading("x", "widget")).toBe("x · Widgets");
  });

  it("lays a long signature out one parameter per line, and leaves the rest alone", () => {
    expect(
      formatSignature(
        "apply_patch(obj: object, update: BaseModel, *, not_nullable: Iterable[str], defaults: Mapping[str, object] | None = None) -> dict[str, object]",
      ),
    ).toBe(
      [
        "apply_patch(",
        "    obj: object,",
        "    update: BaseModel,",
        "    *,",
        "    not_nullable: Iterable[str],",
        "    defaults: Mapping[str, object] | None = None,",
        ") -> dict[str, object]",
      ].join("\n"),
    );
    expect(formatSignature("f(x: int) -> int")).toBe("f(x: int) -> int");
    const constant = 'LONG_CONSTANT: Mapping[str, str] = dict(a="1, 2", b="3", c="4", d="5", e="6", f="7")';
    expect(formatSignature(constant)).toBe(constant);
    expect(
      formatSignature('g(sep: str = ",", pair: tuple[int, int] = (1, 2), *rest: object, **extra: object) -> None', 40),
    ).toBe(
      [
        "g(",
        '    sep: str = ",",',
        "    pair: tuple[int, int] = (1, 2),",
        "    *rest: object,",
        "    **extra: object,",
        ") -> None",
      ].join("\n"),
    );
  });
});

describe("docstring roles", () => {
  const anchor = (target: string, module: string, member?: string) => {
    const found = resolveTarget(api, target, { module, member });
    return found && targetAnchor(found);
  };

  it("resolves a fully qualified member, a module, and a member's method", () => {
    expect(anchor("~eifi1_server_kit.errors.install_contract_error_handlers", "settings")).toBe(
      "errors.install_contract_error_handlers",
    );
    expect(anchor("eifi1_server_kit.limiter", "demo")).toBe("limiter");
    expect(anchor("~eifi1_server_kit.mail.MailText.render", "mail")).toBe("mail.MailText");
  });

  it("resolves a bare name in the current module, then the current class's own attribute", () => {
    expect(anchor("apply_patch", "settings")).toBe("settings.apply_patch");
    expect(anchor("DemoGate.admit", "demo")).toBe("demo.DemoGate");
    expect(anchor("offered_locales", "auth", "ProfileUpdate")).toBe("auth.ProfileUpdate");
  });

  it("leaves what the export does not have unresolved", () => {
    expect(anchor("ValueError", "settings")).toBeUndefined();
    expect(anchor("~datetime.timedelta", "auth")).toBeUndefined();
    // A submodule is not documented on its own.
    expect(anchor("~eifi1_server_kit.auth.accounts", "auth")).toBeUndefined();
  });
});

describe("search", () => {
  const entries = buildSearchEntries(en);

  it("finds a member by its name and links to its anchor", () => {
    const [hit] = createSearchIndex(entries).search("apply_patch");
    expect(hit.entry.title).toBe("apply_patch");
    expect(hit.entry.group).toBe(en.chrome.searchServer);
    expect(hit.entry.href).toBe("/server-settings#settings.apply_patch");
  });

  it("finds a module by its dotted path, and lists every member once", () => {
    const hits = createSearchIndex(entries).search("eifi1_server_kit.limiter");
    expect(hits[0].entry.href).toBe("/server-limits#limiter");
    // A module's id is `server:<short>`, a member's `server:<short>.<name>` — and a nested
    // module's short name has a dot too, so the modules are told apart by name.
    const modules = new Set(api.modules.map((m) => `server:${moduleShort(m.name)}`));
    const server = entries.filter((e) => e.id.startsWith("server:"));
    const members = server.filter((e) => !modules.has(e.id));
    expect(members).toHaveLength(api.modules.reduce((n, m) => n + m.members.length, 0));
    expect(new Set(server.map((e) => e.id)).size).toBe(server.length);
  });

  it("finds a nested module and its members on their page", () => {
    const index = createSearchIndex(entries);
    expect(index.search("eifi1_server_kit.feedback.router")[0].entry.href).toBe("/server-feedback#feedback.router");
    const [hit] = index.search("feedback_router");
    expect(hit.entry.href).toBe("/server-feedback#feedback.router.feedback_router");
  });
});
