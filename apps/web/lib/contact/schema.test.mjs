import assert from "node:assert/strict";
import test from "node:test";
import { parseContactForm } from "./schema.ts";

test("parseContactForm accepts valid payload", () => {
  const result = parseContactForm({
    name: "Jane Doe",
    email: "jane@example.com",
    subject: "Billing question",
    message: "Hello, I have a question about my subscription.",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.name, "Jane Doe");
    assert.equal(result.data.email, "jane@example.com");
    assert.equal(result.data.subject, "Billing question");
  }
});

test("parseContactForm rejects short message", () => {
  const result = parseContactForm({
    name: "Jane",
    email: "jane@example.com",
    message: "Hi",
  });
  assert.equal(result.ok, false);
});

test("parseContactForm treats honeypot as quiet spam", () => {
  const result = parseContactForm({
    name: "Jane Doe",
    email: "jane@example.com",
    message: "This is a long enough message.",
    _gotcha: "spam",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.spam, true);
  }
});

test("parseContactForm treats empty subject as undefined", () => {
  const result = parseContactForm({
    name: "Jane Doe",
    email: "jane@example.com",
    subject: "",
    message: "This is a long enough message.",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.subject, undefined);
  }
});
