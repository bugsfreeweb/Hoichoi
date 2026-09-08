import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

/** True when running inside the Tauri webview (not a plain browser tab). */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export { invoke, listen };

export async function repoRoot(): Promise<string> {
  return invoke<string>("repo_root");
}

export async function startPipeline(env: Record<string, string>): Promise<void> {
  await invoke("run_pipeline", { env });
}

export async function openAdmin(url: string): Promise<void> {
  await invoke("open_admin", { url });
}