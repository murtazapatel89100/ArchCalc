use crate::errors::CalculatorError;
use crate::models::history::HistoryItem;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

fn get_history_file_path(app: &AppHandle) -> Result<PathBuf, CalculatorError> {
    let mut path = app.path().app_data_dir().map_err(|e| {
        CalculatorError::IoError(format!("Failed to get app data directory: {}", e))
    })?;
    path.push("history.json");
    Ok(path)
}

fn ensure_directory_exists(path: &Path) -> Result<(), CalculatorError> {
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)?;
        }
    }
    Ok(())
}

pub fn load_history(app: &AppHandle) -> Result<Vec<HistoryItem>, CalculatorError> {
    let file_path = get_history_file_path(app)?;
    if !file_path.exists() {
        return Ok(Vec::new());
    }

    let data = fs::read_to_string(file_path)?;
    let history: Vec<HistoryItem> = serde_json::from_str(&data).unwrap_or_else(|_| Vec::new());
    Ok(history)
}

pub fn save_history(app: &AppHandle, history: &Vec<HistoryItem>) -> Result<(), CalculatorError> {
    let file_path = get_history_file_path(app)?;
    ensure_directory_exists(&file_path)?;

    let data = serde_json::to_string_pretty(history)
        .map_err(|e| CalculatorError::IoError(format!("Failed to serialize history: {}", e)))?;

    fs::write(file_path, data)?;
    Ok(())
}

pub fn add_history_item(app: &AppHandle, item: HistoryItem) -> Result<(), CalculatorError> {
    let mut history = load_history(app)?;
    history.push(item);

    // Optional: Keep only the last 100 items to avoid infinite growth
    if history.len() > 100 {
        history.remove(0);
    }

    save_history(app, &history)
}
