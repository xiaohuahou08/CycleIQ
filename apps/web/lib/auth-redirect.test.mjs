import test from "node:test";
import assert from "node:assert/strict";
import { isAuthRoute, isProtectedRoute, resolveAuthRedirect } from "./auth-redirect.mjs";

test("isProtectedRoute identifies dashboard routes", () => {
  assert.equal(isProtectedRoute("/dashboard"), true);
  assert.equal(isProtectedRoute("/dashboard/settings"), true);
  assert.equal(isProtectedRoute("/login"), false);
});

test("isAuthRoute identifies login and register routes", () => {
  assert.equal(isAuthRoute("/login"), true);
  assert.equal(isAuthRoute("/register"), true);
  assert.equal(isAuthRoute("/dashboard"), false);
});

test("resolveAuthRedirect sends unauthenticated users to /login for protected routes", () => {
  assert.equal(resolveAuthRedirect("/dashboard", false), "/login");
  assert.equal(resolveAuthRedirect("/dashboard/positions", false), "/login");
});

test("resolveAuthRedirect sends authenticated users away from auth pages", () => {
  assert.equal(resolveAuthRedirect("/login", true), "/dashboard");
  assert.equal(resolveAuthRedirect("/register", true), "/dashboard");
});

test("resolveAuthRedirect returns null when no redirect is needed", () => {
  assert.equal(resolveAuthRedirect("/login", false), null);
  assert.equal(resolveAuthRedirect("/register", false), null);
  assert.equal(resolveAuthRedirect("/dashboard", true), null);
  assert.equal(resolveAuthRedirect("/", false), null);
});
