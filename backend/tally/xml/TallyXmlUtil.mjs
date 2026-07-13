export function escapeXML(unsafe) {
  if (!unsafe) return "";
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function normalizeTallyUnit(unit) {
  const normalized = unit ? unit.toString().trim() : "";
  return normalized || "pcs";
}

export function wrapTallyXML(innerXML, reportType = "Vouchers") {
  return `<ENVELOPE>
    <HEADER>
      <TALLYREQUEST>Import Data</TALLYREQUEST>
    </HEADER>
    <BODY>
      <IMPORTDATA>
        <REQUESTDESC>
          <REPORTNAME>${reportType}</REPORTNAME>
          <STATICVARIABLES>
            <SVCURRENTCOMPANY>##SVCurrentCompany</SVCURRENTCOMPANY>
          </STATICVARIABLES>
        </REQUESTDESC>
        <REQUESTDATA>
          ${innerXML}
        </REQUESTDATA>
      </IMPORTDATA>
    </BODY>
  </ENVELOPE>`;
}

export function formatTallyDate(dateString, educational_mode = 1) {
  const fallbackDate = new Date();

  const formatParts = (year, month, day) => {
    const mm = String(month).padStart(2, "0");
    let dd = String(day).padStart(2, "0");

    if (educational_mode == 1 || educational_mode === true || educational_mode === "1") {
      if (dd !== "01" && dd !== "02" && dd !== "31") {
        dd = "01";
      }
    }

    return `${year}${mm}${dd}`;
  };

  const fallback = () => formatParts(
    fallbackDate.getFullYear(),
    fallbackDate.getMonth() + 1,
    fallbackDate.getDate(),
  );

  if (!dateString || !dateString.toString().trim()) return fallback();

  try {
    const rawDate = dateString.toString().trim();
    if (/^\d{8}$/.test(rawDate)) return rawDate;

    const datePart = rawDate.split("T")[0].split(" ")[0];
    const parts = datePart.split("-");

    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];

      if (/^\d{4}$/.test(year) && /^\d{1,2}$/.test(month) && /^\d{1,2}$/.test(day)) {
        return formatParts(year, month, day);
      }
    }
    return fallback();
  } catch (err) {
    return fallback();
  }
}
