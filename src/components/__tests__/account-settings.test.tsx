import { render, screen } from "@testing-library/react";
import { ProfileSetting } from "../account-settings";

const LABELS = {
  title: "Profile",
  email: "Email",
  role: "Role",
  memberSince: "Member since",
  displayName: "Display name",
  save: "Save",
};

describe("ProfileSetting", () => {
  it("gives each instance its own field id (0.7.0)", () => {
    // It was the literal "display-name": two on one page shared an id, and the second
    // label pointed at the first field.
    render(
      <>
        <ProfileSetting value="Ada" onChange={() => {}} onSave={() => {}} labels={LABELS} />
        <ProfileSetting value="Bob" onChange={() => {}} onSave={() => {}} labels={LABELS} />
      </>,
    );
    const [a, b] = screen.getAllByLabelText("Display name");
    expect(a).toHaveValue("Ada");
    expect(b).toHaveValue("Bob");
    expect(a.id).not.toBe(b.id);
    expect(a.id).not.toBe("display-name");
  });
});
