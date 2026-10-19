import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axeViolations } from "../../test/axe";
import { SharedComputerChoice, isSharedComputer, setSharedComputer } from "../shared-computer";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

describe("isSharedComputer / setSharedComputer", () => {
  it("is false until chosen, and is held for this tab only (sessionStorage)", () => {
    expect(isSharedComputer()).toBe(false);
    setSharedComputer(true);
    expect(isSharedComputer()).toBe(true);
    expect(window.localStorage.length).toBe(0);
    setSharedComputer(false);
    expect(isSharedComputer()).toBe(false);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("is false, and setting does nothing, when storage is unavailable", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("SecurityError");
      },
      removeItem: () => {
        throw new Error("SecurityError");
      },
    });
    expect(() => setSharedComputer(true)).not.toThrow();
    expect(isSharedComputer()).toBe(false);
  });
});

describe("SharedComputerChoice", () => {
  it("is a labelled checkbox with its one-line hint, storing the choice", () => {
    const onCheckedChange = vi.fn();
    render(<SharedComputerChoice onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole("checkbox", { name: "This is a shared computer" });
    expect(box).toHaveAccessibleDescription(/No copy of your data stays on this device/);
    expect(box).not.toBeChecked();
    fireEvent.click(box);
    expect(box).toBeChecked();
    expect(isSharedComputer()).toBe(true);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("starts from the stored choice", () => {
    setSharedComputer(true);
    render(<SharedComputerChoice />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("is axe-clean", async () => {
    const { container } = render(<SharedComputerChoice />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("the choice beside a persistent session (B3)", () => {
  afterEach(() => window.localStorage.clear());

  it("lives in localStorage with storage: \"local\", outliving the tab, until set false", () => {
    setSharedComputer(true, { storage: "local" });
    expect(window.localStorage.length).toBe(1);
    window.sessionStorage.clear(); // the tab closed
    expect(isSharedComputer()).toBe(true);
    setSharedComputer(false);
    expect(isSharedComputer()).toBe(false);
    expect(window.localStorage.length + window.sessionStorage.length).toBe(0);
  });

  it("one place at a time: choosing again moves it", () => {
    setSharedComputer(true);
    setSharedComputer(true, { storage: "local" });
    expect(window.sessionStorage.length).toBe(0);
    setSharedComputer(true, { storage: "session" });
    expect(window.localStorage.length).toBe(0);
    expect(isSharedComputer()).toBe(true);
  });

  it("SharedComputerChoice stores where it is told", () => {
    render(<SharedComputerChoice storage="local" />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(window.localStorage.length).toBe(1);
    expect(window.sessionStorage.length).toBe(0);
  });
});
