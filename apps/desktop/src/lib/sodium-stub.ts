/**
 * Local stand-in for `libsodium-wrappers`.
 *
 * libsodium-wrappers ships a broken ESM build (dist/modules-esm/*.mjs imports
 * a missing `./libsodium.mjs`), which fails Vite/Rollup compilation. Rather
 * than break the whole desktop build, we alias the package to this stub. The
 * GitHub secret-sync feature (the only consumer) reports a clear runtime error
 * when it needs real crypto, instead of taking the app down.
 *
 * To restore real crypto later, add a Tauri (Rust) command that encrypts via
 * sodium and drop this stub in favor of the plugin.
 */

export const ready = Promise.resolve();

function unimplemented(name: string): never {
  throw new Error(`[sodium] "${name}" is unavailable in this build — GitHub secret sync was compiled out. Restore libsodium-wrappers bundling or add a native crypto command.`);
}

export const base64_variants = { ORIGINAL: 1, URLSAFE_NO_PADDING: 3, ORIGINAL_NO_PADDING: 1 };

export function crypto_box_seal(): Uint8Array {
  unimplemented("crypto_box_seal");
}
export function crypto_box_seal_open(): Uint8Array {
  unimplemented("crypto_box_seal_open");
}
export function from_base64(): Uint8Array {
  unimplemented("from_base64");
}
export function to_base64(): string {
  unimplemented("to_base64");
}
export function from_string(): Uint8Array {
  unimplemented("from_string");
}
export function to_string(): string {
  unimplemented("to_string");
}

export default {
  ready,
  base64_variants,
  crypto_box_seal,
  crypto_box_seal_open,
  from_base64,
  to_base64,
  from_string,
  to_string,
};