mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_stronghold::Builder::new(|password: &str| password.as_bytes().to_vec()).build(),
        )
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            commands::run_pipeline,
            commands::open_admin,
            commands::repo_root,
        ])
        .run(tauri::generate_context!())
        .expect("error while running hoichoi desk");
}