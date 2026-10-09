import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Plus } from "lucide-react";
import { Button } from "../ui";
import { PageHeader } from "../page-header";

/**
 * kastlan's 0.32.1 report (0.32.2): a page header's two buttons at 360 px / Extra large.
 * jsdom lays nothing out, so these pin the classes that do it.
 */
describe("Button keeps its icon whole when the label wraps", () => {
  it("does not let the svg shrink", () => {
    render(
      <Button>
        <Plus aria-hidden />
        New invoice
      </Button>,
    );
    expect(screen.getByRole("button", { name: "New invoice" }).className.split(" ")).toContain("[&_svg]:shrink-0");
  });
});

describe("PageHeader stacks its actions on a phone at Large", () => {
  const actions = (
    <>
      <Button>Export</Button>
      <Button variant="primary">New invoice</Button>
    </>
  );

  it("stacks them full width in the stacked layout, from Large on a phone only", () => {
    render(<PageHeader title="Invoices" actions={actions} />);
    const box = screen.getByRole("button", { name: "Export" }).parentElement!.className.split(" ");
    for (const cls of ["large:max-sm:flex-col", "large:max-sm:items-stretch", "large:max-sm:[&>*]:w-full"]) {
      expect(box, cls).toContain(cls);
    }
    // Normal keeps its wrapping row.
    expect(box).toContain("flex-wrap");
  });

  it("leaves the inline layout's actions beside the title", () => {
    render(<PageHeader title="Invoices" mobileLayout="inline" actions={actions} />);
    expect(screen.getByRole("button", { name: "Export" }).parentElement!.className).not.toContain("large:max-sm:flex-col");
  });
});
