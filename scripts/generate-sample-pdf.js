// Quick script to generate a sample rate card PDF for testing
const PDFDocument = require('pdf-parse');
const fs = require('fs');

// Since we don't have a PDF generation lib, create a simple text file
// that pdf-parse can process, OR create a real minimal PDF

// Create a minimal valid PDF with rate card data
const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]
   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj

5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj

4 0 obj
<< /Length 1800 >>
stream
BT
/F1 16 Tf
50 740 Td
(RATE CARD - Global Freight Corp) Tj
/F1 10 Tf
0 -25 Td
(Client: Acme Logistics) Tj
0 -15 Td
(Effective Date: 2026-07-01) Tj
0 -15 Td
(Expiry Date: 2027-06-30) Tj
0 -15 Td
(Currency: USD) Tj
0 -30 Td
/F1 11 Tf
(Lane ID        Origin    Destination    Rate     Min Charge    Service Level) Tj
/F1 10 Tf
0 -20 Td
(LAX-JFK001     LAX       JFK            1550     500           Standard) Tj
0 -15 Td
(ORD-LAX002     ORD       LAX            1275     450           Standard) Tj
0 -15 Td
(SFO-MIA003     SFO       MIA            1850     550           Express) Tj
0 -15 Td
(JFK-LHR004     JFK       LHR            2400     800           Standard) Tj
0 -15 Td
(LAX-NRT005     LAX       NRT            3200     1000          Express) Tj
0 -15 Td
(ORD-FRA006     ORD       FRA            2650     750           Standard) Tj
0 -15 Td
(MIA-GRU007     MIA       GRU            2100     600           Economy) Tj
0 -15 Td
(SFO-HKG008     SFO       HKG            2950     900           Standard) Tj
0 -15 Td
(SEA-PVG009     SEA       PVG            2800     850           Standard) Tj
0 -15 Td
(ATL-CDG010     ATL       CDG            2350     700           Express) Tj
0 -15 Td
(DFW-SIN011     DFW       SIN            3100     950           Standard) Tj
0 -15 Td
(IAH-AMS012     IAH       AMS            2500     750           Standard) Tj
0 -15 Td
(BOS-DXB013     BOS       DXB            3500     1100          Express) Tj
0 -15 Td
(PHL-ICN014     PHL       ICN            3050     950           Economy) Tj
0 -15 Td
(DEN-SYD015     DEN       SYD            3800     1200          Standard) Tj
0 -30 Td
(Fuel Surcharge: 2.5%) Tj
0 -15 Td
(Security Surcharge: 1.0%) Tj
0 -15 Td
(Peak Season Surcharge: 5.0% - applicable Nov-Jan) Tj
0 -25 Td
(Terms: Net 30 days. Rates subject to volume commitments.) Tj
0 -15 Td
(Contact: rates@globalfreightcorp.com) Tj
ET
endstream
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000282 00000 n 
0000000206 00000 n 

trailer
<< /Size 6 /Root 1 0 R >>
startxref
2136
%%EOF`;

fs.writeFileSync('sample-ratecard.pdf', pdfContent);
console.log('✅ Sample rate card PDF created: sample-ratecard.pdf');
console.log('   15 lanes, LAX-JFK to DEN-SYD');
console.log('   Currency: USD, Effective: 2026-07-01');
