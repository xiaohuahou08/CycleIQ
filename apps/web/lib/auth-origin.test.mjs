import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  oauthCallbackUrlForOrigin,
  resolveConfiguredAuthOrigin,
  resolveRequestOrigin,
} from "./auth-origin.ts";

describe("resolveRequestOrigin", () => {
  it("prefers x-forwarded-host on Vercel preview", () => {
    const request = new Request("http://internal/auth/google", {
      headers: {
        "x-forwarded-host": "cycle-iq-git-dev-acme.vercel.app",
        "x-forwarded-proto": "https",
      },
    });
    assert.equal(resolveRequestOrigin(request), "https://cycle-iq-git-dev-acme.vercel.app");
  });
});

describe("resolveConfiguredAuthOrigin", () => {
  it("uses NEXT_PUBLIC_VERCEL_URL on preview builds", () => {
    const prevSite = process.env.NEXT_PUBLIC_SITE_URL;
    const prevVercel = process.env.NEXT_PUBLIC_VERCEL_URL;
    const prevEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
    try {
      process.env.NEXT_PUBLIC_SITE_URL = "https://cycleiq.xyz";
      process.env.NEXT_PUBLIC_VERCEL_URL = "cycle-iq-git-dev-acme.vercel.app";
      process.env.NEXT_PUBLIC_VERCEL_ENV = "preview";
      assert.equal(
        resolveConfiguredAuthOrigin(),
        "https://cycle-iq-git-dev-acme.vercel.app",
      );
    } finally {
      process.env.NEXT_PUBLIC_SITE_URL = prevSite;
      process.env.NEXT_PUBLIC_VERCEL_URL = prevVercel;
      process.env.NEXT_PUBLIC_VERCEL_ENV = prevEnv;
    }
  });
});

describe("oauthCallbackUrlForOrigin", () => {
  it("builds path-only callback without query params", () => {
    assert.equal(
      oauthCallbackUrlForOrigin("https://cycle-iq-git-dev-acme.vercel.app"),
      "https://cycle-iq-git-dev-acme.vercel.app/auth/callback",
    );
  });
});
