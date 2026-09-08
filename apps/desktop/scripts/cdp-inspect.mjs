import { createRequire } from "node:module";
import http from "node:http";
const require2 = createRequire("E:/Personal AI/HuggingFace/WritterBOT/apps/desktop/src-tauri/resources/runner/app/cli.cjs");
const WebSocket = require2("ws");

const list = await new Promise((res, rej) => {
  http.get("http://127.0.0.1:9223/json/list", (r) => {
    let b = ""; r.on("data", (c) => (b += c)); r.on("end", () => res(JSON.parse(b)));
  }).on("error", rej);
});
const page = list.find((t) => t.type === "page");
console.log("TARGET:", page.url);
const target = page.webSocketDebuggerUrl.replace("localhost", "127.0.0.1");

const ws = new WebSocket(target, { perMessageDeflate: false, maxPayload: 16 * 1024 * 1024 });
let id = 0;
const send = (method, params = {}) =>
  new Promise((res) => {
    const mid = ++id;
    const onMsg = (raw) => {
      const m = JSON.parse(raw);
      if (m.id === mid) { ws.off("message", onMsg); res(m.result); }
    };
    ws.on("message", onMsg);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

ws.on("open", async () => {
  await send("Runtime.enable");
  await send("Log.enable");
  const expr = `JSON.stringify({
    rootHtml: document.getElementById('root')?.innerHTML?.slice(0, 300) ?? 'NO #root',
  })`;
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  console.log("PAGE:", r.result?.value ?? JSON.stringify(r));

  // Test Stronghold end-to-end from the webview
  const test = `
    (async () => {
      const { invoke } = window.__TAURI_INTERNALS__;
      const { appDataDir } = await import("@tauri-apps/api/path");
      return "ok";
    })()
  `;
  // module imports may not resolve via bare specifier in evaluate; use raw invoke instead
  const t2 = await send("Runtime.evaluate", {
    expression: `(async () => {
      try {
        const { invoke } = window.__TAURI_INTERNALS__;
        const dir = await invoke('plugin:path|resolve_directory', { directory: 'appDataDir', path: '' });
        return JSON.stringify({ dir });
      } catch (e) {
        try {
          const { invoke } = window.__TAURI_INTERNALS__;
          const dir = await invoke('path_resolve', { path: '' });
          return 'alt:' + JSON.stringify(dir);
        } catch (e2) {
          return 'ERR:' + String(e) + ' | ' + String(e2);
        }
      }
    })()`,
    returnByValue: true,
    awaitPromise: true,
  });
  console.log("PATH-DIR:", t2.result?.value);

  const t3 = await send("Runtime.evaluate", {
    expression: `(async () => {
      const { invoke } = window.__TAURI_INTERNALS__;
      try {
        await invoke('vault_set', { name: 'cdp_test', value: 'hello-vault' });
        const back = await invoke('vault_get', { name: 'cdp_test' });
        const names = await invoke('vault_names');
        await invoke('vault_delete', { name: 'cdp_test' });
        const gone = await invoke('vault_get', { name: 'cdp_test' });
        return 'VAULT-OK roundtrip=' + back + ' names=' + JSON.stringify(names) + ' afterDelete=' + gone;
      } catch (e) { return 'VAULT-ERR:' + String(e); }
    })()`,
    returnByValue: true,
    awaitPromise: true,
  });
  console.log("VAULT:", t3.result?.value ?? JSON.stringify(t3));

  // Complete onboarding and confirm the Dashboard renders
  const t4 = await send("Runtime.evaluate", {
    expression: `(async () => {
      localStorage.setItem('hoichoi.desk.onboarded.v1', '1');
      location.reload();
      return 'reloading';
    })()`,
    returnByValue: true,
  });
  console.log("RELOAD:", t4.result?.value);
  // give console/exception events a moment
  setTimeout(async () => {
    const r2 = await send("Runtime.evaluate", {
      expression: `navigator.userAgent`,
      returnByValue: true,
    });
    console.log("UA:", r2.result?.value);
    process.exit(0);
  }, 2500);
});
ws.on("message", (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.method === "Runtime.exceptionThrown")
    console.log("EXCEPTION:", JSON.stringify(m.params.exceptionDetails).slice(0, 1200));
  if (m.method === "Log.entryAdded" && m.params.entry.level === "error")
    console.log("CONSOLE-ERR:", JSON.stringify(m.params.entry).slice(0, 800));
});
ws.on("error", (e) => { console.error("WS-ERR:", e.message); process.exit(1); });
