import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAVE_BLOB_REVOKE_MS, clickDownload, filenameFromDisposition, saveBlob } from "../download";

/**
 * Round 0.34 C6 (KS U5): one blob download and one reading of `Content-Disposition`,
 * where the kit had three inline downloads in three spellings and nothing that read the
 * header — so a name in any script that server-kit put in `filename*` was saved as its
 * ASCII stand-in.
 */

describe("filenameFromDisposition", () => {
  it("reads server-kit's header: the original name from filename*, not the ASCII stand-in", () => {
    // What `content_disposition("Grün – Bericht.pdf")` writes from server-kit 0.8.
    expect(
      filenameFromDisposition(
        `attachment; filename="Grun - Bericht.pdf"; filename*=UTF-8''Gr%C3%BCn%20%E2%80%93%20Bericht.pdf`,
      ),
    ).toBe("Grün – Bericht.pdf");
    expect(filenameFromDisposition(`attachment; filename="__.pdf"; filename*=UTF-8''%E6%8A%A5%E5%91%8A.pdf`)).toBe(
      "报告.pdf",
    );
  });

  it("prefers filename* whichever comes first, and reads its name case-insensitively", () => {
    expect(filenameFromDisposition(`attachment; FILENAME*=utf-8''r%C3%A9sum%C3%A9.txt; filename="resume.txt"`)).toBe(
      "résumé.txt",
    );
  });

  it("falls back to filename=, quoted or not", () => {
    expect(filenameFromDisposition(`attachment; filename="report 2026.csv"`)).toBe("report 2026.csv");
    expect(filenameFromDisposition("attachment; filename=report.csv")).toBe("report.csv");
    expect(filenameFromDisposition("inline;filename=report.csv;size=12")).toBe("report.csv");
  });

  it("reads a quoted string as one value: its semicolons, its escapes", () => {
    expect(filenameFromDisposition(`attachment; filename="a;b \\"c\\".txt"; size=3`)).toBe(`a;b "c".txt`);
  });

  it("falls back from a filename* it cannot decode to filename=", () => {
    expect(filenameFromDisposition(`attachment; filename*=UTF-8''bad%E2%80.txt; filename="plain.txt"`)).toBe(
      "plain.txt",
    );
    expect(filenameFromDisposition(`attachment; filename*=x-unknown''abc.txt; filename="plain.txt"`)).toBe("plain.txt");
    expect(filenameFromDisposition(`attachment; filename*=no-quotes.txt; filename="plain.txt"`)).toBe("plain.txt");
  });

  it("reads an ISO-8859-1 filename*", () => {
    expect(filenameFromDisposition(`attachment; filename*=iso-8859-1'de'Gr%FCn.txt`)).toBe("Grün.txt");
  });

  it("drops directory parts and control characters (RFC 6266 §4.3)", () => {
    expect(filenameFromDisposition(`attachment; filename="../../etc/passwd"`)).toBe("passwd");
    expect(filenameFromDisposition(`attachment; filename*=UTF-8''..%2F..%5Cevil.exe`)).toBe("evil.exe");
    expect(filenameFromDisposition(`attachment; filename*=UTF-8''a%0Ab.txt`)).toBe("ab.txt");
  });

  it("never throws: no header, no name, or nothing left gives the fallback", () => {
    expect(filenameFromDisposition(null)).toBeUndefined();
    expect(filenameFromDisposition(undefined, "export.json")).toBe("export.json");
    expect(filenameFromDisposition("", "export.json")).toBe("export.json");
    expect(filenameFromDisposition("attachment", "export.json")).toBe("export.json");
    expect(filenameFromDisposition(`attachment; filename=""`, "export.json")).toBe("export.json");
    expect(filenameFromDisposition(`attachment; filename="../"`, "export.json")).toBe("export.json");
    expect(filenameFromDisposition(`attachment; filename=".."`, "export.json")).toBe("export.json");
    expect(filenameFromDisposition(`attachment; filename="unterminated`, "x")).toBe("unterminated");
  });
});

describe("saveBlob", () => {
  let clicks: { href: string; download: string; inBody: boolean; rel: string }[];
  const created: string[] = [];
  const revoked: string[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    clicks = [];
    created.length = 0;
    revoked.length = 0;
    URL.createObjectURL = vi.fn(() => {
      const url = `blob:test/${created.length + 1}`;
      created.push(url);
      return url;
    });
    URL.revokeObjectURL = vi.fn((url: string) => {
      revoked.push(url);
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push({
        href: this.getAttribute("href") ?? "",
        download: this.download,
        inBody: document.body.contains(this),
        rel: this.rel,
      });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("clicks one attached link named for the file, and leaves nothing behind in the page", () => {
    saveBlob(new Blob(["{}"], { type: "application/json" }), "export.json");
    expect(clicks).toEqual([{ href: "blob:test/1", download: "export.json", inBody: true, rel: "noopener" }]);
    expect(document.querySelectorAll("a[download]")).toHaveLength(0);
  });

  it("revokes the URL a minute later, not while the browser may still be reading it", () => {
    saveBlob(new Blob(["x"]), "x.txt");
    vi.advanceTimersByTime(0);
    expect(revoked).toEqual([]);
    vi.advanceTimersByTime(SAVE_BLOB_REVOKE_MS);
    expect(revoked).toEqual(["blob:test/1"]);
  });

  it("clickDownload hands over a URL the caller keeps, and revokes nothing", () => {
    clickDownload("/api/export?sig=abc", "account.json");
    vi.advanceTimersByTime(SAVE_BLOB_REVOKE_MS);
    expect(clicks).toEqual([{ href: "/api/export?sig=abc", download: "account.json", inBody: true, rel: "noopener" }]);
    expect(revoked).toEqual([]);
  });
});
