import { test } from "node:test";
import assert from "node:assert/strict";
import { validateContactForm } from "./validateContactForm";

test("returns error when name is empty", () => {
  const errors = validateContactForm({
    name: "",
    email: "a@b.com",
    subject: "",
    message: "hi",
  });
  assert.equal(errors.name, "Vui lòng nhập tên của bạn");
});

test("returns error when email is missing", () => {
  const errors = validateContactForm({
    name: "A",
    email: "",
    subject: "",
    message: "hi",
  });
  assert.equal(errors.email, "Vui lòng nhập email");
});

test("returns error when email is invalid", () => {
  const errors = validateContactForm({
    name: "A",
    email: "not-an-email",
    subject: "",
    message: "hi",
  });
  assert.equal(errors.email, "Email không hợp lệ");
});

test("returns error when message is empty", () => {
  const errors = validateContactForm({
    name: "A",
    email: "a@b.com",
    subject: "",
    message: "",
  });
  assert.equal(errors.message, "Vui lòng nhập nội dung");
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
