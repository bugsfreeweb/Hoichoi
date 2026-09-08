//! Encrypted local credential vault.
//!
//! Replaces the deprecated `tauri-plugin-stronghold`, whose upstream crate
//! fails on Windows with `illegal non-contiguous size` (tauri-apps/
//! plugins-workspace#706, closed as not-planned). Values are encrypted with
//! AES-256-GCM under a random 32-byte master key stored in the app data dir.

use std::collections::HashMap;
use std::path::PathBuf;

use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use tauri::Manager;

const KEY_FILE: &str = "vault.key";
const DATA_FILE: &str = "vault.json";

#[derive(Serialize, Deserialize, Default)]
struct VaultData {
    /// name -> hex(nonce || ciphertext)
    entries: HashMap<String, String>,
}

fn data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir failed: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("create_dir_all failed: {e}"))?;
    Ok(dir)
}

/// Load (or create on first use) the 32-byte master key.
fn master_key(app: &tauri::AppHandle) -> Result<[u8; 32], String> {
    let path = data_dir(app)?.join(KEY_FILE);
    if path.is_file() {
        let bytes = std::fs::read(&path).map_err(|e| format!("read key failed: {e}"))?;
        let key: [u8; 32] = bytes
            .try_into()
            .map_err(|_| "vault key file is corrupt".to_string())?;
        Ok(key)
    } else {
        let mut key = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut key);
        std::fs::write(&path, key).map_err(|e| format!("write key failed: {e}"))?;
        Ok(key)
    }
}

fn load_data(app: &tauri::AppHandle) -> Result<VaultData, String> {
    let path = data_dir(app)?.join(DATA_FILE);
    if !path.is_file() {
        return Ok(VaultData::default());
    }
    let raw = std::fs::read_to_string(&path).map_err(|e| format!("read vault failed: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("parse vault failed: {e}"))
}

fn persist(app: &tauri::AppHandle, data: &VaultData) -> Result<(), String> {
    let path = data_dir(app)?.join(DATA_FILE);
    let raw = serde_json::to_string_pretty(data).map_err(|e| format!("encode vault failed: {e}"))?;
    std::fs::write(&path, raw).map_err(|e| format!("write vault failed: {e}"))
}

fn to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn from_hex(s: &str) -> Result<Vec<u8>, String> {
    if s.len() % 2 != 0 {
        return Err("bad hex length".into());
    }
    (0..s.len() / 2)
        .map(|i| u8::from_str_radix(&s[i * 2..i * 2 + 2], 16).map_err(|e| e.to_string()))
        .collect()
}

fn encrypt(app: &tauri::AppHandle, plaintext: &[u8]) -> Result<String, String> {
    let key = master_key(app)?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let ct = cipher
        .encrypt(Nonce::from_slice(&nonce_bytes), plaintext)
        .map_err(|e| format!("encrypt failed: {e}"))?;
    let mut out = Vec::with_capacity(12 + ct.len());
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ct);
    Ok(to_hex(&out))
}

fn decrypt(app: &tauri::AppHandle, blob: &str) -> Result<Vec<u8>, String> {
    let key = master_key(app)?;
    let bytes = from_hex(blob)?;
    if bytes.len() < 13 {
        return Err("vault entry too short".into());
    }
    let (nonce_bytes, ct) = bytes.split_at(12);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    cipher
        .decrypt(Nonce::from_slice(nonce_bytes), ct)
        .map_err(|_| "decrypt failed — vault tampered or key rotated".to_string())
}

#[tauri::command]
pub async fn vault_set(
    app: tauri::AppHandle,
    name: String,
    value: String,
) -> Result<(), String> {
    let mut data = load_data(&app)?;
    let blob = encrypt(&app, value.as_bytes())?;
    data.entries.insert(name, blob);
    persist(&app, &data)
}

#[tauri::command]
pub async fn vault_get(app: tauri::AppHandle, name: String) -> Result<Option<String>, String> {
    let data = load_data(&app)?;
    match data.entries.get(&name) {
        Some(blob) => {
            let bytes = decrypt(&app, blob)?;
            Ok(Some(String::from_utf8_lossy(&bytes).into_owned()))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn vault_delete(app: tauri::AppHandle, name: String) -> Result<(), String> {
    let mut data = load_data(&app)?;
    data.entries.remove(&name);
    persist(&app, &data)
}

#[tauri::command]
pub async fn vault_names(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let data = load_data(&app)?;
    Ok(data.entries.keys().cloned().collect())
}
