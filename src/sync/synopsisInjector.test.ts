import { describe, it, expect } from "vitest";
import { composeWithSynopsis } from "./synopsisInjector";

describe("composeWithSynopsis", () => {
  it("inserts at the head when there is no frontmatter", () => {
    const out = composeWithSynopsis("body line\n", "summary", null);
    expect(out).toBe("summary\n\nbody line\n");
  });

  it("inserts after frontmatter and a blank line", () => {
    const fm = "---\ntitle: x\n---\n";
    const body = "body line\n";
    const out = composeWithSynopsis(fm + body, "summary", fm.length);
    expect(out).toBe(fm + "\nsummary\n\nbody line\n");
  });

  it("does not duplicate existing newlines after frontmatter", () => {
    const fm = "---\ntitle: x\n---\n\n";
    const body = "body line\n";
    const out = composeWithSynopsis(fm + body, "summary", fm.length);
    // does not strip; just inserts as a fresh paragraph
    expect(out.startsWith(fm)).toBe(true);
    expect(out.includes("summary\n\nbody line")).toBe(true);
  });

  it("handles multi-line synopsis", () => {
    const out = composeWithSynopsis("body\n", "line1\nline2", null);
    expect(out).toBe("line1\nline2\n\nbody\n");
  });

  it("handles empty file", () => {
    const out = composeWithSynopsis("", "s", null);
    expect(out).toBe("s\n");
  });
});
