import { useState } from "react";
import type { ReactNode } from "react";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Home } from "lucide-react";
import { UiKitProvider } from "../../i18n/kit-labels";
import type { UiKitLabelOverrides } from "../../i18n/kit-labels";
import { EntityCombobox } from "../entity-combobox";
import { MultiEntityCombobox } from "../multi-entity-combobox";
import { MultiSelect } from "../multi-select";
import { FieldSyncRow } from "../field-sync";
import type { UseFieldSyncReturn } from "../field-sync";
import { Input, Spinner } from "../ui";
import { Chip } from "../chip";
import { AppShell } from "../../shell/app-shell";
import { StepperNav } from "../../wizard/stepper-nav";
import { useWizard } from "../../wizard/use-wizard";

/**
 * `<UiKitProvider labels>` has to REACH the component — a provider that exists and is
 * ignored is exactly the failure it replaces (one `labels` prop per call site, and
 * English wherever a call site forgot one). So every test here renders a component
 * with NO string props under a German provider and asserts the German word in the
 * DOM, and the last block checks the other half of the contract: a prop still beats
 * the provider.
 */

const DE: UiKitLabelOverrides = {
  common: { fieldValue: (field, value) => `${field} – ${value}`, remove: "Entfernen" },
  combobox: { clear: "Leeren", noResults: "Keine Treffer" },
  multiSelect: { selectAll: "Alle auswählen", clear: "Keine", all: "Alle Konten" },
  appShell: { collapse: "Seitenleiste einklappen" },
  wizard: { next: "Weiter", missingRequired: "Bitte alle Pflichtfelder ausfüllen." },
  fieldSync: { edited: "Ungespeichert" },
  passwordReveal: { show: "Passwort anzeigen" },
};

function German({ children }: { children: ReactNode }) {
  return <UiKitProvider labels={DE}>{children}</UiKitProvider>;
}

const OPTIONS = [
  { value: 1, label: "Girokonto" },
  { value: 2, label: "Sparbuch" },
];

describe("UiKitProvider reaches the components", () => {
  it("EntityCombobox: the clear button and the empty list", () => {
    render(
      <German>
        <EntityCombobox value={1} onChange={() => {}} options={OPTIONS} label="Konto" clearable />
      </German>,
    );
    expect(screen.getByRole("button", { name: "Leeren" })).toBeInTheDocument();
    // The trigger's name is composed through `common.fieldValue`, not a hardcoded colon.
    const trigger = screen.getByRole("combobox", { name: "Konto – Girokonto" });

    fireEvent.click(trigger);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "zzz" } });
    expect(screen.getByText("Keine Treffer")).toBeInTheDocument();
  });

  it("MultiEntityCombobox: joins the picked names with Intl.ListFormat in the provider's locale", () => {
    render(
      <UiKitProvider locale="de">
        <MultiEntityCombobox value={[1, 2]} onChange={() => {}} options={OPTIONS} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Girokonto und Sparbuch");
  });

  it("MultiSelect: the summary and the two actions", () => {
    render(
      <German>
        <MultiSelect options={OPTIONS} values={[]} onChange={() => {}} label="Konten" />
      </German>,
    );
    const trigger = screen.getByRole("combobox", { name: "Konten – Alle Konten" });
    fireEvent.click(trigger);
    expect(screen.getByRole("button", { name: "Alle auswählen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keine" })).toBeInTheDocument();
  });

  it("AppShell: the collapse button", () => {
    render(
      <MemoryRouter>
        <German>
          <AppShell nav={[{ to: "/", label: "Start", icon: Home }]} topBar={<div />}>
            <div />
          </AppShell>
        </German>
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Seitenleiste einklappen" })).toBeInTheDocument();
  });

  it("StepperNav: the Next button", () => {
    function Wizard() {
      const wizard = useWizard({
        steps: [
          { id: "a", label: "Eins" },
          { id: "b", label: "Zwei" },
        ],
      });
      return (
        <StepperNav wizard={wizard}>
          <div />
        </StepperNav>
      );
    }
    render(
      <MemoryRouter>
        <German>
          <Wizard />
        </German>
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Weiter" })).toBeInTheDocument();
  });

  it("useWizard: the missing-required message is the provider's, not English", async () => {
    const onValidationFailed = vi.fn();
    const { result } = renderHook(
      () =>
        useWizard({
          steps: [
            { id: "a", label: "Eins", validate: () => false },
            { id: "b", label: "Zwei" },
          ],
          onValidationFailed,
        }),
      {
        wrapper: ({ children }) => (
          <MemoryRouter>
            <German>{children}</German>
          </MemoryRouter>
        ),
      },
    );
    await act(async () => {
      await result.current.goNext();
    });
    expect(onValidationFailed).toHaveBeenCalledWith("Bitte alle Pflichtfelder ausfüllen.");
  });

  it("FieldSyncRow: the state line", () => {
    const sync: UseFieldSyncReturn<string> = {
      value: "x",
      setValue: () => {},
      state: "edited",
      error: null,
      dirty: true,
      save: () => {},
      retry: () => {},
      reset: () => {},
    };
    render(
      <German>
        <FieldSyncRow sync={sync}>
          <input aria-label="Name" defaultValue="x" />
        </FieldSyncRow>
      </German>,
    );
    expect(screen.getByText("Ungespeichert")).toBeInTheDocument();
  });

  it("Input: the password reveal toggle", () => {
    render(
      <German>
        <Input type="password" label="Passwort" />
      </German>,
    );
    expect(screen.getByRole("button", { name: "Passwort anzeigen" })).toBeInTheDocument();
  });

  it("Chip and Spinner: the shared `common` words", () => {
    render(
      <UiKitProvider labels={{ ...DE, common: { ...DE.common, loading: "Lädt…" } }}>
        <Chip onRemove={() => {}}>rechnungen</Chip>
        <Spinner />
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Entfernen – rechnungen" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Lädt…");
  });
});

describe("a component's own prop beats the provider", () => {
  it("EntityCombobox clearLabel", () => {
    render(
      <German>
        <EntityCombobox
          value={1}
          onChange={() => {}}
          options={OPTIONS}
          clearable
          clearLabel="Auswahl entfernen"
        />
      </German>,
    );
    expect(screen.getByRole("button", { name: "Auswahl entfernen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Leeren" })).not.toBeInTheDocument();
  });

  it("MultiSelect selectAllLabel, while the unset clearLabel still comes from the provider", () => {
    function Picker() {
      const [values, setValues] = useState<(string | number)[]>([]);
      return (
        <MultiSelect
          options={OPTIONS}
          values={values}
          onChange={setValues}
          selectAllLabel="Alle"
        />
      );
    }
    render(
      <German>
        <Picker />
      </German>,
    );
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("button", { name: "Alle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keine" })).toBeInTheDocument();
  });

  it("StepperNav labels", () => {
    function Wizard() {
      const wizard = useWizard({ steps: [{ id: "a", label: "Eins" }, { id: "b", label: "Zwei" }] });
      return (
        <StepperNav wizard={wizard} labels={{ next: "Nächster Schritt" }}>
          <div />
        </StepperNav>
      );
    }
    render(
      <MemoryRouter>
        <German>
          <Wizard />
        </German>
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Nächster Schritt" })).toBeInTheDocument();
  });
});
