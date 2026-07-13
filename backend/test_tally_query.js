const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Day Book</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <SVFROMDATE>20260401</SVFROMDATE>
          <SVTODATE>20260401</SVTODATE>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>
`;

const http = require('http');
fetch('http://localhost:9000', {
  method: 'POST',
  headers: { 'Content-Type': 'application/xml' },
  body: xml
}).then(res => res.text()).then(console.log).catch(console.error);
