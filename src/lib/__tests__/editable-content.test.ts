import { afterEach, describe, expect, it } from "vitest";
import { isEditableContent } from "../editable-content";

/**
 * The one editable-content rule (0.54 follow-up): what `useHotkey`, the tour, the bulk
 * bar and the clipboard each ask, answered from the attributes where the engine has no
 * `isContentEditable` — jsdom here. Each caller has its own test beside it.
 */
describe("isEditableContent", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  const at = (id: string) => isEditableContent(document.getElementById(id)!);

  it('edits under "", "true" in any case and "plaintext-only", children and invalid values inheriting', () => {
    document.body.innerHTML = `
      <div contenteditable id="empty"><p><b id="child">bold</b></p></div>
      <div contenteditable="TRUE" id="upper"></div>
      <div contenteditable="plaintext-only" id="plain"></div>
      <div contenteditable="true"><span contenteditable="bogus" id="invalid">inherits</span></div>
      <div contenteditable="true"><svg><circle id="svg"></circle></svg></div>`;
    for (const id of ["empty", "child", "upper", "plain", "invalid", "svg"]) expect(at(id), id).toBe(true);
  });

  it('does not edit under "false", an island of it in an editor, or with no attribute at all', () => {
    document.body.innerHTML = `
      <div contenteditable="true"><span contenteditable="false" id="island"><b id="in-island">chip</b></span></div>
      <div contenteditable="false"><span contenteditable="bogus" id="under-false">x</span></div>
      <div id="plain-div">not editable</div>`;
    for (const id of ["island", "in-island", "under-false", "plain-div"]) expect(at(id), id).toBe(false);
  });

  it("takes the engine's own isContentEditable where there is one", () => {
    document.body.innerHTML = `<div contenteditable="true" id="said-no"></div><div id="said-yes"></div>`;
    Object.defineProperty(document.getElementById("said-no")!, "isContentEditable", { value: false });
    Object.defineProperty(document.getElementById("said-yes")!, "isContentEditable", { value: true });
    expect(at("said-no")).toBe(false);
    expect(at("said-yes")).toBe(true);
  });

  it("edits everywhere in a designMode document but its contenteditable=false parts", () => {
    document.body.innerHTML = `<p id="text">x</p><span contenteditable="false" id="locked">y</span>`;
    Object.defineProperty(document, "designMode", { value: "on", configurable: true });
    try {
      expect(at("text")).toBe(true);
      expect(at("locked")).toBe(false);
    } finally {
      delete (document as { designMode?: string }).designMode;
    }
  });
});
