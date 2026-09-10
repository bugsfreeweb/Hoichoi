use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};

use tauri::{AppHandle, Emitter, Manager};

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
    let root = app.path().resource_dir().ok()?.join("runner");
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

    // Portable runtime paths + system Edge (bundled/standalone mode only safe
    // when a runner is actually present; harmless in dev).
    if let Some((_, cli)) = bundled_runner(&app) {
        let app_dir = cli
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_default();
        cmd.env("HOICHOI_MIGRATIONS_DIR", app_dir.join("migrations"));
        cmd.env("HOICHOI_USE_SYSTEM_BROWSER", "1");
        if !envs.contains_key("HOICHOI_MEDIA_ROOT") {
            cmd.env("HOICHOI_MEDIA_ROOT", data_dir.join("media"));
        }
        if !envs.contains_key("TURSO_DATABASE_URL") && !envs.contains_key("DATABASE_URL") {
            cmd.env(
                "TURSO_DATABASE_URL",
                format!("file:{}", data_dir.join("hoichoi.db").display()),
            );
        }
    }

    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("spawn failed: {e}"))?;

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

    let a = app.clone();
    let _h3 = std::thread::spawn(move || {
        let code = child.wait().map(|s| s.code().unwrap_or(-1)).unwrap_or(-1);
        let _ = a.emit("pipeline://done", code);
    });

    Ok(())
}

/// Open the web admin in the system browser.
#[tauri::command]
pub fn open_admin(url: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        Command::new("cmd")
            .args(["/C", "start", ""])
            .arg(&url)
            .spawn()
            .map_err(|e| format!("open failed: {e}"))?;
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
        // Dev fallback: pnpm exec tsx on the scraper CLI.
        let quoted: Vec<String> = args
            .iter()
            .map(|a| format!("\"{}\"", a.replace('"', "")))
            .collect();
        #[cfg(windows)]
        let mut c = {
            let mut c = Command::new("cmd");
            c.current_dir(repo_root_dir()).args([
                "/C",
                &format!(
                    "pnpm --filter @hoichoi/scraper exec tsx src/cli.ts {}",
                    quoted.join(" ")
                ),
            ]);
            c
        };
        #[cfg(not(windows))]
        let mut c = {
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

    for (k, v) in env {
        cmd.env(k, v);
    }

    // Portable runtime paths + system Edge + local-DB fallback, like run_pipeline.
    if let Some((_, cli)) = bundled_runner(app) {
        let app_dir = cli
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_default();
        cmd.env("HOICHOI_MIGRATIONS_DIR", app_dir.join("migrations"));
        cmd.env("HOICHOI_USE_SYSTEM_BROWSER", "1");
        if !env.contains_key("TURSO_DATABASE_URL") && !env.contains_key("DATABASE_URL") {
            cmd.env(
                "TURSO_DATABASE_URL",
                format!("file:{}", data_dir.join("hoichoi.db").display()),
            );
        }
    }

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

/// Read site settings through the runner (JSON output from `settings get`).
#[tauri::command]
pub async fn settings_get(
    app: AppHandle,
    env: Option<HashMap<String, String>>,
) -> Result<String, String> {
    let env = env.unwrap_or_default();
    run_runner(&app, &["settings"], &env)
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
    run_runner(&app, &strs, &env)?;
    Ok(())
}

/// App data dir (used for local file DB + encrypted backups).
fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir failed: {e}"))
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
    let stdout = run_runner(&app, &["backup", "export"], &env)?;
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
        Some(p) if !p.trim().is_empty() => p,
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
                .display()
                .to_string()
        }
    };
    let args = vec!["backup", "import"];
    let mut args = args
        .into_iter()
        .map(|s| s.to_string())
        .collect::<Vec<String>>();
    args.push(file);
    let strs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    run_runner(&app, &strs, &env)?;
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
    let local = format!("file:{}", data_dir(&app)?.join("hoichoi.db").display());
    let args: Vec<&str> = if direction == "push" {
        vec!["sync", "push", "--from", &local, "--to", &cloud]
    } else {
        vec!["sync", "pull", "--from", &cloud, "--to", &local]
    };
    let stdout = run_runner(&app, &args, &config)?;
    Ok(format!(
        "sync {direction} done — {}",
        stdout.split_whitespace().collect::<String>()
    ))
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
    run_runner(&app, &strs, &env.unwrap_or_default())
}

fn now_stamp() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("{now}")
}