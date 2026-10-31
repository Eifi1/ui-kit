import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { FeedbackMenu } from "../../feedback/feedback-menu";
import { GlobalSearch } from "../../search/global-search";
import { AdminMenuRow, useAdminMenuEntry } from "../admin-menu";
import { DevMenu, DEV_ORIGINAL_ROLE_KEY } from "../dev-menu";
import { TopBarActionMenu } from "../topbar-action-menu";

/** 0.43: the fixes from the 0.42 adoptions (keksdose 1, 2; kastlan 2). */

afterEach(() => sessionStorage.clear());

const ROLES = ["ADMIN", "MEMBER"] as const;

describe("the dev menu reads the kept role when it turns on (keksdose 1)", () => {
  it("keeps 'Back to' after a reload whose probe enables it late", () => {
    sessionStorage.setItem(DEV_ORIGINAL_ROLE_KEY, "ADMIN");
    const props = { roles: ROLES, currentRole: "MEMBER" as const, onRole: vi.fn() };
    const { rerender } = render(
      <MemoryRouter>
        <DevMenu enabled={false} {...props} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: /^Dev tools/ })).toBeNull();
    // The GET probe answered: the switchers turn on.
    rerender(
      <MemoryRouter>
        <DevMenu enabled {...props} />
      </MemoryRouter>,
    );
    // One flask since 0.51 (DevMenu; 0.43 fixed it in DevSwitchers, gone in 0.52).
    fireEvent.click(screen.getByRole("button", { name: /^Dev tools/ }));
    expect(screen.getByRole("menuitem", { name: /Back to ADMIN/ })).toBeInTheDocument();
  });
});

describe("data-* on GlobalSearch and FeedbackMenu (keksdose 2)", () => {
  it("puts them on GlobalSearch's trigger", () => {
    render(
      <MemoryRouter>
        <GlobalSearch entries={[]} data-tour="search" data-testid="search" />
      </MemoryRouter>,
    );
    const trigger = screen.getByTestId("search");
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger).toHaveAttribute("data-tour", "search");
  });

  it("puts them on FeedbackMenu's trigger", () => {
    render(
      <MemoryRouter>
        <FeedbackMenu onFile={vi.fn()} data-tour="feedback-menu" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Send feedback" })).toHaveAttribute("data-tour", "feedback-menu");
  });
});

describe("the Administration row's words (kastlan 2)", () => {
  function Menu() {
    const entry = useAdminMenuEntry({ badge: 3 });
    return <TopBarActionMenu icon={<span />} aria-label="Account" entries={[entry]} />;
  }

  it("useAdminMenuEntry reads the provider's words", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <MemoryRouter>
          <Menu />
        </MemoryRouter>
      </UiKitProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    expect(
      screen.getByRole("menuitem", { name: new RegExp(`^${UI_KIT_LABELS_DE_CH.adminArea.title}`) }),
    ).toHaveAttribute("href", "/admin");
  });

  it("AdminMenuRow reads them too", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <MemoryRouter>
          <ul>
            <AdminMenuRow />
          </ul>
        </MemoryRouter>
      </UiKitProvider>,
    );
    expect(screen.getByText(UI_KIT_LABELS_DE_CH.adminArea.title)).toBeInTheDocument();
  });
});
