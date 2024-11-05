use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::Manager;

mod deno;
mod sqlite;

// Store thread handles and their status
static THREAD_HANDLES: Lazy<Mutex<HashMap<String, std::thread::JoinHandle<Result<(), String>>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

#[tauri::command]
fn run_code(app_handle: tauri::AppHandle, task_id: &str, code: &str) -> Result<(), String> {
    let app_path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let app_path = app_path.clone();
    let code = code.to_string();

    let task_id = task_id.to_string();
    let task_id_clone = task_id.clone();
    let handle = std::thread::spawn(move || {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .map_err(|e| e.to_string())?;

        runtime.block_on(async {
            let _ = deno::run(&app_path, &task_id_clone, &code).await;
        });

        Ok::<_, String>(())
    });

    // Store the handle
    THREAD_HANDLES.lock().unwrap().insert(task_id, handle);

    Ok(())
}

#[tauri::command]
fn stop_code(task_id: String) -> Result<(), String> {
    let mut handles = THREAD_HANDLES.lock().unwrap();

    if let Some(handle) = handles.remove(&task_id) {
        // Thread is already finished
        if handle.is_finished() {
            return Ok(());
        }

        // Attempt to stop the thread
        std::thread::spawn(move || {
            // Wait for thread to complete
            match handle.join() {
                Ok(_) => Ok(()),
                Err(_) => Err("Failed to stop thread".to_string()),
            }
        });
    }

    Ok(())
}

#[tauri::command]
fn get_return_value(task_id: String) -> Result<String, String> {
    let handles = THREAD_HANDLES.lock().unwrap();

    // Check if thread is still running
    if let Some(handle) = handles.get(&task_id) {
        if !handle.is_finished() {
            return Err("Task still running".to_string());
        }
    }

    let return_value = deno::get_return_value(&task_id);
    deno::clear_return_value(&task_id);
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
            stop_code,
            get_return_value,
            sqlite_query,
            sqlite_execute
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
