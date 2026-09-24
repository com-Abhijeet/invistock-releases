/**
 * rawPrinter.js
 * Native Windows RAW Printer Spooler Utility for TSPL / ZPL / ESC-POS (.prn) files.
 * Sends raw bytes directly to thermal label printers (TSC, TVS, Zebra, Xprinter) via winspool.drv RAW mode.
 */

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Send raw string content (TSPL/ZPL) directly to Windows printer in RAW mode.
 * @param {string} printerName Name of the Windows printer queue (e.g. "TSC TTP-244 Pro")
 * @param {string} rawContent Raw PRN TSPL command text string
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendRawToPrinter(printerName, rawContent) {
  return new Promise((resolve) => {
    try {
      if (!rawContent || typeof rawContent !== "string") {
        return resolve({ success: false, error: "Empty PRN content" });
      }

      const tempFile = path.join(os.tmpdir(), `raw-print-${Date.now()}.prn`);
      fs.writeFileSync(tempFile, rawContent, "utf-8");

      const sanitizedPrinterName = (printerName || "").trim().replace(/'/g, "''");

      // PowerShell Script using native Windows winspool.drv RAW API
      const psScript = `
$tempFile = '${tempFile.replace(/'/g, "''")}'
$printerName = '${sanitizedPrinterName}'

if ([string]::IsNullOrWhiteSpace($printerName)) {
    $defPrinter = Get-CimInstance Win32_Printer -Filter "Default = True"
    if ($defPrinter) {
        $printerName = $defPrinter.Name
    }
}

if ([string]::IsNullOrWhiteSpace($printerName)) {
    Write-Error "No printer name specified and no default printer found."
    exit 1
}

$code = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, byte[] pBytes) {
        Int32 dwWritten = 0;
        IntPtr hPrinter = new IntPtr(0);
        DOCINFOA di = new DOCINFOA();
        bool bSuccess = false;

        di.pDocName = "Kosh Barcode Label RAW";
        di.pDataType = "RAW";

        if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(pBytes.Length);
                    Marshal.Copy(pBytes, 0, pUnmanagedBytes, pBytes.Length);
                    bSuccess = WritePrinter(hPrinter, pUnmanagedBytes, pBytes.Length, out dwWritten);
                    Marshal.FreeCoTaskMem(pUnmanagedBytes);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        return bSuccess;
    }
}
"@

Add-Type -TypeDefinition $code -Language CSharp
$bytes = [System.IO.File]::ReadAllBytes($tempFile)
$result = [RawPrinterHelper]::SendBytesToPrinter($printerName, $bytes)
if ($result) {
    Write-Output "SUCCESS: Printed RAW payload to $printerName"
} else {
    Write-Error "FAILED: Could not print RAW payload to $printerName"
    exit 1
}
`;

      const ps1File = path.join(os.tmpdir(), `raw-script-${Date.now()}.ps1`);
      fs.writeFileSync(ps1File, psScript, "utf-8");

      const psCmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${ps1File}"`;

      exec(psCmd, (error, stdout, stderr) => {
        // Clean up temp files
        fs.unlink(tempFile, () => {});
        fs.unlink(ps1File, () => {});

        if (error) {
          console.error("❌ RAW Printer Error:", stderr || error.message);
          return resolve({ success: false, error: stderr || error.message });
        }

        console.log("✅ RAW TSPL Label sent to printer:", stdout.trim());
        resolve({ success: true });
      });
    } catch (err) {
      console.error("❌ RAW print exception:", err);
      resolve({ success: false, error: err.message });
    }
  });
}

module.exports = { sendRawToPrinter };
