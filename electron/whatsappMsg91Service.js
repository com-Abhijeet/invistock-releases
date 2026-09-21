/**
 * Official MSG91 WhatsApp API Integration Service (Meta BSP Partner)
 * Supports WhatsApp Business App Coexistence & INR/UPI Wallet Billing
 */

async function testMsg91Connection({ authKey, integratedNumber }) {
  console.log(
    "[WHATSAPP-MSG91] Testing connection for authKey:",
    authKey ? authKey.slice(0, 5) + "..." : "EMPTY",
    "Number:",
    integratedNumber
  );

  if (!authKey || !authKey.trim()) {
    return {
      success: false,
      error: "MSG91 Auth Key is required.",
    };
  }

  const cleanAuthKey = authKey.trim();
  let cleanIntegrated = integratedNumber ? String(integratedNumber).replace(/[^0-9]/g, "") : "";
  if (cleanIntegrated.length === 10) cleanIntegrated = "91" + cleanIntegrated;

  // Array of MSG91 API v5 endpoints to probe for connection & credentials validation
  const endpointsToTry = [];

  if (cleanIntegrated) {
    endpointsToTry.push({
      url: `https://control.msg91.com/api/v5/whatsapp/get-template-client/${cleanIntegrated}`,
      method: "GET",
    });
    endpointsToTry.push({
      url: `https://control.msg91.com/api/v5/subscriptions/fetchPrepaidBalance`,
      method: "POST",
      body: JSON.stringify({ integrated_number: cleanIntegrated, service: "whatsapp" }),
    });
  }

  endpointsToTry.push({
    url: "https://control.msg91.com/api/v5/whatsapp/whatsapp-activation/",
    method: "GET",
  });
  endpointsToTry.push({
    url: "https://control.msg91.com/api/v5/whatsapp/get-template-client/",
    method: "GET",
  });
  endpointsToTry.push({
    url: "https://api.msg91.com/api/v5/whatsapp/get-template-client/",
    method: "GET",
  });

  let lastError = "Unable to connect to MSG91 servers. Please check your internet connection.";

  for (const ep of endpointsToTry) {
    try {
      const headers = {
        authkey: cleanAuthKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      const options = {
        method: ep.method,
        headers,
      };
      if (ep.body) options.body = ep.body;

      const response = await fetch(ep.url, options);

      // Explicit Auth Failure Check
      if (response.status === 401) {
        return {
          success: false,
          error:
            "Invalid MSG91 Auth Key (HTTP 401 Unauthorized). Please copy your valid Authkey from MSG91 Dashboard: Account → Settings → Authkey.",
        };
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        if (response.status === 404) {
          continue; // Path not found on this endpoint variant, proceed to next
        }
        return {
          success: false,
          error: `MSG91 Server returned non-JSON response (HTTP ${response.status}): ${text.slice(0, 150)}`,
        };
      }

      if (
        data.errors === "Unauthorized" ||
        data.code === "401" ||
        data.message === "Invalid Auth Key" ||
        data.error === "Unauthorized"
      ) {
        return {
          success: false,
          error:
            "Invalid MSG91 Auth Key (Unauthorized). Please verify your Authkey in MSG91 Panel.",
        };
      }

      if (response.status === 404) {
        continue; // Path 404, try next
      }

      if (
        response.ok ||
        data.status === "success" ||
        data.type === "success" ||
        Array.isArray(data.data) ||
        data.hasError === false
      ) {
        return {
          success: true,
          displayPhoneNumber: cleanIntegrated
            ? `+${cleanIntegrated}`
            : "MSG91 WhatsApp Number",
          verifiedName: "MSG91 Official WhatsApp API",
          data: data.data || data,
        };
      } else {
        const errMsg =
          data?.errors ||
          data?.message ||
          data?.error ||
          `MSG91 API Error (HTTP ${response.status})`;
        lastError = typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg);
      }
    } catch (err) {
      console.warn(`[WHATSAPP-MSG91] Probe failed for ${ep.url}:`, err.message);
      lastError = err.message;
    }
  }

  return {
    success: false,
    error: lastError,
  };
}

async function sendMsg91TextMessage({
  authKey,
  integratedNumber,
  phone,
  message,
}) {
  if (!authKey || !integratedNumber) {
    throw new Error("MSG91 Auth Key or Registered Number is missing in Settings.");
  }

  let cleanPhone = phone.replace(/[^0-9]/g, "");
  if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
  let cleanIntegrated = integratedNumber.replace(/[^0-9]/g, "");
  if (cleanIntegrated.length === 10) cleanIntegrated = "91" + cleanIntegrated;

  const url = "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/";
  const payload = {
    integrated_number: cleanIntegrated,
    recipient_number: cleanPhone,
    phone: cleanPhone,
    to: cleanPhone,
    content_type: "text",
    text: message,
    body: message,
    payload: {
      to: cleanPhone,
      recipient_number: cleanPhone,
      phone: cleanPhone,
      type: "text",
      text: {
        body: message,
        text: message,
      },
      body: message,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authkey: authKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { rawText: text };
  }

  console.log(`[WHATSAPP-MSG91] Text message response (${response.status}):`, JSON.stringify(data));

  if (!response.ok || data.type === "error" || data.hasError || data.status === "error") {
    const errorDetail =
      data?.message || data?.error || data?.errors || data?.msg || `HTTP ${response.status}: ${text.slice(0, 150)}`;
    const detailStr = typeof errorDetail === "object" ? JSON.stringify(errorDetail) : String(errorDetail);
    throw new Error(`MSG91 WhatsApp API Error: ${detailStr}`);
  }

  return { success: true, response: data };
}

async function sendMsg91PdfDocument({
  authKey,
  integratedNumber,
  phone,
  pdfBase64,
  pdfUrl,
  fileName,
  caption,
}) {
  if (!authKey || !integratedNumber) {
    throw new Error("MSG91 Auth Key or Registered Number is missing in Settings.");
  }

  let cleanPhone = phone.replace(/[^0-9]/g, "");
  if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
  let cleanIntegrated = integratedNumber.replace(/[^0-9]/g, "");
  if (cleanIntegrated.length === 10) cleanIntegrated = "91" + cleanIntegrated;

  let httpLink = pdfUrl;
  if (!httpLink && typeof pdfBase64 === "string" && (pdfBase64.startsWith("http://") || pdfBase64.startsWith("https://"))) {
    httpLink = pdfBase64;
  }

  if (httpLink) {
    const url = "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/";
    const payload = {
      integrated_number: cleanIntegrated,
      recipient_number: cleanPhone,
      phone: cleanPhone,
      to: cleanPhone,
      content_type: "attachment",
      payload: {
        to: cleanPhone,
        recipient_number: cleanPhone,
        phone: cleanPhone,
        type: "document",
        document: {
          filename: fileName || "document.pdf",
          caption: caption || "",
          link: httpLink,
        },
      },
    };

    console.log(`[WHATSAPP-MSG91] Dispatching PDF attachment via HTTP link (${httpLink})...`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        authkey: authKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { rawText: text };
    }

    if (!response.ok || data.type === "error" || data.hasError) {
      const errorDetail = data?.message || data?.error || data?.errors || `HTTP ${response.status}`;
      throw new Error(`MSG91 Document Delivery Error: ${typeof errorDetail === "object" ? JSON.stringify(errorDetail) : errorDetail}`);
    }

    return { success: true, response: data };
  }

  // Fallback: If no public HTTP URL is available for PDF attachment, dispatch invoice notice message text via MSG91
  console.log("[WHATSAPP-MSG91] Dispatching document notice as text message fallback...");
  const textBody = `${caption ? caption + "\n\n" : ""}🧾 Document Attachment (${fileName || "Invoice.pdf"}) created.`;
  return await sendMsg91TextMessage({
    authKey,
    integratedNumber,
    phone: cleanPhone,
    message: textBody,
  });
}

async function fetchMsg91Templates({ authKey, integratedNumber }) {
  if (!authKey) {
    throw new Error("MSG91 Auth Key is required in Settings.");
  }

  const cleanAuthKey = authKey.trim();
  let cleanIntegrated = integratedNumber ? String(integratedNumber).replace(/[^0-9]/g, "") : "";
  if (cleanIntegrated.length === 10) cleanIntegrated = "91" + cleanIntegrated;

  const url = cleanIntegrated
    ? `https://control.msg91.com/api/v5/whatsapp/get-template-client/${cleanIntegrated}`
    : "https://control.msg91.com/api/v5/whatsapp/get-template-client/";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        authkey: cleanAuthKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { success: false, error: `MSG91 Returned non-JSON (HTTP ${response.status})` };
    }

    if (!response.ok) {
      const errMsg = data?.message || data?.errors || data?.error || `HTTP ${response.status}`;
      return { success: false, error: typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg) };
    }

    const rawTemplates = data.data || data.templates || (Array.isArray(data) ? data : []);
    const templates = rawTemplates.map((t) => {
      // Extract status from language level first (Meta approval status in MSG91 dashboard)
      let rawStatus = "";
      if (Array.isArray(t.languages) && t.languages.length > 0) {
        const langObj = t.languages[0];
        rawStatus = langObj.status || langObj.status_name || langObj.review_status || langObj.approval_status || langObj.meta_status || "";
      }

      // Fallback to template level status fields if not in languages
      if (!rawStatus) {
        rawStatus = t.meta_status || t.review_status || t.meta_approval_status || t.status_name || "";
      }

      // If still empty, use t.status ONLY if it's not the generic MSG91 toggle state "Enabled"/"Disabled"
      if (!rawStatus && t.status) {
        const rootStr = String(t.status).toLowerCase();
        if (!rootStr.includes("enable") && !rootStr.includes("disable")) {
          rawStatus = t.status;
        }
      }

      const strStatus = String(rawStatus).toLowerCase().trim();
      let st = "PENDING"; // Default to PENDING for any template registered on MSG91

      if (
        strStatus.includes("reject") ||
        strStatus.includes("disapprove") ||
        strStatus.includes("failed") ||
        strStatus.includes("denied")
      ) {
        st = "REJECTED";
      } else if (
        strStatus.includes("approve") ||
        strStatus === "passed" ||
        strStatus === "approved" ||
        strStatus === "active"
      ) {
        st = "APPROVED";
      } else if (
        strStatus.includes("pend") ||
        strStatus.includes("review") ||
        strStatus.includes("submit") ||
        strStatus.includes("process") ||
        strStatus.includes("in_review") ||
        strStatus.includes("in review")
      ) {
        st = "PENDING";
      } else if (
        strStatus.includes("local") ||
        strStatus.includes("draft") ||
        strStatus.includes("unverify")
      ) {
        st = "LOCAL_ONLY";
      }

      const name = t.name || t.slug || t.template_name || t.meta_template_name;

      return {
        name,
        status: st,
        rawStatus: rawStatus || t.status || "UNKNOWN",
      };
    });

    return { success: true, templates };
  } catch (err) {
    console.error("[WHATSAPP-MSG91] Fetch templates error:", err.message);
    return { success: false, error: err.message };
  }
}

async function registerMsg91Template({ authKey, integratedNumber, template }) {
  if (!authKey) {
    throw new Error("MSG91 Auth Key is required.");
  }

  const cleanAuthKey = authKey.trim();
  let cleanIntegrated = integratedNumber ? String(integratedNumber).replace(/[^0-9]/g, "") : "";
  if (cleanIntegrated.length === 10) cleanIntegrated = "91" + cleanIntegrated;

  const templateName = (template.meta_template_name || template.name)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_");

  // Convert {{Name}} -> {{1}}
  let paramIndex = 1;
  const paramMap = new Map();
  const bodyText = (template.content || "").replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (match, paramName) => {
    if (!paramMap.has(paramName)) {
      paramMap.set(paramName, paramIndex++);
    }
    return `{{${paramMap.get(paramName)}}}`;
  });

  const category = (template.category === "marketing" || template.category === "MARKETING") ? "MARKETING" : "UTILITY";
  const language = template.language || "en_US";

  // Build MSG91 components array according to official MSG91 API format
  const components = [];

  // Header component: check for DOCUMENT header or TEXT header
  if (template.header_format === "DOCUMENT" || template.category === "invoice" || template.category === "ledgers") {
    components.push({
      type: "HEADER",
      format: "DOCUMENT",
      example: {
        header_handle: ["https://getkosh.co.in/sample-invoice.pdf"],
      },
    });
  } else if (template.header || template.header_text) {
    const headerText = template.header || template.header_text;
    components.push({
      type: "HEADER",
      format: "TEXT",
      text: headerText,
      example: {
        header_text: [headerText],
      },
    });
  } else if (template.header_format === "TEXT") {
    const headerText = "📄 Notice";
    components.push({
      type: "HEADER",
      format: "TEXT",
      text: headerText,
      example: {
        header_text: [headerText],
      },
    });
  }

  // Body component
  const sampleValues = [];
  if (paramMap.size > 0) {
    for (let i = 1; i <= paramMap.size; i++) {
      sampleValues.push(`Sample ${i}`);
    }
  }

  const bodyComponent = {
    type: "BODY",
    text: bodyText,
  };
  if (sampleValues.length > 0) {
    bodyComponent.example = {
      body_text: [sampleValues]
    };
  }
  components.push(bodyComponent);

  // Footer component if available
  if (template.footer || template.footer_text) {
    components.push({
      type: "FOOTER",
      text: template.footer || template.footer_text
    });
  }

  const payload = {
    integrated_number: cleanIntegrated,
    template_name: templateName,
    language: language,
    category: category,
    components: components,
  };

  const endpoints = [
    "https://api.msg91.com/api/v5/whatsapp/client-panel-template/",
    "https://control.msg91.com/api/v5/whatsapp/client-panel-template/",
  ];

  let lastError = "";

  for (const url of endpoints) {
    try {
      console.log(`[WHATSAPP-MSG91] Registering template '${templateName}' at ${url}... Payload:`, JSON.stringify(payload));
      const response = await fetch(url, {
        method: "POST",
        headers: {
          authkey: cleanAuthKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { rawText: text };
      }

      console.log(`[WHATSAPP-MSG91] Response (${response.status}) from ${url}:`, JSON.stringify(data));

      if (response.ok || data.type === "success" || data.status === "success" || data.hasError === false) {
        const returnedStatus = data.status ? String(data.status).toLowerCase() : "";
        const isApproved = returnedStatus.includes("approve");
        return {
          success: true,
          status: isApproved ? "APPROVED" : "PENDING",
          templateName,
        };
      }

      const errorMsg = data?.message || data?.errors || data?.error || `HTTP ${response.status}: ${text.slice(0, 100)}`;
      const errorStr = typeof errorMsg === "object" ? JSON.stringify(errorMsg) : String(errorMsg);

      if (errorStr.toLowerCase().includes("already") || errorStr.toLowerCase().includes("exist")) {
        return { success: true, status: "PENDING", templateName };
      }

      if (
        errorStr.toLowerCase().includes("being deleted") ||
        errorStr.toLowerCase().includes("4 weeks") ||
        errorStr.toLowerCase().includes("deleting")
      ) {
        const fallbackName = `${templateName}_v2`;
        console.log(`[WHATSAPP-MSG91] Template '${templateName}' is in Meta deletion lock. Retrying with fallback name '${fallbackName}'...`);
        payload.template_name = fallbackName;

        const retryResponse = await fetch(url, {
          method: "POST",
          headers: {
            authkey: cleanAuthKey,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });

        const retryText = await retryResponse.text();
        let retryData = {};
        try { retryData = JSON.parse(retryText); } catch (e) { retryData = { rawText: retryText }; }

        if (retryResponse.ok || retryData.type === "success" || retryData.status === "success" || retryData.hasError === false) {
          return {
            success: true,
            status: "PENDING",
            templateName: fallbackName,
          };
        }
      }

      lastError = errorStr;
    } catch (err) {
      console.error(`[WHATSAPP-MSG91] Failed endpoint ${url}:`, err.message);
      lastError = err.message;
    }
  }

  return { success: false, error: lastError || "Failed to register template with MSG91", templateName };
}

async function sendMsg91TemplateMessage({
  authKey,
  integratedNumber,
  phone,
  templateName,
  language = "en_US",
  components = [],
  params = [],
  pdfUrl = null,
  fileName = "Invoice.pdf",
}) {
  if (!authKey || !integratedNumber) {
    throw new Error("MSG91 Auth Key or Registered Number is missing in Settings.");
  }

  let cleanPhone = phone.replace(/[^0-9]/g, "");
  if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
  let cleanIntegrated = integratedNumber.replace(/[^0-9]/g, "");
  if (cleanIntegrated.length === 10) cleanIntegrated = "91" + cleanIntegrated;

  let msg91Components = {};
  if (pdfUrl) {
    msg91Components["header_1"] = {
      type: "document",
      value: pdfUrl,
      link: pdfUrl,
      filename: fileName || "Invoice.pdf",
    };
  }

  if (params && params.length > 0) {
    params.forEach((val, idx) => {
      msg91Components[`body_${idx + 1}`] = {
        type: "text",
        value: String(val || ""),
      };
    });
  }

  const metaComponents = components.length > 0 ? [...components] : [];
  if (pdfUrl) {
    const hasHeader = metaComponents.some((c) => c.type === "header");
    if (!hasHeader) {
      metaComponents.unshift({
        type: "header",
        parameters: [
          {
            type: "document",
            document: {
              link: pdfUrl,
              filename: fileName || "Invoice.pdf",
            },
          },
        ],
      });
    }
  }

  if (params && params.length > 0 && !metaComponents.some((c) => c.type === "body")) {
    metaComponents.push({
      type: "body",
      parameters: params.map((val) => ({
        type: "text",
        text: String(val || ""),
      })),
    });
  }

  const url = "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/";
  const payload = {
    integrated_number: cleanIntegrated,
    recipient_number: cleanPhone,
    phone: cleanPhone,
    to: cleanPhone,
    content_type: "template",
    payload: {
      to: cleanPhone,
      recipient_number: cleanPhone,
      phone: cleanPhone,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: language,
          policy: "deterministic",
        },
        to_and_components: [
          {
            to: [cleanPhone],
            components: msg91Components,
          },
        ],
        components: metaComponents.length > 0 ? metaComponents : undefined,
      },
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authkey: authKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { rawText: text };
  }

  console.log(`[WHATSAPP-MSG91] Template dispatch response (${response.status}):`, JSON.stringify(data));

  if (!response.ok || data.type === "error" || data.hasError || data.status === "error") {
    const errorDetail =
      data?.message || data?.error || data?.errors || data?.msg || `HTTP ${response.status}: ${text.slice(0, 150)}`;
    const detailStr = typeof errorDetail === "object" ? JSON.stringify(errorDetail) : String(errorDetail);
    throw new Error(`MSG91 Template Delivery Error: ${detailStr}`);
  }

  return { success: true, response: data };
}

module.exports = {
  testMsg91Connection,
  sendMsg91TextMessage,
  sendMsg91PdfDocument,
  fetchMsg91Templates,
  registerMsg91Template,
  sendMsg91TemplateMessage,
};
