import type { ReactElement } from "react";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Save } from "lucide-react";
import { Button } from "../button";
import { IconButton } from "../icon-button";
import { Chip } from "../chip";
import type { DisabledReasonDisplay } from "../field-parts";

/**
 * A button whose `disabledReason` arrives or lifts while it holds the focus (0.66 browser
 * probe, 2026-11-23): Button, IconButton and Chip draw the control bare while unlocked and
 * in LockedReason's frame while locked, so the flip remounts it, and real Chromium dropped
 * the focus to <body> on the showcase's "Lock saving" switch. The focus goes to the new
 * control, both ways.
 */

const noop = () => {};

const BUTTONS: Record<string, (reason: string | undefined, display: DisabledReasonDisplay) => ReactElement> = {
  Button: (reason, display) => (
    <Button onClick={noop} disabledReason={reason} disabledReasonDisplay={display}>
      Save
    </Button>
  ),
  IconButton: (reason, display) => (
    <IconButton label="Save" onClick={noop} disabledReason={reason} disabledReasonDisplay={display}>
      <Save />
    </IconButton>
  ),
  Chip: (reason, display) => (
    <Chip onClick={noop} disabledReason={reason} disabledReasonDisplay={display}>
      Save
    </Chip>
  ),
};

describe.each(["tooltip", "line"] as const)("a disabledReason flipping under a focused button (%s)", (display) => {
  it.each(Object.keys(BUTTONS))("%s keeps the focus", (name) => {
    const at = BUTTONS[name];
    const { rerender } = render(at(undefined, display));
    act(() => screen.getByRole("button", { name: "Save" }).focus());
    rerender(at("Saving is locked", display));
    const locked = screen.getByRole("button", { name: "Save" });
    expect(document.activeElement, "focus is not on <body> once locked").toBe(locked);
    rerender(at(undefined, display));
    expect(document.activeElement, "focus is not on <body> once unlocked").toBe(
      screen.getByRole("button", { name: "Save" }),
    );
  });
});
