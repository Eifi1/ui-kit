import { render, screen } from "@testing-library/react";
import { UiKitProvider } from "../../i18n/kit-labels";
import { FeedbackAttachmentField } from "../feedback-attachment";

/**
 * The attachment field's strings come from the provider (0.7.0). Before, its two
 * optional keys — the capture button and the paste hint — fell back to hard-coded
 * English, so a German app configured through `<UiKitProvider labels>` still showed
 * "Capture screenshot" under a German form.
 */
const capture = async () => null;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FeedbackAttachmentField labels", () => {
  it("reads the provider's `feedbackAttachment` namespace", () => {
    render(
      <UiKitProvider
        labels={{
          feedbackAttachment: {
            attachmentAdd: "Bild anhängen",
            attachmentCapture: "Screenshot aufnehmen",
            attachmentPaste: "…oder einfügen.",
          },
        }}
      >
        <FeedbackAttachmentField value={null} onChange={() => {}} onCaptureScreenshot={capture} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: /Bild anhängen/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Screenshot aufnehmen/ })).toBeInTheDocument();
    expect(screen.getByText("…oder einfügen.")).toBeInTheDocument();
  });

  it("lets the prop win over the provider, and falls back to English without either", () => {
    render(
      <UiKitProvider labels={{ feedbackAttachment: { attachmentCapture: "Screenshot aufnehmen" } }}>
        <FeedbackAttachmentField
          value={null}
          onChange={() => {}}
          onCaptureScreenshot={capture}
          labels={{ attachmentCapture: "Snap it" }}
        />
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: /Snap it/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Attach image/ })).toBeInTheDocument();
  });

  it("names the remove button from the provider too", () => {
    // jsdom has no object URLs; the preview effect needs one.
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:x");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    render(
      <UiKitProvider labels={{ feedbackAttachment: { attachmentRemove: "Anhang entfernen" } }}>
        <FeedbackAttachmentField value={new File(["x"], "a.txt", { type: "text/plain" })} onChange={() => {}} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Anhang entfernen" })).toBeInTheDocument();
  });
});
