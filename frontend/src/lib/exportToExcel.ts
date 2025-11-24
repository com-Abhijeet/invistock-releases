
interface ExcelExportOptions<T> {
  data: T[];
  fileName: string;
  columnMap: { [key in keyof T]?: string }; // Optional pretty labels
}

export async function exportToExcel<T>({
  data,
  fileName,
  columnMap,
}: ExcelExportOptions<T>) {
  if (!window.electron?.ipcRenderer?.invoke) {
    throw new Error("Electron IPC not available in renderer.");
  }

  try {
    await window.electron.ipcRenderer.invoke("generate-excel-report", {
      data,
      fileName,
      columnMap,
    });
  } catch (err) {
    console.error("❌ Excel export failed:", err);
  }
}
