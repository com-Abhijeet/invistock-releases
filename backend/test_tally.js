const xml3 = `
<ENVELOPE>
    <HEADER>
      <TALLYREQUEST>Import Data</TALLYREQUEST>
    </HEADER>
    <BODY>
      <IMPORTDATA>
        <REQUESTDESC>
          <REPORTNAME>Vouchers</REPORTNAME>
          <STATICVARIABLES>
            <SVCURRENTCOMPANY>##SVCurrentCompany</SVCURRENTCOMPANY>
          </STATICVARIABLES>
        </REQUESTDESC>
        <REQUESTDATA>
          <TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Sales" ACTION="Create">
      <DATE>20260601</DATE>
      <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
      <PARTYLEDGERNAME>Abhijeet Shinde</PARTYLEDGERNAME>
      
      <!-- Party Ledger -->
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>Abhijeet Shinde</LEDGERNAME>
        <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
        <AMOUNT>-127.50</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
      
      <!-- Sales Ledger with Inventory nested inside -->
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>Sales Account</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>127.50</AMOUNT>
        
        <INVENTORYALLOCATIONS.LIST>
          <STOCKITEMNAME>Soap</STOCKITEMNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <RATE>127.50/pcs</RATE>
          <AMOUNT>127.50</AMOUNT>
          <ACTUALQTY> 1 pcs</ACTUALQTY>
          <BILLEDQTY> 1 pcs</BILLEDQTY>
          <BATCHALLOCATIONS.LIST>
            <GODOWNNAME>Main Location</GODOWNNAME>
            <BATCHNAME>Primary Batch</BATCHNAME>
            <AMOUNT>127.50</AMOUNT>
            <ACTUALQTY> 1 pcs</ACTUALQTY>
            <BILLEDQTY> 1 pcs</BILLEDQTY>
          </BATCHALLOCATIONS.LIST>
        </INVENTORYALLOCATIONS.LIST>
      </ALLLEDGERENTRIES.LIST>
      
    </VOUCHER>
    </TALLYMESSAGE>
        </REQUESTDATA>
      </IMPORTDATA>
    </BODY>
  </ENVELOPE>
`;

const http = require('http');
fetch('http://localhost:9000', {
  method: 'POST',
  headers: { 'Content-Type': 'application/xml' },
  body: xml3
}).then(res => res.text()).then(console.log).catch(console.error);
