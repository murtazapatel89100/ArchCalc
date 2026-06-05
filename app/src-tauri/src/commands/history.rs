use crate::errors::CalculatorError;
use crate::models::history::HistoryItem;
use crate::storage::history_store::load_history;
use tauri::AppHandle;

#[tauri::command]
pub fn get_history(app_handle: AppHandle) -> Result<Vec<HistoryItem>, CalculatorError> {
    load_history(&app_handle)
}
