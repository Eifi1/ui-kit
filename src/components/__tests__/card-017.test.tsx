import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui";

/**
 * keksdose Q3: Card `density="compact"` (the small settings card's three hand-written
 * classes, set once) and `toneFill` (the tone's wash, opt-in, on top of the frame).
 */

const slot = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;

function card(props: Partial<Parameters<typeof Card>[0]>, parts?: { title?: string; description?: string; header?: string }) {
  return render(
    <Card {...props}>
      <CardHeader className={parts?.header}>
        <CardTitle className={parts?.title}>Password</CardTitle>
        <CardDescription className={parts?.description}>Changed 3 months ago.</CardDescription>
      </CardHeader>
      <CardContent>Body</CardContent>
    </Card>,
  );
}

describe("Card density", () => {
  it("leaves the parts as they were by default", () => {
    const { container } = card({});
    const title = slot(container, "card-title").className;
    expect(title).toContain("font-semibold");
    expect(title).not.toContain("text-sm");
    expect(title).toContain("leading-none");
    expect(slot(container, "card-description").className).toContain("text-sm");
    expect(slot(container, "card-header").className).toContain("gap-1.5");
    expect(container.firstElementChild).not.toHaveAttribute("data-density");
  });

  it('"compact" sets the title, description and header gap through context', () => {
    const { container } = card({ density: "compact" });
    const title = slot(container, "card-title").className;
    expect(title).toContain("text-sm");
    expect(title).toContain("font-medium");
    expect(title).not.toContain("font-semibold");
    // 0.18 (keksdose): a line box, not the cap height, so the 12px hint below does not
    // hug the title — every keksdose admin card added `leading-normal` by hand.
    expect(title).toContain("leading-snug");
    expect(title).not.toContain("leading-none");
    const description = slot(container, "card-description").className;
    expect(description).toContain("text-xs");
    expect(description).not.toMatch(/\btext-sm\b/);
    const header = slot(container, "card-header").className;
    expect(header).toContain("gap-0.5");
    expect(header).not.toContain("gap-1.5");
    expect(container.firstElementChild).toHaveAttribute("data-density", "compact");
  });

  it("still lets a class on a part win", () => {
    const { container } = card(
      { density: "compact" },
      { title: "text-base font-semibold", description: "text-sm", header: "gap-2" },
    );
    const title = slot(container, "card-title").className;
    expect(title).toContain("text-base");
    expect(title).not.toContain("font-medium");
    expect(slot(container, "card-description").className).not.toContain("text-xs");
    expect(slot(container, "card-header").className).not.toContain("gap-0.5");
  });

  it("does not leak into a Card nested inside", () => {
    const { container } = render(
      <Card density="compact">
        <Card>
          <CardTitle>Inner</CardTitle>
        </Card>
      </Card>,
    );
    expect(slot(container, "card-title").className).toContain("font-semibold");
  });
});

describe("Card toneFill", () => {
  const WASH = "bg-[image:linear-gradient(var(--danger-bg),var(--danger-bg))]";

  it("is off by default, at both strengths", () => {
    for (const toneStrength of ["soft", "strong"] as const) {
      const { container } = card({ tone: "danger", toneStrength, padding: "md" });
      expect((container.firstElementChild as HTMLElement).className).not.toContain("--danger-bg");
    }
  });

  it("layers the tone's wash over the card surface, keeping the strong frame", () => {
    const { container } = card({ tone: "danger", toneStrength: "strong", toneFill: true, padding: "md" });
    const cls = (container.firstElementChild as HTMLElement).className;
    expect(cls).toContain(WASH);
    expect(cls).toContain("bg-[var(--bg-surface)]");
    expect(cls).toContain("border-2");
    expect(cls).toContain("border-[var(--danger-border-strong)]");
    expect(cls).toContain("p-[calc(1rem-1px)]");
  });

  it("works on a soft card and an outline card", () => {
    const soft = card({ tone: "warning", toneFill: true });
    expect((soft.container.firstElementChild as HTMLElement).className).toContain("var(--warning-bg)");
    const outline = card({ tone: "info", variant: "outline", toneFill: true });
    expect((outline.container.firstElementChild as HTMLElement).className).toContain("var(--info-bg)");
  });

  it("does nothing without a tone, nor on inset (already filled)", () => {
    const none = card({ toneFill: true });
    expect((none.container.firstElementChild as HTMLElement).className).not.toContain("linear-gradient");
    const inset = card({ tone: "success", variant: "inset", toneFill: true });
    const cls = (inset.container.firstElementChild as HTMLElement).className;
    expect(cls).toContain("bg-[var(--success-bg)]");
    expect(cls).not.toContain("linear-gradient");
  });
});
