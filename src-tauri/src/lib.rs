use tauri::Manager;

mod deno;

#[tauri::command]
fn run_code(app_handle: tauri::AppHandle, code: &str) -> Result<(), String> {
    let app_path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let app_path = app_path.clone();
    let code = code.to_string();
    let runtime = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;
    runtime.block_on(async {
        let _ = deno::run(&app_path, &code).await;
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![run_code])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
