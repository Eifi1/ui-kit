import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FileDropzone } from "../file-dropzone";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

/**
 * An OPTIONAL peer may only be imported where it is actually used.
 *
 * `package.json` marks `sonner` `peerDependenciesMeta.optional`, which is a promise
 * to consumers: install `@hb/ui` without it and everything you do not use still
 * resolves. `file-dropzone.tsx` broke that promise with a top-level `import { toast }
 * from "sonner"` — and the barrel re-exports that module, so `import { Button } from
 * "@hb/ui"` pulled it in, and `tsc --noEmit` failed on the missing types, in an app
 * with no dropzone in it. Nothing showed, because both consumers happen to depend on
 * sonner anyway.
 *
 * `use-wizard.ts` had already decided this question the other way and written the
 * reason down ("imported here, on the failure path only, so an app that never trips
 * this never has to install it"). Two modules, one package, opposite answers. The
 * sweep at the bottom is what keeps them from diverging again — it is the only thing
 * that can fail here for a consumer whose install we cannot run from inside this one.
 */
const ZIP = () => new File(["x"], "budget.zip", { type: "application/zip" });

function renderDropzone(props: Partial<Parameters<typeof FileDropzone>[0]> = {}) {
  return render(
    <FileDropzone
      file={null}
      onFileSelected={vi.fn()}
      accept=".zip"
      isValid={() => false}
      invalidMessage="Nur .zip-Dateien"
      dropLabel="Drop a file"
      browseLabel="Browse"
      emptyLabel="Nothing yet"
      hint="A YNAB export"
      {...props}
    />,
  );
}

/** A drop, as the browser delivers it. */
function drop(el: Element, file: File) {
  fireEvent.drop(el, { dataTransfer: { files: [file], types: ["Files"] } });
}

describe("FileDropzone's rejection path", () => {
  it("hands the rejected file to onInvalid when the host supplies one", () => {
    const onInvalid = vi.fn();
    const onFileSelected = vi.fn();
    renderDropzone({ onInvalid, onFileSelected });
    const file = ZIP();
    drop(screen.getByRole("button", { name: "Drop a file" }), file);
    expect(onInvalid).toHaveBeenCalledWith(file);
    expect(onFileSelected).not.toHaveBeenCalled();
  });

  it("falls back to a sonner toast when it does not", async () => {
    const { toast } = await import("sonner");
    renderDropzone();
    drop(screen.getByRole("button", { name: "Drop a file" }), ZIP());
    // The import is dynamic now, so the toast lands a microtask later.
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Nur .zip-Dateien"));
  });

  it("still accepts a valid file", () => {
    const onFileSelected = vi.fn();
    const file = ZIP();
    renderDropzone({ isValid: () => true, onFileSelected });
    drop(screen.getByRole("button", { name: "Drop a file" }), file);
    expect(onFileSelected).toHaveBeenCalledWith(file);
  });
});

describe("no module imports sonner statically", () => {
  // Same trick the `invalid` sweep uses: Vite inlines these at build time, so
  // reading the package's own source costs nothing at run.
  const SOURCES = import.meta.glob<string>("../../**/*.{ts,tsx}", {
    query: "?raw",
    import: "default",
    eager: true,
  });

  /** A value import of `sonner` — `[^;]*` spans the newlines of a braced list, and
   *  the `m` flag anchors each candidate to the start of its own line. */
  const STATIC_SONNER = /^\s*import\s[^;]*?["']sonner["']/m;

  it("finds no module that does", () => {
    const offenders = Object.entries(SOURCES)
      .filter(([path]) => !path.includes("__tests__"))
      .filter(([, src]) => STATIC_SONNER.test(src))
      .map(([path]) => path.split("/").pop());
    expect(offenders).toEqual([]);
  });

  it("is not vacuous: the sweep can see a static import, and is reading real files", () => {
    // If the pattern were wrong — and the first draft of it was, over-escaped and
    // matching nothing — the test above would pass for a package that imported
    // sonner in every module.
    expect(STATIC_SONNER.test(`import { toast } from "sonner";\n`)).toBe(true);
    expect(STATIC_SONNER.test(`import {\n  toast,\n} from "sonner";\n`)).toBe(true);
    expect(STATIC_SONNER.test(`const { toast } = await import("sonner");\n`)).toBe(false);
    // And it really is looking at this package: `recharts`, the OTHER optional peer,
    // is imported statically by `components/chart.tsx` on purpose — the tree-shaking
    // note in package.json is about exactly that — so a sweep that could not see it
    // could not see anything either.
    const recharts = Object.values(SOURCES).filter((src) =>
      /^\s*import\s[^;]*?["']recharts["']/m.test(src),
    );
    expect(recharts.length).toBeGreaterThan(0);
    expect(Object.keys(SOURCES).length).toBeGreaterThan(40);
  });
});
