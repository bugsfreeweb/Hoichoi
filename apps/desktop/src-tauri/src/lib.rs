mod commands;
mod vault;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            commands::warm_daemon(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::run_pipeline,
            commands::stop_pipeline,
            commands::open_admin,
            commands::repo_root,
            commands::settings_get,
            commands::settings_set,
            commands::save_env_file,
            commands::backup_export,
            commands::backup_import,
            commands::reset_db,
            commands::sync_db,
            commands::admin_codes,
            commands::desk_call,
            vault::vault_set,
            vault::vault_get,
            vault::vault_delete,
            vault::vault_names,
        ])
        .build(tauri::generate_context!())
        .expect("error while building hoichoi desk")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                commands::shutdown_daemon(app);
            }
        });
}