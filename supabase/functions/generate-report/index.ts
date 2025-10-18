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

    const { templateId, format, data, config } = await req.json();

    console.log('Generating report:', { templateId, format, userId: user.id });

    // Generate report based on format
    let reportContent: string | Uint8Array;
    let contentType: string;
    let filename: string;
    const reportName = data?.name || 'report';

    if (format === 'pdf') {
      contentType = 'application/pdf';
      filename = `${reportName}-${Date.now()}.pdf`;
      reportContent = generatePDFReport(data, config);
    } else if (format === 'excel' || format === 'xlsx') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `${reportName}-${Date.now()}.xlsx`;
      reportContent = generateExcelReport(data);
    } else if (format === 'csv') {
      contentType = 'text/csv';
      filename = `${reportName}-${Date.now()}.csv`;
      reportContent = generateCSVContent(data);
    } else {
      contentType = 'text/html';
      filename = `${reportName}-${Date.now()}.html`;
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

function generatePDFReport(data: any, config: any): string {
  const rows = data?.rows || [];
  const title = data?.name || 'Report';
  const date = new Date().toLocaleDateString('ru-RU');

  // Enhanced PDF with better structure
  return `%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>
endobj
4 0 obj
<< /Length 500 >>
stream
BT
/F1 18 Tf
50 800 Td
(${title}) Tj
/F2 10 Tf
50 780 Td
(Generated: ${date}) Tj
50 760 Td
(Records: ${rows.length}) Tj
50 730 Td
(Status: Ready) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000340 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
896
%%EOF`;
}

function generateExcelReport(data: any): string {
  // Generate real Excel-compatible CSV with UTF-8 BOM
  const csv = generateCSVContent(data);
  return '\uFEFF' + csv; // Add BOM for Excel UTF-8 support
}

function generateCSVContent(data: any): string {
  const rows = data?.rows || [];
  if (rows.length === 0) {
    return 'No data';
  }

  const headers = Object.keys(rows[0]);
  
  // Escape CSV values
  const escape = (value: any) => {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  let csv = headers.map(escape).join(',') + '\n';
  rows.forEach((row: any) => {
    csv += headers.map(h => escape(row[h])).join(',') + '\n';
  });
  
  return csv;
}

function generateHTMLContent(data: any): string {
  const rows = data?.rows || [];
  const title = data?.name || 'Report';
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  
  let html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      padding: 40px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-bottom: 8px;
      font-size: 28px;
    }
    .meta {
      color: #666;
      margin-bottom: 32px;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
    }
    th, td {
      border: 1px solid #e0e0e0;
      padding: 12px 16px;
      text-align: left;
    }
    th {
      background-color: #4CAF50;
      color: white;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    tr:hover {
      background-color: #f0f0f0;
    }
    td {
      font-size: 14px;
      color: #333;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
      color: #999;
      font-size: 12px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <div class="meta">
      Создан: ${new Date().toLocaleString('ru-RU')} | 
      Записей: ${rows.length}
    </div>
    <table>
      <thead>
        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
      </thead>
      <tbody>`;
  
  rows.forEach((row: any) => {
    html += `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`;
  });
  
  html += `</tbody>
    </table>
    <div class="footer">
      Generated by VHData Platform
    </div>
  </div>
</body>
</html>`;
  
  return html;
}
