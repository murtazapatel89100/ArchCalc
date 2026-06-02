// This file will contain Tauri commands exposed to the frontend for calculator operations.
// For example: #[tauri::command] pub fn evaluate(expression: String) -> Result<String, String> { ... }

#[tauri::command]
pub fn evaluate(_expression: String) -> Result<String, String> {
    Ok("0".to_string())
}
