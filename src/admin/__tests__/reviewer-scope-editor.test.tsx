import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReviewerScopeEditor } from "../reviewer-scope-editor";

/**
 * §4.1 `PUT …/reviewer {locales, areas}`: one editor for the three apps' — languages,
 * narrowed by an area, sent whole on Save; no language takes the role away.
 */

describe("ReviewerScopeEditor", () => {
  it("saves the languages in the list's order and the area, or null for every area", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    render(<ReviewerScopeEditor value={{ locales: ["fr"], areas: null }} languages={["de-CH", "fr", "it"]} onSave={onSave} />);
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: "Italiano" }));
    await user.click(screen.getByRole("checkbox", { name: "Deutsch" }));
    await user.click(save);
    expect(onSave).toHaveBeenLastCalledWith({ locales: ["de-CH", "fr", "it"], areas: null });

    await user.click(screen.getByRole("checkbox", { name: "Only the legal pages" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenLastCalledWith({ locales: ["de-CH", "fr", "it"], areas: ["legal"] });
  });

  it("takes the role away with no language, and waits for one before an area", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ReviewerScopeEditor value={{ locales: ["fr"], areas: ["legal"] }} languages={["fr", "it"]} onSave={onSave} />);
    expect(screen.getByRole("checkbox", { name: "Only the legal pages" })).toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: "Français" }));
    expect(screen.getByText("No language: saving takes the reviewer role away.")).toBeInTheDocument();
    const legal = screen.getByRole("checkbox", { name: "Only the legal pages" });
    expect(legal).toBeDisabled();
    expect(legal).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({ locales: [], areas: null });
  });

  it("takes the app's languages and areas, keeps the draft on a failed save and says why", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {
      throw new Error("boom");
    });
    render(
      <ReviewerScopeEditor
        value={{ locales: [] }}
        languages={[
          { value: "en", label: "English" },
          { value: "rm", label: "Rumantsch" },
        ]}
        areas={[{ value: "help", label: "Only the help pages" }]}
        onSave={onSave}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "Rumantsch" }));
    await user.click(screen.getByRole("checkbox", { name: "Only the help pages" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({ locales: ["rm"], areas: ["help"] });
    expect(await screen.findByText("The reviewer scope couldn’t be saved. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Rumantsch" })).toBeChecked();
    await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeEnabled());
  });

  it("says why it cannot be changed and offers no Save", () => {
    render(
      <ReviewerScopeEditor
        value={{ locales: [] }}
        languages={["fr"]}
        disabledReason="Administrators review every language already."
        onSave={() => undefined}
      />,
    );
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Français" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByText("Administrators review every language already.").length).toBeGreaterThan(0);
  });
});
