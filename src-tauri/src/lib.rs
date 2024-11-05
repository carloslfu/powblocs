use tauri::Manager;

mod deno;
mod sqlite;

#[tauri::command]
fn run_code(app_handle: tauri::AppHandle, code: &str) -> Result<String, String> {
    let app_path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let app_path = app_path.clone();
    let code = code.to_string();
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(|e| e.to_string())?;

    runtime.block_on(async {
        let _ = deno::run(&app_path, &code).await;
    });

    let return_value = deno::get_return_value();

    println!("Return value: {}", return_value);

    Ok(return_value)
}

#[tauri::command]
fn sqlite_query(
    query: &str,
    params: Vec<libsql::Value>,
) -> Result<Vec<Vec<libsql::Value>>, String> {
    let runtime = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;

    runtime.block_on(async {
        let db = sqlite::SqliteDb::instance()
            .await
            .map_err(|e| e.to_string())?;
        let results = db.query(&query, params).await.map_err(|e| e.to_string())?;
        Ok(results)
    })
}

#[tauri::command]
fn sqlite_execute(query: &str, params: Vec<libsql::Value>) -> Result<(), String> {
    let runtime = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;
    runtime.block_on(async {
        let db = sqlite::SqliteDb::instance()
            .await
            .map_err(|e| e.to_string())?;

        db.execute(&query, params).await.map_err(|e| e.to_string())
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            run_code,
            sqlite_query,
            sqlite_execute
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
