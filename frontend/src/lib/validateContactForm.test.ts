import { test } from "node:test";
import assert from "node:assert/strict";
import { validateContactForm } from "./validateContactForm";

test("returns 'required' code when name is empty", () => {
  const errors = validateContactForm({
    name: "",
    email: "a@b.com",
    subject: "",
    message: "hi",
  });
  assert.equal(errors.name, "required");
});

test("returns 'required' code when email is missing", () => {
  const errors = validateContactForm({
    name: "A",
    email: "",
    subject: "",
    message: "hi",
  });
  assert.equal(errors.email, "required");
});

test("returns 'invalid' code when email is malformed", () => {
  const errors = validateContactForm({
    name: "A",
    email: "not-an-email",
    subject: "",
    message: "hi",
  });
  assert.equal(errors.email, "invalid");
});

test("returns 'required' code when message is empty", () => {
  const errors = validateContactForm({
    name: "A",
    email: "a@b.com",
    subject: "",
    message: "",
  });
  assert.equal(errors.message, "required");
});

test("returns no errors for valid input", () => {
  const errors = validateContactForm({
    name: "A",
    email: "a@b.com",
    subject: "Hi",
    message: "Hello",
  });
  assert.deepEqual(errors, {});
});
