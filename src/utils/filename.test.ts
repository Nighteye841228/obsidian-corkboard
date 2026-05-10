import { describe, it, expect } from "vitest";
import { nextUntitled } from "./filename";

describe("nextUntitled", () => {
  it("returns Untitled-1.md when none exist", () => {
    expect(nextUntitled([])).toBe("Untitled-1.md");
  });

  it("returns Untitled-2.md when Untitled-1 exists", () => {
    expect(nextUntitled(["Untitled-1.md"])).toBe("Untitled-2.md");
  });

  it("fills the first gap", () => {
    expect(nextUntitled(["Untitled-1.md", "Untitled-3.md"])).toBe("Untitled-2.md");
  });

  it("ignores unrelated names", () => {
    expect(nextUntitled(["foo.md", "bar.md"])).toBe("Untitled-1.md");
  });

  it("ignores wrong extensions", () => {
    expect(nextUntitled(["Untitled-1.txt"])).toBe("Untitled-1.md");
  });
});
