export class ResponseParser {
  static parse(responseText) {
    if (
      responseText.includes("<CREATED>1</CREATED>") ||
      responseText.includes("<ALTERED>1</ALTERED>") ||
      responseText.includes("<DELETED>1</DELETED>")
    ) {
      return { success: true, message: "Synced successfully" };
    }

    // Detailed error parsing
    let errMsg = "Tally Rejected XML (Silent Failure).";
    
    const lineErrorMatch = responseText.match(/<LINEERROR>(.*?)<\/LINEERROR>/);
    if (lineErrorMatch) errMsg = lineErrorMatch[1];
    else {
      const descMatch = responseText.match(/<DESC>(.*?)<\/DESC>/);
      if (descMatch) errMsg = descMatch[1];
    }
    
    // Sometimes error is in <STATUS> or <ERRORS>
    const errorsMatch = responseText.match(/<ERRORS>(.*?)<\/ERRORS>/);
    if (errorsMatch && Number(errorsMatch[1]) > 0 && errMsg === "Tally Rejected XML (Silent Failure).") {
      errMsg = "Tally reported an error but provided no description. Check raw logs.";
    }

    return { success: false, message: errMsg };
  }
}
