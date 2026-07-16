import http from "http";
import { getTallyConfig } from "../db/tallyDb.mjs";
import { wrapInEnvelope } from "./tallyXMLGenerator.mjs";

export async function sendToTally(xmlContent) {
    const host = getTallyConfig('tally_host') || 'localhost';
    const port = getTallyConfig('tally_port') || '9000';
    
    const tallyUrl = `http://${host}:${port}`;
    const fullXml = wrapInEnvelope(xmlContent);

    return new Promise((resolve) => {
        const options = {
            hostname: host,
            port: parseInt(port, 10),
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml',
                'Content-Length': Buffer.byteLength(fullXml)
            },
            timeout: 10000
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                const responseData = data;
                
                // Parse response
                if (responseData.includes("<LINEERROR>")) {
                    const errorMatch = responseData.match(/<LINEERROR>(.*?)<\/LINEERROR>/);
                    const errorMessage = errorMatch ? errorMatch[1] : "Unknown Tally Error";
                    return resolve({
                        success: false,
                        error: errorMessage,
                        response: responseData,
                        request: fullXml
                    });
                }

                if (responseData.includes("<CREATED>1</CREATED>") || responseData.includes("<ALTERED>1</ALTERED>")) {
                    return resolve({
                        success: true,
                        response: responseData,
                        request: fullXml
                    });
                }

                if (responseData.includes("<ERRORS>0</ERRORS>") || !responseData.includes("ERROR")) {
                     return resolve({
                        success: true,
                        response: responseData,
                        request: fullXml
                    });
                }

                return resolve({
                    success: false,
                    error: "Failed to parse Tally success response.",
                    response: responseData,
                    request: fullXml
                });
            });
        });

        req.on('error', (error) => {
            let errorMsg = error.message;
            if (error.code === 'ECONNREFUSED') {
                errorMsg = `Could not connect to Tally on ${tallyUrl}. Is Tally running and Port ${port} configured?`;
            }
            resolve({
                success: false,
                error: errorMsg,
                request: fullXml,
                response: null
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                error: `Connection to Tally timed out after 10 seconds.`,
                request: fullXml,
                response: null
            });
        });

        req.write(fullXml);
        req.end();
    });
}
