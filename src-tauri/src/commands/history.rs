// This file will contain Tauri commands exposed to the frontend for history operations.
// For example: #[tauri::command] pub fn get_history() -> Result<Vec<HistoryItem>, String> { ... }

#[tauri::command]
pub fn get_history() -> Result<Vec<String>, String> {
    Ok(vec![])
}
