import { describe, expect, it } from "vitest";

import { ALPHABET, createId, id, shortId, tinyId } from "./index";

describe("boubakikid", () => {
  it("generates IDs of correct length", () => {
    expect(id()).toHaveLength(13);
    expect(shortId()).toHaveLength(9);
    expect(tinyId()).toHaveLength(7);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => id()));
    expect(ids.size).toBe(1000);
  });

  it("only uses characters from the alphabet", () => {
    const pattern = new RegExp(`^[${ALPHABET}]+$`);
    for (let i = 0; i < 100; i++) {
      expect(id()).toMatch(pattern);
      expect(shortId()).toMatch(pattern);
      expect(tinyId()).toMatch(pattern);
    }
  });

  it("excludes angular characters", () => {
    expect(ALPHABET).not.toContain("k");
    expect(ALPHABET).not.toContain("v");
    expect(ALPHABET).not.toContain("w");
    expect(ALPHABET).not.toContain("x");
    expect(ALPHABET).not.toContain("z");
  });

  it("createId generates custom length", () => {
    const gen = createId(21);
    expect(gen()).toHaveLength(21);
  });
});
