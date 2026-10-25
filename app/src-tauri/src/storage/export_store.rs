use crate::errors::ExportError;
use std::fs;
use std::path::Path;

/// File types the Quote Studio is allowed to write.
const ALLOWED_EXTENSIONS: [&str; 3] = ["pdf", "docx", "md"];

/// Write an exported document to a path the user picked in the save dialog.
pub fn write_export(path: &Path, contents: &[u8]) -> Result<(), ExportError> {
    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(str::to_ascii_lowercase)
        .ok_or_else(|| ExportError::InvalidPath("file has no extension".into()))?;

    if !ALLOWED_EXTENSIONS.contains(&extension.as_str()) {
        return Err(ExportError::InvalidPath(format!(
            "unsupported file type .{}",
            extension
        )));
    }

    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            return Err(ExportError::InvalidPath(format!(
                "folder {} does not exist",
                parent.display()
            )));
        }
    }

    fs::write(path, contents)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_allowed_extension() {
        let path = std::env::temp_dir().join(format!("archcalc-{}.md", uuid::Uuid::new_v4()));
        write_export(&path, b"# Quote").expect("write should succeed");
        assert_eq!(fs::read(&path).expect("file should exist"), b"# Quote");
        fs::remove_file(path).expect("cleanup");
    }

    #[test]
    fn rejects_other_extensions() {
        let path = std::env::temp_dir().join("archcalc-test.sh");
        assert!(matches!(
            write_export(&path, b"echo"),
            Err(ExportError::InvalidPath(_))
        ));
    }

    #[test]
    fn rejects_missing_extension() {
        let path = std::env::temp_dir().join("archcalc-test");
        assert!(write_export(&path, b"x").is_err());
    }
}
