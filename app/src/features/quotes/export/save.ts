import { invoke, isTauri } from "@tauri-apps/api/core";

export type ExportFormat = "pdf" | "docx" | "md" | "xlsx" | "csv";

const formatInfo: Record<ExportFormat, { name: string; mime: string }> = {
  pdf: { name: "PDF document", mime: "application/pdf" },
  docx: {
    name: "Word document",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  md: { name: "Markdown", mime: "text/markdown" },
  xlsx: {
    name: "Excel workbook",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  csv: { name: "CSV", mime: "text/csv" },
};

/**
 * Ask the user where to save, then write via the Rust `save_export_file` command.
 * Outside Tauri (plain browser dev) it falls back to a download link.
 * Returns the saved path, or null if the user cancelled.
 */
export async function saveExport(
  bytes: Uint8Array,
  baseName: string,
  format: ExportFormat,
): Promise<string | null> {
  const fileName = `${baseName}.${format}`;
  const info = formatInfo[format];

  if (!isTauri()) {
    const blob = new Blob([bytes as BlobPart], { type: info.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return fileName;
  }

  const { save } = await import("@tauri-apps/plugin-dialog");
  const path = await save({
    defaultPath: fileName,
    filters: [{ name: info.name, extensions: [format] }],
  });
  if (!path) return null;

  await invoke("save_export_file", { path, contents: Array.from(bytes) });
  return path;
}
