import { fireEvent, render, screen, within } from "@testing-library/react";
import { SERVER_KIT_API, installLine, kindHeading, membersByKind, findModule } from "../server-kit/api";
import { MailPreview, groupMails, mailScale } from "../server-kit/mail-preview";
import { slugify } from "../lib/section";
import { MOUNT_TIMEOUT_MS, renderShowcase, useShowcaseEnvironment } from "./showcase-harness";

/**
 * The Server kit group, rendered: a module page in the real showcase frame, the mail
 * previews, and the "Server side" line the frame puts under a kit page's title.
 * (Every page of the group also mounts in pages-shard-*.test.tsx, which checks its
 * `<h3>` anchors against the search index.)
 */

// The pages rendered below. Every Server kit page is the one section `ServerModules`; the
// two kit pages are there for the frame's "Server side" line (TST-8: this file loaded all
// 250-odd sections for them).
useShowcaseEnvironment({
  pages: ["server-settings", "server-auth", "server-mail", "server-feedback", "server-notifications", "settings", "tokens"],
});

const api = SERVER_KIT_API;

/** Every in-page link of the page at `slug` — `/slug#id` — lands on an element. */
function expectLinksLand(slug: string) {
  const main = document.querySelector("main")!;
  const local = [...main.querySelectorAll("a")]
    .map((a) => a.getAttribute("href") ?? "")
    .filter((href) => href.startsWith(`/${slug}#`));
  expect(local.length).toBeGreaterThan(0);
  for (const href of local) {
    const id = decodeURIComponent(href.split("#")[1]);
    expect(document.getElementById(id), `${href} has no target`).not.toBeNull();
  }
}

describe("a module page", () => {
  it(
    "shows the module, its contract, install line, counterparts and every member",
    () => {
      renderShowcase("/server-settings");
      expect(screen.getByRole("heading", { name: "Settings & language", level: 1 })).toBeInTheDocument();
      const mod = findModule(api, "settings")!;
      expect(screen.getByRole("heading", { name: mod.name, level: 2 })).toHaveAttribute("id", "settings");

      // The contract section, as a link to github.com's anchor of its heading.
      const contract = screen.getByRole("link", { name: /settings-harmonization\.md §6/ });
      expect(contract).toHaveAttribute("href", mod.contract!.links[0].url);
      expect(contract.getAttribute("href")).toMatch(/#6-the-backend$/);

      expect(screen.getAllByText(installLine(api.kit_version)).length).toBeGreaterThan(0);
      // Kit counterparts: the settings rows' page (inside the page — the sidebar names it too).
      const main = document.querySelector("main")!;
      expect(within(main).getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");

      // One <h3> per kind, one <h4> per member, each with its anchor.
      for (const [kind, members] of membersByKind(mod.members)) {
        const heading = screen.getByRole("heading", { name: kindHeading("settings", kind), level: 3 });
        expect(heading).toHaveAttribute("id", slugify(kindHeading("settings", kind)));
        for (const m of members) {
          expect(document.getElementById(`settings.${m.name}`)?.tagName, m.name).toBe("H4");
        }
      }
      // A signature, laid out one parameter per line.
      const sig = document.getElementById("settings.apply_patch")!.closest("article")!.querySelector("pre")!;
      expect(sig.textContent).toMatch(/^apply_patch\(\n {4}obj: object \| None,/);

      // Roles: a member of this module and one of another page link to their anchors.
      const article = document.getElementById("settings.PatchNullError")!.closest("article")!;
      expect(within(article).getByRole("link", { name: "install_contract_error_handlers()" })).toHaveAttribute(
        "href",
        "/server-limits#errors.install_contract_error_handlers",
      );
      expectLinksLand("server-settings");
    },
    MOUNT_TIMEOUT_MS,
  );

  it(
    "renders the fields, values and methods of the larger modules",
    () => {
      renderShowcase("/server-auth");
      const mod = findModule(api, "auth")!;
      const withFields = mod.members.find((m) => m.fields?.length)!;
      const article = document.getElementById(`auth.${withFields.name}`)!.closest("article")!;
      const table = within(article).getByRole("table", { name: `${withFields.name} fields` });
      expect(within(table).getByText(withFields.fields![0].name)).toBeInTheDocument();
      const withValues = mod.members.find((m) => m.values?.length)!;
      const values = within(document.getElementById(`auth.${withValues.name}`)!.closest("article")!).getByRole("table", {
        name: `${withValues.name} values`,
      });
      expect(within(values).getByText(JSON.stringify(withValues.values![0].value))).toBeInTheDocument();
      expectLinksLand("server-auth");
    },
    MOUNT_TIMEOUT_MS,
  );

  it(
    "documents a nested module beside its package, under its own anchor (server-kit 0.9)",
    () => {
      renderShowcase("/server-feedback");
      const router = findModule(api, "feedback.router")!;
      const heading = screen.getByRole("heading", { name: router.name, level: 2 });
      expect(heading).toHaveAttribute("id", "feedback.router");
      // The package's heading comes first, the router's next, uploads after.
      const order = [...document.querySelectorAll("main section > header > h2")].map((h) => h.id);
      expect(order).toEqual(["feedback", "feedback.router", "uploads", "clock"]);
      const section = heading.closest("section")!;
      expect(within(section).getByRole("link", { name: /server-services-harmonization\.md §2\.9/ })).toHaveAttribute(
        "href",
        router.contract!.links[0].url,
      );
      for (const m of router.members) {
        expect(document.getElementById(`feedback.router.${m.name}`)?.tagName, m.name).toBe("H4");
      }
      expect(
        screen.getByRole("heading", { name: kindHeading("feedback.router", "function"), level: 3 }),
      ).toHaveAttribute("id", "feedback-router-functions");
      expectLinksLand("server-feedback");
    },
    MOUNT_TIMEOUT_MS,
  );

  it(
    "gives notifications a page of its own, linked to both contract sections",
    () => {
      renderShowcase("/server-notifications");
      const mod = findModule(api, "notifications")!;
      expect(screen.getByRole("heading", { name: mod.name, level: 2 })).toHaveAttribute("id", "notifications");
      const [shapes, kitPart] = mod.contract!.links;
      expect([shapes.section, kitPart.section]).toEqual(["§3", "§4.1"]);
      expect(screen.getByRole("link", { name: /notifications-harmonization\.md §3\b/ })).toHaveAttribute("href", shapes.url);
      expect(screen.getByRole("link", { name: /notifications-harmonization\.md §4\.1/ })).toHaveAttribute("href", kitPart.url);
      const main = document.querySelector("main")!;
      expect(within(main).getByRole("link", { name: "Notifications" })).toHaveAttribute("href", "/notifications");
      expectLinksLand("server-notifications");
    },
    MOUNT_TIMEOUT_MS,
  );
});

describe("the mail previews", () => {
  it(
    "show every sample mail sandboxed, with its subject and a language switch",
    () => {
      renderShowcase("/server-mail");
      const frames = [...document.querySelectorAll("main iframe")];
      expect(frames).toHaveLength(groupMails(api.mails).length);
      for (const frame of frames) {
        expect(frame.getAttribute("sandbox")).toBe("");
        expect(frame.getAttribute("srcdoc")).toMatch(/^<!doctype html>/i);
      }
      expect(screen.getByRole("heading", { name: "mail · Rendered mails", level: 3 })).toBeInTheDocument();
    },
    MOUNT_TIMEOUT_MS,
  );

  it("switches a mail's language", () => {
    const [variants] = groupMails(api.mails);
    const german = variants.find((v) => v.locale === "de-CH")!;
    render(<MailPreview variants={variants} />);
    // The subject line carries the mail's language; the caption above it is the sample's name.
    expect(screen.getByText(variants[0].subject, { selector: "span[lang]" })).toHaveAttribute("lang", variants[0].locale);
    fireEvent.click(screen.getByRole("radio", { name: "de-CH" }));
    expect(screen.getByText(german.subject, { selector: "span[lang]" })).toHaveAttribute("lang", "de-CH");
    expect(document.querySelector("iframe")!.getAttribute("srcdoc")).toBe(german.html);
  });

  it("scales the 600px mail down to a narrower box, never up", () => {
    expect(mailScale(600)).toBe(1);
    expect(mailScale(1200)).toBe(1);
    expect(mailScale(300)).toBe(0.5);
    expect(mailScale(0)).toBe(1);
  });
});

describe("the kit side of the cross-links", () => {
  it(
    "names the server modules under a kit page's title",
    () => {
      renderShowcase("/settings");
      const line = screen.getByText("Server side").closest("p")!;
      expect(within(line).getByRole("link", { name: "settings" })).toHaveAttribute("href", "/server-settings#settings");
    },
    MOUNT_TIMEOUT_MS,
  );

  it(
    "shows nothing on a page without a server half",
    () => {
      renderShowcase("/tokens");
      expect(screen.queryByText("Server side")).toBeNull();
    },
    MOUNT_TIMEOUT_MS,
  );
});
