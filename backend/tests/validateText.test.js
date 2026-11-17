import { describe, test, expect } from "@jest/globals";
import {
  validateText,
  validateProductName,
  validateProductDescription,
} from "../utils/validateText.js";

describe("validateProductName", () => {
  test("accepts letters, numbers, and spaces", () => {
    expect(validateProductName("Teak Chair 2")).toBeNull();
  });

  test("accepts exactly 100 characters", () => {
    expect(validateProductName("a".repeat(100))).toBeNull();
  });

  test("rejects more than 100 characters", () => {
    expect(validateProductName("a".repeat(101))).toBe(
      "name must be 100 characters or fewer"
    );
  });

  test("rejects an empty or whitespace-only name", () => {
    expect(validateProductName("")).toBe("name is required");
    expect(validateProductName("   ")).toBe("name is required");
  });

  test("rejects values that aren't strings", () => {
    expect(validateProductName(undefined)).toBe("name is required");
    expect(validateProductName(null)).toBe("name is required");
    expect(validateProductName(123)).toBe("name is required");
  });

  test.each(["Chair!!", "Chair-Pro", "<script>", "Café", "Chair\nPro"])(
    "rejects disallowed characters in %j",
    (value) => {
      expect(validateProductName(value)).toBe(
        "name contains characters that aren't allowed"
      );
    }
  );
});

describe("validateProductDescription", () => {
  test("accepts a normal sentence with punctuation", () => {
    expect(
      validateProductDescription("Works great, minor scratches. Price: $20 (firm)!")
    ).toBeNull();
  });

  test("accepts line breaks", () => {
    expect(validateProductDescription("Line one\nLine two")).toBeNull();
  });

  test("accepts exactly 1000 characters", () => {
    expect(validateProductDescription("a".repeat(1000))).toBeNull();
  });

  test("rejects more than 1000 characters", () => {
    expect(validateProductDescription("a".repeat(1001))).toBe(
      "description must be 1000 characters or fewer"
    );
  });

  test("rejects an empty description", () => {
    expect(validateProductDescription("  ")).toBe("description is required");
  });

  test.each(["<b>bold</b>", "a/b", "email@example.com", "x = y", "50% * 2"])(
    "rejects disallowed characters in %j",
    (value) => {
      expect(validateProductDescription(value)).toBe(
        "description contains characters that aren't allowed"
      );
    }
  );
});

describe("validateText", () => {
  const options = { pattern: /^[0-9]+$/, maxLength: 5 };

  test("uses the label in its messages", () => {
    expect(validateText("", "code", options)).toBe("code is required");
    expect(validateText("123456", "code", options)).toBe(
      "code must be 5 characters or fewer"
    );
    expect(validateText("12a", "code", options)).toBe(
      "code contains characters that aren't allowed"
    );
  });

  test("returns null when the value passes every check", () => {
    expect(validateText("12345", "code", options)).toBeNull();
  });
});