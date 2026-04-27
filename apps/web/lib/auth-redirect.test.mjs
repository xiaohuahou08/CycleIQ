import test from "node:test";
import assert from "node:assert/strict";
import {
  isAuthRoute,
  isProtectedRoute,
  resolveAuthRedirect,
  safeInternalRedirectPath,
} from "./auth-redirect.mjs";

test("isProtectedRoute identifies protected app routes", () => {
  assert.equal(isProtectedRoute("/dashboard"), true);
  assert.equal(isProtectedRoute("/dashboard/settings"), true);
  assert.equal(isProtectedRoute("/cycles"), true);
  assert.equal(isProtectedRoute("/reports/summary"), true);
  assert.equal(isProtectedRoute("/settings"), true);
  assert.equal(isProtectedRoute("/orders"), true);
  assert.equal(isProtectedRoute("/login"), false);
  assert.equal(isProtectedRoute("/"), false);
});

test("isAuthRoute identifies login and register routes", () => {
  assert.equal(isAuthRoute("/login"), true);
  assert.equal(isAuthRoute("/register"), true);
  assert.equal(isAuthRoute("/dashboard"), false);
});

test("safeInternalRedirectPath allows only known in-app targets", () => {
  assert.equal(safeInternalRedirectPath("/cycles"), "/cycles");
  assert.equal(safeInternalRedirectPath("/dashboard/foo"), "/dashboard/foo");
  assert.equal(safeInternalRedirectPath(null), null);
  assert.equal(safeInternalRedirectPath("//evil.com"), null);
  assert.equal(safeInternalRedirectPath("https://evil.com"), null);
  assert.equal(safeInternalRedirectPath("/login"), null);
  assert.equal(safeInternalRedirectPath("/open-redirect"), null);
});

test("resolveAuthRedirect sends unauthenticated users to /login with next", () => {
  assert.equal(resolveAuthRedirect("/dashboard", false), "/login?next=%2Fdashboard");
  assert.equal(resolveAuthRedirect("/cycles", false), "/login?next=%2Fcycles");
});

test("resolveAuthRedirect sends authenticated users away from auth pages", () => {
  assert.equal(resolveAuthRedirect("/login", true, null), "/dashboard");
  assert.equal(resolveAuthRedirect("/register", true, null), "/dashboard");
});

test("resolveAuthRedirect honors next for authenticated auth-page visits", () => {
  assert.equal(resolveAuthRedirect("/login", true, "/cycles"), "/cycles");
  assert.equal(resolveAuthRedirect("/register", true, "/settings"), "/settings");
});

test("resolveAuthRedirect returns null when no redirect is needed", () => {
  assert.equal(resolveAuthRedirect("/login", false), null);
  assert.equal(resolveAuthRedirect("/register", false), null);
  assert.equal(resolveAuthRedirect("/dashboard", true), null);
  assert.equal(resolveAuthRedirect("/", false), null);
});
