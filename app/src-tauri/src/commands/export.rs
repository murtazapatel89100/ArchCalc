use crate::errors::ExportError;
use crate::storage::export_store::write_export;
use std::path::PathBuf;

#[tauri::command]
pub fn save_export_file(path: String, contents: Vec<u8>) -> Result<(), ExportError> {
    write_export(&PathBuf::from(path), &contents)
}
