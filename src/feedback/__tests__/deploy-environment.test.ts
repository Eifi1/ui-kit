// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { deployEnvironment, type DeployEnvironmentHosts } from "../deploy-environment";

/**
 * Which copy of the app a report comes from (0.61, lifted from keksdose
 * `frontend/src/app/deploy-environment.ts` and its test): the same production BUILD runs on
 * every deployment, so the host tells them apart, not a build flag.
 *
 * The case that matters most is the last one: an unrecognised host must read as "local",
 * never as production. Getting that backwards would hide the marker exactly where nobody
 * knows where they are — a tunnel, a new preview URL, a renamed service. Synthetic hosts
 * on `.example`, shaped like keksdose's.
 */
const HOSTS: DeployEnvironmentHosts = {
  prod: ["myapp.example", "www.myapp.example"],
  dev: ["dev.myapp.example", /^myapp-web-dev-[a-z0-9-]+\.a\.run\.app$/],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("deployEnvironment", () => {
  it("knows production by its hosts, www included, in any case", () => {
    expect(deployEnvironment(HOSTS, "myapp.example")).toBe("prod");
    expect(deployEnvironment(HOSTS, "www.myapp.example")).toBe("prod");
    expect(deployEnvironment(HOSTS, "MYAPP.EXAMPLE")).toBe("prod");
    // An app that writes its own host with capitals is matched too.
    expect(deployEnvironment({ prod: ["MyApp.Example"] }, "myapp.example")).toBe("prod");
  });

  it("knows dev by its domain and by the platform URL behind it", () => {
    expect(deployEnvironment(HOSTS, "dev.myapp.example")).toBe("dev");
    // While a domain mapping is still provisioning, this is the only way in — and it is
    // exactly when a marker is worth having.
    expect(deployEnvironment(HOSTS, "myapp-web-dev-w5vg2p66ea-ez.a.run.app")).toBe("dev");
    expect(deployEnvironment(HOSTS, "MyApp-Web-Dev-W5VG2P66EA-ez.a.run.app")).toBe("dev");
  });

  it("treats anything it does not recognise as local, never as production", () => {
    expect(deployEnvironment(HOSTS, "localhost")).toBe("local");
    expect(deployEnvironment(HOSTS, "127.0.0.1")).toBe("local");
    expect(deployEnvironment(HOSTS, "192.168.1.13")).toBe("local");
    expect(deployEnvironment(HOSTS, "192.168.1.13.sslip.io")).toBe("local");
    expect(deployEnvironment(HOSTS, "desktop.local")).toBe("local");
    expect(deployEnvironment(HOSTS, "some-tunnel.trycloudflare.com")).toBe("local");
    expect(deployEnvironment(HOSTS, "")).toBe("local");
    // The production copy's own platform URL is not named, so it is not production.
    expect(deployEnvironment(HOSTS, "myapp-web-w5vg2p66ea-ez.a.run.app")).toBe("local");
  });

  it("is not fooled by a host that merely contains or ends in the production domain", () => {
    // Not this app: a marker that disappeared on them would be wrong in the one direction
    // that matters.
    expect(deployEnvironment(HOSTS, "evil-myapp.example")).toBe("local");
    expect(deployEnvironment(HOSTS, "myapp.example.attacker.test")).toBe("local");
    expect(deployEnvironment(HOSTS, "x.dev.myapp.example")).toBe("local");
  });

  it("without a dev deployment, only production and local (kastlan, Kurvenschmiede)", () => {
    const hosts = { prod: ["myapp.example"] };
    expect(deployEnvironment(hosts, "myapp.example")).toBe("prod");
    expect(deployEnvironment(hosts, "dev.myapp.example")).toBe("local");
  });

  it("answers the same every time for a pattern with the g flag", () => {
    // `RegExp.test` advances a global pattern's lastIndex, so the second call would miss.
    const hosts = { prod: [/^myapp\.example$/g] };
    expect(deployEnvironment(hosts, "myapp.example")).toBe("prod");
    expect(deployEnvironment(hosts, "myapp.example")).toBe("prod");
  });

  it("reads the page's host by default, and is local where there is none", () => {
    // No `location` here (a test, a server render): the host is "".
    expect(deployEnvironment(HOSTS)).toBe("local");
    vi.stubGlobal("location", { hostname: "www.myapp.example" });
    expect(deployEnvironment(HOSTS)).toBe("prod");
    vi.stubGlobal("location", { hostname: "dev.myapp.example" });
    expect(deployEnvironment(HOSTS)).toBe("dev");
  });
});
