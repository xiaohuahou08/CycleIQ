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
        "x-forwarded-host": "cycle-nijyt74bo-xiaohuahou-4977s-projects.vercel.app",
        "x-forwarded-proto": "https",
      },
    });
    assert.equal(resolveRequestOrigin(request), "https://cycle-nijyt74bo-xiaohuahou-4977s-projects.vercel.app");
  });

  it("falls back to Host header", () => {
    const request = new Request("http://127.0.0.1/auth/google", {
      headers: { host: "cycle-nijyt74bo-xiaohuahou-4977s-projects.vercel.app" },
    });
    assert.equal(resolveRequestOrigin(request), "https://cycle-nijyt74bo-xiaohuahou-4977s-projects.vercel.app");
  });

  it("falls back to VERCEL_URL when headers are missing", () => {
    const prev = process.env.VERCEL_URL;
    try {
      process.env.VERCEL_URL = "cycle-iq-git-dev-acme.vercel.app";
      const request = new Request("http://127.0.0.1:3000/auth/google");
      assert.equal(resolveRequestOrigin(request), "https://cycle-iq-git-dev-acme.vercel.app");
    } finally {
      process.env.VERCEL_URL = prev;
    }
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
