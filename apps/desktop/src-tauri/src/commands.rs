use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicU32, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};

/// Normalize a path for child-process argv/env on Windows: strip a leading
/// `\\?\` verbatim (extended-length) prefix, e.g. from `resource_dir()`.
/// Node ≥22.20 crashes (`EISDIR … lstat 'C:'`) when the script path is
/// verbatim, so the bundled runner must always receive plain Win32 paths.
fn win32_path(p: &Path) -> PathBuf {
    dunce::simplified(p).to_path_buf()
}

/// Prevent a spawned console tool (node/pnpm/cmd/taskkill) from flashing a
/// separate cmd window: a GUI (windows-subsystem) app that spawns a console
/// child gets a new console unless `CREATE_NO_WINDOW` is set.
#[cfg(windows)]
fn hide_console(c: &mut Command) {
    use std::os::windows::process::CommandExt;
    c.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
}
#[cfg(not(windows))]
fn hide_console(_c: &mut Command) {}

/// Quote one argv token for a command line that is parsed by
/// `cmd.exe` *and then* by the child's C runtime (node/pnpm).
///
/// The dev fallback pipes `runner_call` arguments through `cmd /D /S /C`, so
/// every token goes through two parsers:
///   1. cmd.exe — honours double quotes, and (inside a quoted run) a doubled
///      `""` collapses to one literal `"` that is *kept* in the line it hands on;
///   2. the C runtime of the child — strips the outer quotes and turns the
///      doubled `""` back into a single `"`.
///
/// So a JSON payload such as `{"adapters":[]}` must be wrapped as
/// `"{""adapters"":[]}"`. Simply *dropping* the inner quotes (the previous
/// behaviour) corrupted every quoted payload — e.g. `media storage set '{"…":…}'`
/// arrived as `{adapters:[]}` and made the runner fail with
/// `Expected property name or '}' in JSON at position 1`.
#[cfg(windows)]
fn quote_cmd_arg(a: &str) -> String {
    if a.is_empty() {
        return "\"\"".to_string();
    }
    let needs_quotes = a
        .chars()
        .any(|c| matches!(c, ' ' | '\t' | '"' | '&' | '^' | '|' | '<' | '>' | '(' | ')'));
    if !needs_quotes {
        return a.to_string();
    }
    // Double the quotes for cmd, and double any run of backslashes that
    // precedes a quote / the closing quote so the C runtime round-trips them.
    let mut out = String::with_capacity(a.len() + 8);
    out.push('"');
    let mut slashes = 0usize;
    for ch in a.chars() {
        match ch {
            '\\' => slashes += 1,
            '"' => {
                out.push_str(&"\\".repeat(slashes * 2));
                out.push_str("\"\"");
                slashes = 0;
            }
            _ => {
                out.push_str(&"\\".repeat(slashes));
                slashes = 0;
                out.push(ch);
            }
        }
    }
    out.push_str(&"\\".repeat(slashes * 2));
    out.push('"');
    out
}

/// PID of the currently running pipeline child (0 = none). Used by
/// `stop_pipeline` to let the user abort a collector run from the UI.
static PIPELINE_PID: AtomicU32 = AtomicU32::new(0);

/// Repo root = three levels above src-tauri: apps/desktop/src-tauri -> repo.
fn repo_root_dir() -> PathBuf {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest.join("..").join("..").join("..")
}

/// Absolute path of the monorepo root (scope: frontend "open folder" hints).
#[tauri::command]
pub async fn repo_root() -> String {
    repo_root_dir().display().to_string()
}

/// Absolute path of the bundled (standalone) pipeline runner, if staged:
/// `<resource_dir>/runner/{node.exe, app/cli.cjs, node_modules}`.
fn bundled_runner(app: &AppHandle) -> Option<(PathBuf, PathBuf)> {
    let root = win32_path(&app.path().resource_dir().ok()?.join("runner"));
    let node = if std::env::consts::OS == "windows" {
        root.join("node.exe")
    } else {
        root.join("node")
    };
    let cli = root.join("app").join("cli.cjs");
    if node.is_file() && cli.is_file() {
        Some((node, cli))
    } else {
        None
    }
}

/// Run the collector pipeline.
///
/// Prefers the self-contained bundled runner (staged by `bundle:runner`) so the
/// packaged app needs no Node/pnpm/Playwright install. When no runner is staged
/// (dev), falls back to `pnpm run scrape` at the repo root.
///
/// `env` carries keychain-provided secrets (Turso credentials, LLM keys, FB
/// cookie) from the frontend; they are merged into the child's environment.
#[tauri::command]
pub async fn run_pipeline(
    app: AppHandle,
    env: Option<HashMap<String, String>>,
) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir failed: {e}"))?;

    let mut cmd = {
        if let Some((node, cli)) = bundled_runner(&app) {
            let mut c = Command::new(node);
            c.arg(cli).arg("scrape");
            c
        } else {
            let base = repo_root_dir();
            #[cfg(windows)]
            {
                let mut c = Command::new("cmd");
                c.current_dir(&base).args(["/C", "pnpm", "run", "scrape"]);
                c
            }
            #[cfg(not(windows))]
            {
                let mut c = Command::new("pnpm");
                c.current_dir(&base).args(["run", "scrape"]);
                c
            }
        }
    };

    let envs = match env {
        Some(envs) => envs,
        None => HashMap::new(),
    };
    for (k, v) in &envs {
        cmd.env(k, v);
    }

    // Prefer a locally-installed system browser (Edge/Chrome) over a
    // downloaded Playwright bundle. The scraper falls back across candidate
    // engines, so this is safe even in dev, where no runner node_modules exist.
    cmd.env("HOICHOI_USE_SYSTEM_BROWSER", "1");

    // Portable runtime paths (bundled/standalone mode only safe when a runner
    // is actually present; harmless in dev).
    if let Some((_, cli)) = bundled_runner(&app) {
        let app_dir = cli
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_default();
        cmd.env("HOICHOI_MIGRATIONS_DIR", app_dir.join("migrations"));
        if !envs.contains_key("HOICHOI_MEDIA_ROOT") {
            cmd.env("HOICHOI_MEDIA_ROOT", win32_path(&data_dir.join("media")));
        }
        if !envs.contains_key("TURSO_DATABASE_URL") && !envs.contains_key("DATABASE_URL") {
            cmd.env(
                "TURSO_DATABASE_URL",
                format!("file:{}", win32_path(&data_dir.join("hoichoi.db")).display()),
            );
        }
    }

    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
    hide_console(&mut cmd);

    let mut child = cmd.spawn().map_err(|e| format!("spawn failed: {e}"))?;
    PIPELINE_PID.store(child.id(), Ordering::SeqCst);

    let stdout = child.stdout.take().ok_or("no stdout")?;
    let stderr = child.stderr.take().ok_or("no stderr")?;

    let a = app.clone();
    let _h1 = std::thread::spawn(move || {
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            let _ = a.emit("pipeline://log", line);
        }
    });

    let a = app.clone();
    let _h2 = std::thread::spawn(move || {
        for line in BufReader::new(stderr).lines().map_while(Result::ok) {
            let _ = a.emit("pipeline://log", line);
        }
    });

    let pid = child.id();
    let a = app.clone();
    let _h3 = std::thread::spawn(move || {
        let code = child.wait().map(|s| s.code().unwrap_or(-1)).unwrap_or(-1);
        if PIPELINE_PID.load(Ordering::SeqCst) == pid {
            PIPELINE_PID.store(0, Ordering::SeqCst);
        }
        let _ = a.emit("pipeline://done", code);
    });

    Ok(())
}

/// Abort the running collector pipeline (SIGTERM-equivalent on Windows via
/// taskkill /F /T, plain `kill` elsewhere). No-op when nothing is running.
#[tauri::command]
pub async fn stop_pipeline(app: AppHandle) -> Result<(), String> {
    let pid = PIPELINE_PID.load(Ordering::SeqCst);
    if pid == 0 {
        return Ok(());
    }
    let _ = app.emit("pipeline://log", "[desk] stop requested — terminating collector");
    let pid_str = pid.to_string();
    let spawned = {
        #[cfg(windows)]
        {
            let mut c = Command::new("taskkill");
            hide_console(&mut c);
            c.args(["/F", "/T", "/PID"]).arg(&pid_str).spawn()
        }
        #[cfg(not(windows))]
        {
            Command::new("kill").arg(&pid_str).spawn()
        }
    };
    spawned.map_err(|e| format!("kill failed: {e}"))?;
    Ok(())
}

/// Open the web admin in the system browser.
#[tauri::command]
pub fn open_admin(url: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        let mut c = Command::new("cmd");
        hide_console(&mut c);
        c.args(["/C", "start", ""]).arg(&url).spawn().map_err(|e| format!("open failed: {e}"))?;
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("open failed: {e}"))?;
    }
    #[cfg(all(not(windows), not(target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("open failed: {e}"))?;
    }
    Ok(())
}

/// Run the bundled (or dev) runner CLI with `args` + `env`, capturing stdout.
/// Used by settings get/set — same spawning + portable-env rules as run_pipeline.
/// Discover a `.env` file (repo root → exe dir → cwd) and parse simple
/// KEY=value lines. Only used as a *fallback* for keys the caller did not
/// provide — gives dev/installed builds the same cloud DB the web uses.
fn load_dotenv_fallback() -> Vec<(String, String)> {
    let mut candidates: Vec<PathBuf> = vec![std::env::current_dir().unwrap_or_default()];
    candidates.push(repo_root_dir());
    if let Ok(exe) = std::env::current_exe() {
        candidates.push(exe);
    }
    for base in candidates {
        let file = if base.ends_with(".env") {
            base
        } else {
            base.join(".env")
        };
        let Ok(lines) = std::fs::read_to_string(&file) else {
            continue;
        };
        let mut out = Vec::new();
        for line in lines.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if let Some((k, v)) = line.split_once('=') {
                let k = k.trim();
                let v = v.trim().trim_matches('"').trim_matches('\'');
                if !k.is_empty() && !v.is_empty() {
                    out.push((k.to_string(), v.to_string()));
                }
            }
        }
        if !out.is_empty() {
            return out;
        }
    }
    Vec::new()
}

fn run_runner(
    app: &AppHandle,
    args: &[&str],
    env: &HashMap<String, String>,
) -> Result<String, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir failed: {e}"))?;

    let mut cmd = if let Some((node, cli)) = bundled_runner(app) {
        let mut c = Command::new(node);
        c.arg(cli);
        c.args(args);
        c
    } else {
        // Dev fallback: pnpm exec tsx on the scraper CLI. Passed through
        // cmd.exe with /D /S /C and *verbatim* tokens (raw_arg) so quoted
        // args like `admin-code`/`moderation` never get mangled.
        #[cfg(windows)]
        let c = {
            use std::os::windows::process::CommandExt;
            let tokens: Vec<String> = args.iter().map(|a| quote_cmd_arg(a)).collect();
            let mut c = Command::new("cmd");
            c.current_dir(repo_root_dir());
            let inner = format!(
                "pnpm --filter @hoichoi/scraper exec tsx src/cli.ts {}",
                tokens.join(" ")
            );
            c.raw_arg("/D /S /C ").raw_arg(&inner);
            c
        };
        #[cfg(not(windows))]
        let c = {
            let mut c = Command::new("pnpm");
            c.current_dir(repo_root_dir())
                .arg("--filter")
                .arg("@hoichoi/scraper")
                .args(["exec", "tsx", "src/cli.ts"])
                .args(args);
            c
        };
        c
    };

    // Caller-supplied env wins; fall back to a discovered .env for anything
    // missing (turso creds etc.), then to a local file DB as the last resort.
    for (k, v) in env {
        cmd.env(k, v);
    }
    for (k, v) in load_dotenv_fallback() {
        if !env.contains_key(&k) {
            cmd.env(k, v);
        }
    }
    cmd.env("HOICHOI_USE_SYSTEM_BROWSER", "1");
    if let Some((_, cli)) = bundled_runner(app) {
        let app_dir = cli
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_default();
        cmd.env("HOICHOI_MIGRATIONS_DIR", app_dir.join("migrations"));
    }
    if !env.contains_key("TURSO_DATABASE_URL") && !env.contains_key("DATABASE_URL") {
        cmd.env(
            "TURSO_DATABASE_URL",
            format!("file:{}", win32_path(&data_dir.join("hoichoi.db")).display()),
        );
    }

    hide_console(&mut cmd);
    let out = cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("spawn failed: {e}"))?;
    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
    if out.status.success() {
        return Ok(stdout);
    }
    let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
    Err(format!(
        "runner failed: {}",
        if stderr.is_empty() { "see pipeline log" } else { &stderr }
    ))
}

/* ------------------------------------------------------------------ *
 * Persistent runner daemon — the desktop keeps ONE bundled Node alive  *
 * (commander `daemon` mode) and sends JSON-line requests on stdin      *
 * `{"id","cmd","env"}` → `{"id","ok","data"}` / `{"id","ok":false,"error"}`. *
 * Removes the ~cold Node boot + full CLI parse per desk operation.      *
 * ------------------------------------------------------------------ */

/// Live daemon process (None until first use, cleared when it crashes).
static DAEMON: Mutex<Option<Arc<RunnerDaemon>>> = Mutex::new(None);

struct RunnerDaemon {
    /// Process handle; its stdin/stdout/stderr pipes are owned below.
    child: Mutex<Child>,
    /// Request stdin writer.
    stdin: ChildStdin,
    /// In-flight map: request id → reply channel (Arc so the reader thread
    /// can drain leftover entries if the child dies).
    pending: Arc<Mutex<HashMap<u64, std::sync::mpsc::Sender<Result<String, String>>>>>,
    next_id: AtomicU64,
}

impl RunnerDaemon {
    /// Whether the child is still running (try_wait returns Ok(None)).
    fn alive(&self) -> bool {
        matches!(self.child.lock().unwrap().try_wait(), Ok(None))
    }

    /// Send one request and wait for its reply line (300s cap — a migration
    /// or ensureSchema over a slow Turso connection can legitimately stall).
    fn call(&self, cmd: &[&str], env: &HashMap<String, String>) -> Result<String, String> {
        if !self.alive() {
            return Err("runner daemon is not running".to_string());
        }
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);
        let (tx, rx) = std::sync::mpsc::channel();
        self.pending.lock().unwrap().insert(id, tx);
        let req = serde_json::json!({ "id": id, "cmd": cmd, "env": env });
        let mut line = serde_json::to_string(&req).map_err(|e| format!("encode request: {e}"))?;
        line.push('\n');
        let mut w = &self.stdin;
        w.write_all(line.as_bytes())
            .and_then(|_| w.flush())
            .map_err(|e| format!("write to runner daemon: {e}"))?;
        match rx.recv_timeout(Duration::from_secs(300)) {
            Ok(res) => res,
            Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                self.pending.lock().unwrap().remove(&id);
                Err("runner timed out after 300s".to_string())
            }
            Err(_) => Err("runner daemon died while processing request".to_string()),
        }
    }

    fn shutdown(&self) {
        let _ = self.child.lock().unwrap().kill();
    }
}

/// Spawn the bundled runner in `daemon` mode with the same portable env rules
/// as the one-shot path (migrations dir, media root, local-DB fallback).
fn spawn_daemon(app: &AppHandle, local_db_url: &str) -> Result<Arc<RunnerDaemon>, String> {
    let (node, cli) = bundled_runner(app).ok_or_else(|| "no bundled runner staged".to_string())?;
    let mut cmd = Command::new(node);
    cmd.arg(&cli).arg("daemon");
    cmd.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());

    let app_dir = cli.parent().map(|p| p.to_path_buf()).unwrap_or_default();
    cmd.env("HOICHOI_MIGRATIONS_DIR", app_dir.join("migrations"));
    cmd.env("HOICHOI_MEDIA_ROOT", {
        let data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("app_data_dir failed: {e}"))?;
        win32_path(&data_dir.join("media"))
    });
    cmd.env("HOICHOI_USE_SYSTEM_BROWSER", "1");
    cmd.env("HOICHOI_LOCAL_DB_URL", local_db_url);
    hide_console(&mut cmd);

    let mut child = cmd.spawn().map_err(|e| format!("spawn daemon failed: {e}"))?;
    let stdin = child.stdin.take().ok_or_else(|| "no daemon stdin".to_string())?;
    let stdout = child.stdout.take().ok_or_else(|| "no daemon stdout".to_string())?;
    let stderr = child.stderr.take().ok_or_else(|| "no daemon stderr".to_string())?;

    // Reader thread: route each `{id,...}` line to its parked caller.
    let pending: Arc<Mutex<HashMap<u64, std::sync::mpsc::Sender<Result<String, String>>>>> =
        Arc::new(Mutex::new(HashMap::new()));
    {
        let pending = Arc::clone(&pending);
        std::thread::spawn(move || {
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                let line = line.trim();
                if line.is_empty() {
                    continue;
                }
                let Ok(value) = serde_json::from_str::<serde_json::Value>(line) else {
                    continue;
                };
                let id = value
                    .get("id")
                    .and_then(serde_json::Value::as_u64)
                    .unwrap_or(u64::MAX);
                let sender = pending.lock().unwrap().remove(&id);
                let Some(sender) = sender else {
                    continue;
                };
                let result = if value
                    .get("ok")
                    .and_then(serde_json::Value::as_bool)
                    .unwrap_or(false)
                {
                    Ok(value
                        .get("data")
                        .and_then(serde_json::Value::as_str)
                        .unwrap_or("")
                        .to_string())
                } else {
                    Err(value
                        .get("error")
                        .and_then(serde_json::Value::as_str)
                        .unwrap_or("runner returned an error")
                        .to_string())
                };
                let _ = sender.send(result);
            }
            // EOF (child died) — fail any caller still parked.
            for (_, tx) in pending.lock().unwrap().drain() {
                let _ = tx.send(Err("runner daemon exited unexpectedly".to_string()));
            }
        });
    }

    // Stderr drainer: prevents a full pipe blocking the child.
    std::thread::spawn(move || {
        for _line in BufReader::new(stderr).lines().map_while(Result::ok) {}
    });

    let daemon = Arc::new(RunnerDaemon {
        child: Mutex::new(child),
        stdin,
        pending,
        next_id: AtomicU64::new(1),
    });

    // Warm handshake: run `settings` once so the schema memo + client cache
    // are warm before the desk's first real action.
    daemon.call(&["settings"], &HashMap::new())?;
    Ok(daemon)
}

/// Reuse a live daemon, or (re)spawn one. The whole spawn happens under the
/// global lock, so concurrent warm-up + first call can never double-spawn.
fn get_daemon(app: &AppHandle) -> Result<Arc<RunnerDaemon>, String> {
    let mut guard = DAEMON.lock().unwrap();
    if let Some(d) = guard.as_ref() {
        if d.alive() {
            return Ok(Arc::clone(d));
        }
    }
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir failed: {e}"))?;
    let local_db_url = format!(
        "file:{}",
        win32_path(&data_dir.join("hoichoi.db")).display()
    );
    let daemon = spawn_daemon(app, &local_db_url)?;
    *guard = Some(Arc::clone(&daemon));
    Ok(daemon)
}

/// Forget the current daemon handle (crash recovery); the process is already
/// gone or is killed to release its pipes.
fn clear_daemon() {
    if let Some(d) = DAEMON.lock().unwrap().take() {
        d.shutdown();
    }
}

/// Route a runner request through the persistent daemon when a bundled runner
/// is staged; otherwise fall back to the one-shot spawn (dev without runner).
fn runner_call(
    app: &AppHandle,
    args: &[&str],
    env: &HashMap<String, String>,
) -> Result<String, String> {
    if bundled_runner(app).is_none() {
        return run_runner(app, args, env);
    }
    // A dead daemon is respawned once; a healthy daemon's error response
    // (a command-level failure like "unknown field") is returned verbatim.
    let mut last_err = String::new();
    for attempt in 0..2 {
        let daemon = match get_daemon(app) {
            Ok(d) => d,
            Err(e) if attempt == 0 => {
                last_err = e;
                std::thread::sleep(Duration::from_millis(150));
                continue;
            }
            Err(e) => return Err(e),
        };
        match daemon.call(args, env) {
            Ok(out) => return Ok(out),
            Err(e) if !daemon.alive() && attempt == 0 => {
                last_err = e;
                clear_daemon();
            }
            Err(e) => return Err(e),
        }
    }
    Err(format!("runner daemon failed: {last_err}"))
}

/// Warm the daemon during app setup (background thread — first desk call just
/// works whether or not it's finished).
pub fn warm_daemon(app: &AppHandle) {
    if bundled_runner(app).is_none() {
        return;
    }
    let app = app.clone();
    std::thread::spawn(move || {
        let _ = runner_call(&app, &["settings"], &HashMap::new());
    });
}

/// Kill the daemon on app exit so no orphaned node process lingers.
pub fn shutdown_daemon(_app: &AppHandle) {
    clear_daemon();
}

/// Read site settings through the runner (JSON output from `settings get`).
#[tauri::command]
pub async fn settings_get(
    app: AppHandle,
    env: Option<HashMap<String, String>>,
) -> Result<String, String> {
    let env = env.unwrap_or_default();
    runner_call(&app, &["settings"], &env)
}

/// Update site settings through the runner (`settings:set k=v k=...`).
#[tauri::command]
pub async fn settings_set(
    app: AppHandle,
    env: Option<HashMap<String, String>>,
    fields: HashMap<String, String>,
) -> Result<(), String> {
    let env = env.unwrap_or_default();
    let mut args = vec!["settings:set".to_string()];
    for (k, v) in &fields {
        args.push(format!("{k}={v}"));
    }
    let strs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    runner_call(&app, &strs, &env)?;
    Ok(())
}

/// App data dir (used for local file DB + encrypted backups).
fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir failed: {e}"))
}

/// Write the exported env blob to the user's Downloads folder.
///
/// The webview's blob + `<a download>` path is silently blocked inside the
/// Tauri shell on Windows, so the Vault's "Download .env" goes through the
/// Rust side instead. Returns the absolute path that was written.
#[tauri::command]
pub async fn save_env_file(app: AppHandle, content: String) -> Result<String, String> {
    let dir = app
        .path()
        .download_dir()
        .map_err(|e| format!("download_dir failed: {e}"))
        .or_else(|_| data_dir(&app))?;
    let path = dir.join("hoichoi-vault.env");
    std::fs::write(&path, content).map_err(|e| format!("write failed: {e}"))?;
    Ok(path.to_string_lossy().to_string())
}

/// Encrypted full backup → `<app_data>/hoichoi-backup-<timestamp>.json`.
#[tauri::command]
pub async fn backup_export(
    app: AppHandle,
    pass: String,
    env: Option<HashMap<String, String>>,
) -> Result<String, String> {
    let mut env = env.unwrap_or_default();
    env.insert("HOICHOI_BACKUP_PASS".to_string(), pass);
    let stdout = runner_call(&app, &["backup", "export"], &env)?;
    let trimmed = stdout.trim();
    if !trimmed.starts_with("{") {
        return Err(format!("unexpected runner output: {trimmed}"));
    }
    let value: serde_json::Value =
        serde_json::from_str(trimmed).map_err(|e| format!("bad runner JSON: {e}"))?;
    let payload = value
        .get("payload")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "backup export returned no payload".to_string())?;
    let key = format!("hoichoi-backup-{}.json", now_stamp());
    let path = data_dir(&app)?.join(&key);
    std::fs::write(
        &path,
        serde_json::to_string(&serde_json::json!({ "payload": payload }))
            .map_err(|e| format!("encode failed: {e}"))?,
    )
    .map_err(|e| format!("write failed: {e}"))?;
    Ok(path.display().to_string())
}

/// Restore from an encrypted backup file. `path` optional → latest backup.
#[tauri::command]
pub async fn backup_import(
    app: AppHandle,
    pass: String,
    env: Option<HashMap<String, String>>,
    path: Option<String>,
) -> Result<(), String> {
    let mut env = env.unwrap_or_default();
    env.insert("HOICHOI_BACKUP_PASS".to_string(), pass);
    let file = match path {
        Some(p) if !p.trim().is_empty() => win32_path(Path::new(&p)).display().to_string(),
        _ => {
            let dir = data_dir(&app)?;
            let mut candidates: Vec<PathBuf> = std::fs::read_dir(&dir)
                .map_err(|e| format!("list backups failed: {e}"))?
                .filter_map(|ent| ent.ok())
                .map(|ent| ent.path())
                .filter(|p| {
                    p.file_name()
                        .and_then(|n| n.to_str())
                        .map(|n| n.starts_with("hoichoi-backup-") && n.ends_with(".json"))
                        .unwrap_or(false)
                })
                .collect();
            candidates.sort();
            candidates
                .pop()
                .ok_or_else(|| "no backup file found — export first".to_string())?
                .to_str()
                .map(|p| win32_path(Path::new(p)).display().to_string())
                .unwrap_or_default()
        }
    };
    let args = vec!["backup", "import"];
    let mut args = args
        .into_iter()
        .map(|s| s.to_string())
        .collect::<Vec<String>>();
    args.push(file);
    let strs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    runner_call(&app, &strs, &env)?;
    Ok(())
}

/// Reset content to defaults (posts/actions wiped; admin + settings re-seeded).
#[tauri::command]
pub async fn reset_db(
    app: AppHandle,
    env: Option<HashMap<String, String>>,
) -> Result<(), String> {
    run_runner(&app, &["reset"], &env.unwrap_or_default())?;
    Ok(())
}

/// One-click sync between the local file DB and the shared Turso cloud DB.
#[tauri::command]
pub async fn sync_db(
    app: AppHandle,
    direction: String,
    env: Option<HashMap<String, String>>,
) -> Result<String, String> {
    if direction != "push" && direction != "pull" {
        return Err("direction must be \"push\" or \"pull\"".to_string());
    }
    let config = env.unwrap_or_default();
    let cloud = config
        .get("TURSO_DATABASE_URL")
        .cloned()
        .ok_or_else(|| "no cloud DB configured — add Turso URL to the keychain".to_string())?;
    if config.get("TURSO_AUTH_TOKEN").is_none() {
        return Err("no Turso auth token configured in the keychain".to_string());
    }
    let local = format!(
        "file:{}",
        win32_path(&data_dir(&app)?.join("hoichoi.db")).display()
    );
    let args: Vec<&str> = if direction == "push" {
        vec!["sync", "push", "--from", &local, "--to", &cloud]
    } else {
        vec!["sync", "pull", "--from", &cloud, "--to", &local]
    };
    let stdout = runner_call(&app, &args, &config)?;

    // The runner prints `{"ok":true,"direction":..,"written":{table:rows}}`.
    // Return the same shape the TypeScript wrapper types expect so the desk
    // shows real table/row counts instead of a zeroed-out summary.
    let parsed: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("runner returned unreadable sync output: {e}"))?;
    let written = parsed
        .get("written")
        .and_then(|w| w.as_object())
        .cloned()
        .unwrap_or_default();
    let mut tables = 0usize;
    let mut rows: i64 = 0;
    for count in written.values() {
        tables += 1;
        rows += count.as_i64().unwrap_or(0);
    }
    Ok(serde_json::json!({
        "ok": true,
        "direction": direction,
        "tablesSynced": tables,
        "syncedTables": tables,
        "rowsAffected": rows,
        "conflicts": 0,
        "detail": written,
    })
    .to_string())
}

/// Manage one-time admin login codes through the runner (`admin-code` CLI).
/// `op` ∈ create | list | revoke. Returns the runner's JSON stdout verbatim.
#[tauri::command]
pub async fn admin_codes(
    app: AppHandle,
    op: String,
    email: Option<String>,
    label: Option<String>,
    id: Option<String>,
    env: Option<HashMap<String, String>>,
) -> Result<String, String> {
    let mut args = vec!["admin-code".to_string(), op.clone()];
    if let Some(e) = email {
        args.push(e);
    }
    if let Some(l) = label {
        args.push("--label".to_string());
        args.push(l);
    }
    if let Some(i) = id {
        args.push("--id".to_string());
        args.push(i);
    }
    let strs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    runner_call(&app, &strs, &env.unwrap_or_default())
}

fn now_stamp() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("{now}")
}

/// Generic runner passthrough for the desk console (watchlist, queue,
/// moderation, stats). `args` are the full runner CLI tokens; stdout JSON is
/// returned verbatim so the frontend keeps one thin wrapper.
#[tauri::command]
pub async fn desk_call(
    app: AppHandle,
    args: Vec<String>,
    env: Option<HashMap<String, String>>,
) -> Result<String, String> {
    let strs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    runner_call(&app, &strs, &env.unwrap_or_default())
}