import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Copy, Home } from "lucide-react";
import { List, ListItem } from "../list";
import { UiKitProvider } from "../../i18n/kit-labels";

describe("List", () => {
  it("is a list of listitems, even with the bullets styled away", () => {
    render(
      <List aria-label="Units">
        <ListItem title="A" />
        <ListItem title="B" />
      </List>,
    );
    const list = screen.getByRole("list", { name: "Units" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  it("draws dividers or gaps", () => {
    const { rerender } = render(
      <List separator="divider">
        <ListItem title="A" />
      </List>,
    );
    expect(screen.getByRole("listitem").className).toContain("border-b");
    rerender(
      <List separator="gap">
        <ListItem title="A" />
      </List>,
    );
    expect(screen.getByRole("list").className).toContain("gap-1");
    expect(screen.getByRole("listitem").className).not.toContain("border-b");
  });
});

describe("ListItem", () => {
  it("is a button with onClick, named by its title and subtitle", () => {
    const onClick = vi.fn();
    render(
      <List>
        <ListItem icon={Home} title="Unit 4" subtitle="Apartment · 3 rooms" onClick={onClick} />
      </List>,
    );
    const button = screen.getByRole("button", { name: /Unit 4.*Apartment/ });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is a real link with href, so a middle click opens a tab — and onAuxClick runs", () => {
    const onClick = vi.fn();
    const onAuxClick = vi.fn();
    render(
      <List>
        <ListItem
          title="Ticket"
          href="/maintenance/4"
          onClick={(e) => {
            e.preventDefault();
            onClick();
          }}
          onAuxClick={onAuxClick}
        />
      </List>,
    );
    const link = screen.getByRole("link", { name: "Ticket" });
    expect(link).toHaveAttribute("href", "/maintenance/4");
    fireEvent.click(link);
    fireEvent(link, new MouseEvent("auxclick", { bubbles: true, button: 1 }));
    expect(onClick).toHaveBeenCalled();
    expect(onAuxClick).toHaveBeenCalled();
  });

  it("renders a router link through renderLink", () => {
    render(
      <List>
        <ListItem
          title="Ticket"
          href="/t/1"
          renderLink={({ href, children, ...p }) => (
            <a data-router="" href={`#${href}`} {...p}>
              {children}
            </a>
          )}
        />
      </List>,
    );
    const link = screen.getByRole("link", { name: "Ticket" });
    expect(link).toHaveAttribute("data-router");
    expect(link).toHaveAttribute("href", "#/t/1");
  });

  it("opens an external row in a new tab, safely, and says so", () => {
    render(
      <List>
        <ListItem title="Docs" href="https://example.com" external />
      </List>,
    );
    const link = screen.getByRole("link", { name: /Docs.*opens in a new tab/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("is static without onClick or href", () => {
    render(
      <List>
        <ListItem title="Passkey" subtitle="Never used" />
      </List>,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Passkey")).toBeInTheDocument();
  });

  it("puts actions BESIDE the target, never inside it, and their clicks stay theirs", () => {
    const onSelect = vi.fn();
    const onCopy = vi.fn();
    render(
      <List>
        <ListItem
          title="Profile"
          onClick={onSelect}
          actions={
            <button type="button" aria-label="Copy" onClick={onCopy}>
              <Copy />
            </button>
          }
        />
      </List>,
    );
    const main = screen.getByRole("button", { name: "Profile" });
    const copy = screen.getByRole("button", { name: "Copy" });
    expect(main).not.toContainElement(copy);
    fireEvent.click(copy);
    expect(onCopy).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("marks the selected row with aria-current and the brand border", () => {
    render(
      <List>
        <ListItem title="A" selected onClick={() => {}} />
      </List>,
    );
    const button = screen.getByRole("button", { name: "A" });
    expect(button).toHaveAttribute("aria-current", "true");
    expect(button.parentElement!.className).toContain("border-[var(--brand)]");
    expect(button.parentElement!.className).toContain("bg-[var(--bg-surface-2)]");
  });

  it("says 'Unread' to a screen reader and draws the dot, in the provider's words", () => {
    render(
      <UiKitProvider labels={{ list: { unread: "Ungelesen" } }}>
        <List>
          <ListItem title="New reply" unread onClick={() => {}} />
        </List>
      </UiKitProvider>,
    );
    const button = screen.getByRole("button", { name: /New reply.*Ungelesen/ });
    expect(button.querySelector(".rounded-full")).not.toBeNull();
    expect(screen.getByText("New reply").className).toContain("font-semibold");
  });

  it("while loading: busy, a spinner, focus kept, and a second click ignored", () => {
    const onClick = vi.fn();
    render(
      <List>
        <ListItem title="report.pdf" loading onClick={onClick} />
      </List>,
    );
    const button = screen.getByRole("button", { name: "report.pdf" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
    expect(button.querySelector(".animate-spin")).not.toBeNull();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("a disabled link row renders no link", () => {
    render(
      <List>
        <ListItem title="Gone" href="/gone" disabled />
      </List>,
    );
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("density sets the target's padding, and a row may override the list", () => {
    render(
      <List density="compact">
        <ListItem title="A" onClick={() => {}} />
        <ListItem title="B" density="comfortable" onClick={() => {}} />
      </List>,
    );
    expect(screen.getByRole("button", { name: "A" }).className).toContain("py-1.5");
    expect(screen.getByRole("button", { name: "B" }).className).toContain("py-3");
  });

  it("truncates the title and subtitle, and uses logical alignment", () => {
    render(
      <List>
        <ListItem title="Long" subtitle="Longer" onClick={() => {}} />
      </List>,
    );
    expect(screen.getByText("Long").className).toContain("truncate");
    expect(screen.getByText("Longer").className).toContain("truncate");
    expect(screen.getByRole("button").className).toContain("text-start");
  });
});
