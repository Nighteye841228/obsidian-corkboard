import { describe, it, expect, vi } from "vitest";
import { CorkboardDocument } from "../data/corkboardDocument";
import { CorkboardController, VaultGateway } from "./controller";

function makeGateway(): VaultGateway & { listMd: () => string[]; reads: string[] } {
  const files = new Map<string, string>();
  return {
    listMd: () => Array.from(files.keys()).filter(p => p.endsWith(".md")),
    reads: [],
    listFolderMd: vi.fn().mockImplementation(() => Array.from(files.keys()).filter(p => p.endsWith(".md"))),
    create: vi.fn().mockImplementation(async (path: string, content: string) => { files.set(path, content); }),
    delete: vi.fn().mockImplementation(async (path: string) => { files.delete(path); }),
    getFrontmatterEnd: vi.fn().mockReturnValue(null),
    process: vi.fn().mockImplementation(async (path: string, fn: (s: string) => string) => {
      const out = fn(files.get(path) ?? "");
      files.set(path, out);
      return out;
    }),
    exists: (p: string) => files.has(p),
  } as any;
}

describe("CorkboardController", () => {
  it("createCard creates a new md file and appends a card", async () => {
    const doc = CorkboardDocument.parse("");
    const gw = makeGateway();
    const onChange = vi.fn();
    const c = new CorkboardController({ doc, folderPath: "novel", gateway: gw, onChange });
    await c.createCard();
    expect(gw.create).toHaveBeenCalledTimes(1);
    expect(doc.data.cards.length).toBe(1);
    expect(doc.data.cards[0]!.path).toBe("novel/Untitled-1.md");
    expect(onChange).toHaveBeenCalled();
  });

  it("createCard skips existing Untitled-1", async () => {
    const doc = CorkboardDocument.parse("");
    const gw = makeGateway();
    await gw.create!("novel/Untitled-1.md", "");
    const c = new CorkboardController({ doc, folderPath: "novel", gateway: gw, onChange: () => {} });
    await c.createCard();
    expect(doc.data.cards[0]!.path).toBe("novel/Untitled-2.md");
  });

  it("removeCardByPath removes the card", async () => {
    const doc = CorkboardDocument.parse(`{"version":1,"cardWidth":280,"cardHeight":180,"cards":[{"path":"a.md","synopsis":"","status":"todo","color":null}]}`);
    const c = new CorkboardController({ doc, folderPath: "", gateway: makeGateway(), onChange: () => {} });
    c.removeCardByPath("a.md");
    expect(doc.data.cards.length).toBe(0);
  });

  it("reorder mutates and notifies", () => {
    const doc = CorkboardDocument.parse("");
    doc.addCard({ path: "1", synopsis: "", status: "todo", color: null });
    doc.addCard({ path: "2", synopsis: "", status: "todo", color: null });
    const onChange = vi.fn();
    const c = new CorkboardController({ doc, folderPath: "", gateway: makeGateway(), onChange });
    c.reorder(0, 1);
    expect(doc.data.cards.map(x=>x.path)).toEqual(["2","1"]);
    expect(onChange).toHaveBeenCalled();
  });

  it("updateSynopsis updates the right card", () => {
    const doc = CorkboardDocument.parse(`{"version":1,"cardWidth":280,"cardHeight":180,"cards":[{"path":"a.md","synopsis":"old","status":"todo","color":null}]}`);
    const c = new CorkboardController({ doc, folderPath: "", gateway: makeGateway(), onChange: () => {} });
    c.updateSynopsis(0, "new");
    expect(doc.data.cards[0]!.synopsis).toBe("new");
  });

  it("writeSynopsisToMd calls gateway.process with composed content", async () => {
    const doc = CorkboardDocument.parse(`{"version":1,"cardWidth":280,"cardHeight":180,"cards":[{"path":"a.md","synopsis":"summary","status":"todo","color":null}]}`);
    const gw = makeGateway();
    await gw.create!("a.md", "body\n");
    const c = new CorkboardController({ doc, folderPath: "", gateway: gw, onChange: () => {} });
    await c.writeSynopsisToMd(0);
    expect(gw.process).toHaveBeenCalled();
  });

  it("inflight prevents echo on self-initiated create (sync layer queries inflight set)", async () => {
    const doc = CorkboardDocument.parse("");
    const gw = makeGateway();
    const c = new CorkboardController({ doc, folderPath: "novel", gateway: gw, onChange: () => {} });
    const p = c.createCard();
    expect(c.isInflight("novel/Untitled-1.md")).toBe(true);
    await p;
    // queueMicrotask deferral: still considered inflight in same microtask, cleared after flush
    await new Promise<void>(r => queueMicrotask(() => r()));
    expect(c.isInflight("novel/Untitled-1.md")).toBe(false);
  });
});
