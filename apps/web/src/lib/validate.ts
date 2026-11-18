/**
 * One request validator, so every route answers the same way.
 *
 * Hand-written checks were fine while there were five routes. There are now
 * dozens, and they answered three different ways: some ignored an unknown field,
 * some crashed on it, one 500ed because `JSON.parse` had already been handed a
 * number. Two of those are more dangerous than they look — a route that *ignores*
 * an unexpected field can be talked into reading a `role` out of a body later, and
 * a route that crashes on a wrong type turns a 400 into a 500 in the logs.
 *
 * So: a spec in, a typed value or one Bangla sentence out. Four rules, all of them
 * deliberate:
 *
 *  - **Unknown keys are refused**, not dropped. A closed vocabulary is how you
 *    keep a later feature from being smuggled in a request it never declared.
 *  - **A wrong type is a 400 with the field's name**, never a coercion. `"3"` is
 *    not 3, `"false"` is not false.
 *  - **A bound is a refusal, not a truncation.** Silently slicing a 5 000-character
 *    reason to 300 stores something the caller did not send.
 *  - **Errors are written in the language the console speaks** and are safe to
 *    show: they name the field, never the value (a value may be a secret).
 *
 * Pure and synchronous, so it is testable without a route, a request or a DB.
 */

export type FieldSpec =
  | {
      kind: "string";
      min?: number;
      max?: number;
      optional?: true;
      nullable?: true;
      pattern?: RegExp;
      label?: string;
    }
  | {
      kind: "int";
      min?: number;
      max?: number;
      optional?: true;
      nullable?: true;
      label?: string;
    }
  | { kind: "bool"; optional?: true; label?: string }
  | {
      kind: "enum";
      values: readonly string[];
      optional?: true;
      nullable?: true;
      label?: string;
    }
  | {
      kind: "url";
      min?: number;
      max?: number;
      optional?: true;
      nullable?: true;
      label?: string;
    }
  | {
      kind: "stringArray";
      max?: number;
      itemMax?: number;
      optional?: true;
      label?: string;
    };

export interface ValidationFailure {
  ok: false;
  /** Bangla, for the console. Names the field, never its value. */
  error: string;
  field: string;
}

export interface ValidationSuccess<T> {
  ok: true;
  value: T;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

function fail(
  field: string,
  label: string | undefined,
  reason: string,
): ValidationFailure {
  const name = label ?? field;
  return { ok: false, field, error: `${name}: ${reason}` };
}

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

const URL_SAFE = /^https?:\/\/[^\s]+$/i;
const EMAILISH = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate a JSON body against a spec.
 *
 * `payload` is whatever `await req.json().catch(() => null)` produced. A non-object
 * body (a bare array, a string, `null`) fails once, at the top, instead of in each
 * field.
 */
export function validateBody<S extends Record<string, FieldSpec>>(
  payload: unknown,
  spec: S,
): ValidationResult<{ [K in keyof S]: unknown }> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, field: "", error: "অনুরোধের বডি একটি অবজেক্ট হতে হবে।" };
  }
  const body = payload as Record<string, unknown>;

  const unknown = Object.keys(body).filter((key) => !(key in spec));
  if (unknown.length > 0) {
    return {
      ok: false,
      field: unknown[0] ?? "",
      error: `অসমর্থিত ফিল্ড: ${unknown.slice(0, 3).join(", ")}`,
    };
  }

  const out: Record<string, unknown> = {};
  for (const [field, raw] of Object.entries(spec) as Array<
    [string, FieldSpec]
  >) {
    const value = body[field];
    const label = "label" in raw ? raw.label : undefined;

    if (value === undefined || value === null) {
      if (value === null && "nullable" in raw && raw.nullable) {
        out[field] = null;
        continue;
      }
      if ("optional" in raw && raw.optional) {
        if (value === undefined) continue;
        out[field] = null;
        continue;
      }
      if (value === null) return fail(field, label, "খালি রাখা যাবে না।");
      return fail(field, label, "আবশ্যক।");
    }

    switch (raw.kind) {
      case "string": {
        if (typeof value !== "string")
          return fail(field, label, "টেক্সট হতে হবে।");
        const text = value.trim();
        if (text === "" && !("optional" in raw && raw.optional))
          return fail(field, label, "খালি রাখা যাবে না।");
        if (raw.min !== undefined && text.length < raw.min)
          return fail(field, label, `কমপক্ষে ${raw.min} অক্ষর।`);
        if (raw.max !== undefined && text.length > raw.max)
          return fail(field, label, `সর্বোচ্চ ${raw.max} অক্ষর।`);
        if (raw.pattern && !raw.pattern.test(text))
          return fail(field, label, "ফরম্যাট মেলেনি।");
        out[field] = text === "" ? null : text;
        break;
      }
      case "int": {
        if (typeof value !== "number" || !Number.isInteger(value)) {
          return fail(field, label, "পূর্ণসংখ্যা হতে হবে।");
        }
        if (raw.min !== undefined && value < raw.min)
          return fail(field, label, `কমপক্ষে ${raw.min}।`);
        if (raw.max !== undefined && value > raw.max)
          return fail(field, label, `সর্বোচ্চ ${raw.max}।`);
        out[field] = value;
        break;
      }
      case "bool": {
        if (typeof value !== "boolean")
          return fail(field, label, "true/false হতে হবে।");
        out[field] = value;
        break;
      }
      case "enum": {
        if (typeof value !== "string")
          return fail(field, label, "টেক্সট হতে হবে।");
        if (!raw.values.includes(value)) {
          return fail(field, label, `হতে হবে: ${raw.values.join(", ")}`);
        }
        out[field] = value;
        break;
      }
      case "url": {
        if (typeof value !== "string")
          return fail(field, label, "টেক্সট হতে হবে।");
        const text = value.trim();
        if (text === "") {
          if ("optional" in raw && raw.optional) {
            out[field] = null;
            break;
          }
          return fail(field, label, "আবশ্যক।");
        }
        if (!URL_SAFE.test(text))
          return fail(field, label, "http(s) লিংক হতে হবে।");
        if (raw.max !== undefined && text.length > raw.max)
          return fail(field, label, `সর্বোচ্চ ${raw.max} অক্ষর।`);
        out[field] = text;
        break;
      }
      case "stringArray": {
        if (!Array.isArray(value)) return fail(field, label, "তালিকা হতে হবে।");
        const items: string[] = [];
        for (const item of value) {
          if (typeof item !== "string")
            return fail(field, label, "প্রতিটি আইটেম টেক্সট হতে হবে।");
          const text = item.trim();
          if (!text) continue;
          if (raw.itemMax !== undefined && text.length > raw.itemMax) {
            return fail(
              field,
              label,
              `প্রতিটি আইটেম সর্বোচ্চ ${raw.itemMax} অক্ষর।`,
            );
          }
          if (!items.includes(text)) items.push(text);
        }
        if (raw.max !== undefined && items.length > raw.max) {
          return fail(field, label, `সর্বোচ্চ ${raw.max}টি আইটেম।`);
        }
        out[field] = items;
        break;
      }
      default: {
        return fail(field, label, "অজানা ফিল্ড ধরন।");
      }
    }
  }
  return { ok: true, value: out as { [K in keyof S]: unknown } };
}

/** `https://…`, for routes that accept a link from an operator. */
export function isHttpUrl(value: string): boolean {
  return URL_SAFE.test(value);
}

/** `name@host.tld`, for the routes that take an address. */
export function isEmailish(value: string): boolean {
  return EMAILISH.test(value);
}
