"use client";

import { useCallback } from "react";
import { useToast } from "@/components/admin/ui/toast";

/**
 * Admin action plumbing.
 *
 * Every console button talks to a JSON API route. The old pattern was
 * `await fetch(...); window.location.reload();` with the response ignored, so a
 * 401/403/500 looked exactly like success (silent reload). These helpers read
 * the response, surface the server's message, and drive a busy→settled toast so
 * the operator can see the request working and how it ended.
 */

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** fetch + envelope parsing. Throws ApiError with the server's own message. */
export async function adminFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (err) {
    throw new ApiError(`সার্ভারে পৌঁছানো যায়নি (${(err as Error).message})`, 0);
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  const message =
    (data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string"
      ? (data as { error: string }).error
      : "") || (typeof data === "string" ? data.slice(0, 300) : "");

  if (!res.ok) {
    throw new ApiError(message || httpMessage(res.status), res.status);
  }
  return data as T;
}

function httpMessage(status: number): string {
  if (status === 401) return "লগইন প্রয়োজন — আবার সাইন ইন করুন";
  if (status === 403) return "এই কাজের অনুমতি নেই";
  if (status === 404) return "রেকর্ডটি পাওয়া যায়নি";
  if (status === 409) return "একই রেকর্ড আগেই আছে";
  if (status === 422) return "ইনপুট যাচাই করা যায়নি";
  if (status === 429) return "অনেক বেশি অনুরোধ — একটু পরে চেষ্টা করুন";
  if (status >= 500) return `সার্ভার ত্রুটি (HTTP ${status})`;
  return `অনুরোধ ব্যর্থ (HTTP ${status})`;
}

export interface ActionOptions<T> {
  path: string;
  init?: RequestInit;
  /** Shown while the request is in flight. */
  busy: string;
  /** Shown on success (or a function of the response). */
  success: string | ((data: T) => string);
  /** Extra detail under the success line. */
  detail?: string | ((data: T) => string | undefined);
  /** Reload the page after success (default false — components update in place). */
  reload?: boolean;
}

/**
 * Run a console action with a busy toast that settles to success/error.
 * Returns the parsed response, or `null` when the action failed.
 */
export function useAdminAction() {
  const toast = useToast();

  return useCallback(
    async <T = unknown,>(opts: ActionOptions<T>): Promise<T | null> => {
      const id = toast.busy(opts.busy);
      try {
        const data = await adminFetch<T>(opts.path, opts.init);
        const title = typeof opts.success === "function" ? opts.success(data) : opts.success;
        const detail = typeof opts.detail === "function" ? opts.detail(data) : opts.detail;
        toast.settle(id, "success", title, detail);
        return data;
      } catch (err) {
        toast.settle(id, "error", `✕ ${opts.busy.replace(/…$/, "")} ব্যর্থ`, (err as Error).message);
        return null;
      } finally {
        if (opts.reload) setTimeout(() => window.location.reload(), 400);
      }
    },
    [toast],
  );
}

/**
 * Wrap an arbitrary async function (not necessarily a fetch) with the same
 * busy → success/error toast lifecycle. Used by actions that call several
 * endpoints or do file work.
 */
export function useActionRunner() {
  const toast = useToast();
  return useCallback(
    async <T,>(opts: { busy: string; success: string; run: () => Promise<T>; detail?: (data: T) => string | undefined }): Promise<T | null> => {
      const id = toast.busy(opts.busy);
      try {
        const data = await opts.run();
        toast.settle(id, "success", opts.success, opts.detail?.(data));
        return data;
      } catch (err) {
        toast.settle(id, "error", `✕ ${opts.busy.replace(/…$/, "")} ব্যর্থ`, (err as Error).message);
        return null;
      }
    },
    [toast],
  );
}
