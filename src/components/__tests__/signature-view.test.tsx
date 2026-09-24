import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SignatureView } from "../signature-pad";
import { UiKitProvider } from "../../i18n/kit-labels";

/** The read side of SignaturePad: kastlan's handover protocol, reopened after signing. */

const PNG = "data:image/png;base64,STUB";

describe("SignatureView", () => {
  it("shows a saved PNG with no drawing chrome", () => {
    render(<SignatureView value={PNG} label="Tenant" />);
    const img = screen.getByRole("img", { name: "Handwritten signature" });
    expect(img).toHaveAttribute("src", PNG);
    expect(screen.getByRole("figure", { name: "Tenant" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
    expect(document.querySelector("canvas")).toBeNull();
  });

  it("inverts the ink in the dark theme unless told not to", () => {
    const { rerender } = render(<SignatureView value={PNG} />);
    expect(screen.getByRole("img")).toHaveClass("dark:invert");
    rerender(<SignatureView value={PNG} adaptInk={false} />);
    expect(screen.getByRole("img")).not.toHaveClass("dark:invert");
  });

  it("shows a typed name as a signature, named as one", () => {
    render(<SignatureView typedName="  Jane Doe " />);
    const sig = screen.getByRole("img", { name: "Signed with the typed name Jane Doe" });
    expect(sig).toHaveTextContent("Jane Doe");
  });

  it("prefers the PNG over a typed name, and says when there is neither", () => {
    const { rerender } = render(<SignatureView value={PNG} typedName="Jane" />);
    expect(screen.getByRole("img", { name: "Handwritten signature" })).toBeInTheDocument();
    rerender(<SignatureView value={null} />);
    expect(screen.getByText("Not signed")).toBeInTheDocument();
    expect(screen.getByRole("figure")).toHaveAttribute("data-empty", "true");
  });

  it("hides the caption with `label={null}` and translates through the provider", () => {
    render(
      <UiKitProvider labels={{ signaturePad: { viewEmpty: "Nicht unterschrieben", label: "Unterschrift" } }}>
        <SignatureView label={null} />
        <SignatureView />
      </UiKitProvider>,
    );
    expect(screen.getAllByText("Nicht unterschrieben")).toHaveLength(2);
    expect(screen.getAllByText("Unterschrift")).toHaveLength(1);
  });
});
