import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import type { UiKitLabelOverrides } from "../../i18n/kit-labels";
import type { AccessChoice } from "../access";
import { LandingActions } from "../landing-actions";
import type { LandingSession } from "../landing-actions";
import { CtaBand, FeatureRow, FeatureRows, Hero, PublicFooter, TrustStrip } from "../landing-sections";
import { PublicHeader } from "../public-header";

const ACCESS: AccessChoice = { kind: "request", email: "support@example.com", app: "Ada's Garden Planner" };
const Mark = () => <svg data-testid="mark" />;

function header(session: LandingSession, access: AccessChoice = ACCESS) {
  return render(
    <MemoryRouter>
      <PublicHeader
        brand={{ logo: <Mark />, name: "Ada's Garden Planner" }}
        session={session}
        access={access}
        openAppHref="/beds"
        themeToggle={<button type="button">theme</button>}
        languageMenu={<button type="button">language</button>}
      />
    </MemoryRouter>,
  );
}

const linkNames = () => screen.getAllByRole("link").map((a) => a.textContent);

describe("PublicHeader — the actions per state (§4.1)", () => {
  it("no session: Sign in (hidden below sm) and Request access, the brand to /", () => {
    header("none");
    expect(linkNames()).toEqual(["Ada's Garden Planner", "Sign in", "Request access"]);
    const signIn = screen.getByRole("link", { name: "Sign in" });
    expect(signIn).toHaveAttribute("href", "/login");
    expect(signIn.className).toContain("max-sm:hidden");
    expect(screen.getByRole("link", { name: "Request access" }).getAttribute("href")).toMatch(
      /^mailto:support@example\.com\?subject=Access%20to%20Ada%27s%20Garden%20Planner&body=/,
    );
    expect(screen.getByRole("link", { name: "Ada's Garden Planner" })).toHaveAttribute("href", "/");
  });

  it("a demo session: Continue the demo and Request access — never Sign in or Open app; the brand to /welcome", () => {
    header("demo");
    expect(linkNames()).toEqual(["Ada's Garden Planner", "Continue the demo", "Request access"]);
    expect(screen.getByRole("link", { name: "Continue the demo" })).toHaveAttribute("href", "/demo");
    expect(screen.getByRole("link", { name: "Ada's Garden Planner" })).toHaveAttribute("href", "/welcome");
  });

  it("a real session: Open app alone, to the resume target", () => {
    header("user");
    expect(linkNames()).toEqual(["Ada's Garden Planner", "Open app"]);
    expect(screen.getByRole("link", { name: "Open app" })).toHaveAttribute("href", "/beds");
  });

  it("puts the theme toggle and the language menu before the actions", () => {
    header("none");
    const banner = screen.getByRole("banner");
    const order = Array.from(banner.querySelectorAll("a, button"), (el) => el.textContent);
    expect(order).toEqual(["Ada's Garden Planner", "theme", "language", "Sign in", "Request access"]);
  });

  it("says Get started → /register once the app opens registration", () => {
    header("none", { kind: "register", href: "/register" });
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/register");
  });

  it("takes the provider's landing words", () => {
    const labels = { landing: { signIn: "Anmelden", requestAccess: "Zugang anfragen" } } as unknown as UiKitLabelOverrides;
    render(
      <MemoryRouter>
        <UiKitProvider labels={labels}>
          <PublicHeader brand={{ logo: <Mark />, name: "Ada" }} session="none" access={ACCESS} />
        </UiKitProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Anmelden" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zugang anfragen" })).toBeInTheDocument();
  });
});

describe("LandingActions, Hero and CtaBand", () => {
  it("pairs Request access with Try the demo, Continue the demo for a demo, Open app alone for a user", () => {
    const { rerender } = render(<LandingActions session="none" access={ACCESS} />);
    expect(linkNames()).toEqual(["Request access", "Try the demo"]);
    expect(screen.getByRole("link", { name: "Try the demo" })).toHaveAttribute("href", "/demo");
    rerender(<LandingActions session="demo" access={ACCESS} />);
    expect(linkNames()).toEqual(["Request access", "Continue the demo"]);
    rerender(<LandingActions session="user" access={ACCESS} openAppHref="/beds" />);
    expect(linkNames()).toEqual(["Open app"]);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/beds");
  });

  it("Hero: the badge, the h1, the subtitle, the pair and the trust line; the visual decorative", () => {
    render(
      <Hero
        beta
        title="Plan every bed"
        subtitle="Sow, water and harvest on time."
        trust="Free while in beta."
        visual={<div data-testid="mock">mock</div>}
        session="none"
        access={ACCESS}
      />,
    );
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Plan every bed" })).toBeInTheDocument();
    expect(screen.getByText("Free while in beta.")).toBeInTheDocument();
    expect(linkNames()).toEqual(["Request access", "Try the demo"]);
    const visual = screen.getByTestId("mock").parentElement!;
    expect(visual).toHaveAttribute("aria-hidden", "true");
    expect(visual).toHaveAttribute("inert");
  });

  it("CtaBand: an h2 and the same pair, centred", () => {
    render(<CtaBand title="Ready to plant?" session="demo" access={ACCESS} />);
    expect(screen.getByRole("heading", { level: 2, name: "Ready to plant?" })).toBeInTheDocument();
    expect(linkNames()).toEqual(["Request access", "Continue the demo"]);
  });
});

describe("FeatureRows, TrustStrip and PublicFooter", () => {
  it("rows: icon eyebrow, h2, description, at most three bullets, alternating by position", () => {
    render(
      <FeatureRows>
        <FeatureRow
          icon={<svg data-testid="icon" />}
          eyebrow="Plan"
          title="Beds on a grid"
          description="Draw the garden once."
          bullets={["One", "Two", "Three", "Four"]}
          visual={<div>mock</div>}
        />
        <FeatureRow title="Water on time" visual={<div>mock</div>} />
      </FeatureRows>,
    );
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Beds on a grid",
      "Water on time",
    ]);
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["One", "Two", "Three"]);
    expect(screen.getByTestId("icon").parentElement).toHaveAttribute("aria-hidden", "true");
    // The copy of every second row moves to the end from lg up — by position, no index.
    const copy = screen.getByRole("heading", { name: "Water on time" }).parentElement!;
    expect(copy.className).toContain("lg:group-even/feature:order-last");
    expect(copy.parentElement!.className).toContain("group/feature");
  });

  it("trust strip: an h3 and a sentence per item", () => {
    render(
      <TrustStrip
        items={[
          { title: "Hosted in Switzerland", description: "One server, one country." },
          { title: "Passkeys", description: "No password to leak." },
          { title: "Your data", description: "Export it any time." },
        ]}
      />,
    );
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });

  it("footer: the legal links and the tagline", () => {
    render(<PublicFooter tagline="Garden planning for small plots." />);
    expect(screen.getByRole("navigation", { name: "Legal" })).toBeInTheDocument();
    expect(screen.getByText("Garden planning for small plots.")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});

describe("LandingActions — an app without a demo yet (0.31.1)", () => {
  it("leaves 'Try the demo' out with demoHref={null}, in the hero and the CTA band alike", () => {
    render(
      <MemoryRouter>
        <Hero title="Plan the garden" subtitle="Beds, seeds, harvest." session="none" access={ACCESS} demoHref={null} />
        <CtaBand title="Start planning" session="none" access={ACCESS} demoHref={null} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("link", { name: "Try the demo" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Request access" })).toHaveLength(2);
  });

  it("keeps it by default", () => {
    render(
      <MemoryRouter>
        <LandingActions session="none" access={ACCESS} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Try the demo" })).toHaveAttribute("href", "/demo");
  });
});
