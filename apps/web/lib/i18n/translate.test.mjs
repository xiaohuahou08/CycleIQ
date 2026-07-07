import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { translate } = await import("./translate.ts");

describe("translate", () => {
  const tree = {
    greeting: "Hello {{name}}",
    nested: {
      key: "Value",
    },
  };

  it("resolves nested keys", () => {
    assert.equal(translate(tree, "nested.key"), "Value");
  });

  it("interpolates placeholders", () => {
    assert.equal(translate(tree, "greeting", { name: "World" }), "Hello World");
  });

  it("falls back to fallback tree", () => {
    assert.equal(translate({}, "nested.key", undefined, tree), "Value");
  });

  it("returns key when missing everywhere", () => {
    assert.equal(translate({}, "missing.key"), "missing.key");
  });
});
