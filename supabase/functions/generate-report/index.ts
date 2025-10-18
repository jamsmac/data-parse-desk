import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { templateId, format, data } = await req.json();

    console.log('Generating report:', { templateId, format, userId: user.id });

    // Generate report based on format
    let reportContent: string | Uint8Array;
    let contentType: string;
    let filename: string;

    if (format === 'pdf') {
      // Generate PDF using jsPDF-like structure
      contentType = 'application/pdf';
      filename = `report-${Date.now()}.pdf`;
      reportContent = generatePDFContent(data);
    } else if (format === 'excel') {
      // Generate Excel
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `report-${Date.now()}.xlsx`;
      reportContent = generateExcelContent(data);
    } else if (format === 'csv') {
      // Generate CSV
      contentType = 'text/csv';
      filename = `report-${Date.now()}.csv`;
      reportContent = generateCSVContent(data);
    } else {
      // HTML
      contentType = 'text/html';
      filename = `report-${Date.now()}.html`;
      reportContent = generateHTMLContent(data);
    }

    return new Response(reportContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generatePDFContent(data: any): string {
  // Simple PDF-like content (in production, use jsPDF)
  return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Report Generated) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000283 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
377
%%EOF`;
}

function generateExcelContent(data: any): string {
  // Simple CSV format (in production, use ExcelJS)
  return generateCSVContent(data);
}

function generateCSVContent(data: any): string {
  const rows = data?.rows || [];
  const headers = Object.keys(rows[0] || {});
  
  let csv = headers.join(',') + '\n';
  rows.forEach((row: any) => {
    csv += headers.map(h => JSON.stringify(row[h] || '')).join(',') + '\n';
  });
  
  return csv;
}

function generateHTMLContent(data: any): string {
  const rows = data?.rows || [];
  const headers = Object.keys(rows[0] || {});
  
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>Report - ${new Date().toLocaleString()}</h1>
  <table>
    <thead>
      <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
    </thead>
    <tbody>`;
  
  rows.forEach((row: any) => {
    html += `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`;
  });
  
  html += `</tbody>
  </table>
</body>
</html>`;
  
  return html;
}
