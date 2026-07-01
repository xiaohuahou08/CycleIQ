import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeSupabaseProjectUrl,
  supabaseUrlHadPathSuffix,
} from "./env.ts";

describe("normalizeSupabaseProjectUrl", () => {
  it("keeps a correct project origin", () => {
    assert.equal(
      normalizeSupabaseProjectUrl("https://iflpxakkvhfrjhctwgci.supabase.co"),
      "https://iflpxakkvhfrjhctwgci.supabase.co",
    );
  });

  it("strips /auth/v1/callback suffix that breaks OAuth URLs", () => {
    assert.equal(
      normalizeSupabaseProjectUrl(
        "https://iflpxakkvhfrjhctwgci.supabase.co/auth/v1/callback",
      ),
      "https://iflpxakkvhfrjhctwgci.supabase.co",
    );
  });

  it("strips trailing slashes", () => {
    assert.equal(
      normalizeSupabaseProjectUrl("https://iflpxakkvhfrjhctwgci.supabase.co/"),
      "https://iflpxakkvhfrjhctwgci.supabase.co",
    );
  });
});

describe("supabaseUrlHadPathSuffix", () => {
  it("detects misconfigured callback path", () => {
    assert.equal(
      supabaseUrlHadPathSuffix(
        "https://iflpxakkvhfrjhctwgci.supabase.co/auth/v1/callback",
      ),
      true,
    );
    assert.equal(
      supabaseUrlHadPathSuffix("https://iflpxakkvhfrjhctwgci.supabase.co"),
      false,
    );
  });
});
