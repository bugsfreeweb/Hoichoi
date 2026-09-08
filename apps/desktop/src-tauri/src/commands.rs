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