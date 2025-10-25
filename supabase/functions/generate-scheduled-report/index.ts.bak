import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { report_id } = await req.json();

    if (!report_id) {
      throw new Error('report_id is required');
    }

    // Get report configuration
    const { data: report, error: reportError } = await supabaseClient
      .from('scheduled_reports')
      .select('*')
      .eq('id', report_id)
      .single();

    if (reportError || !report) {
      throw new Error('Report not found');
    }

    // Create execution record
    const { data: execution, error: execError } = await supabaseClient
      .from('report_executions')
      .insert({
        scheduled_report_id: report_id,
        execution_status: 'pending',
      })
      .select()
      .single();

    if (execError) throw execError;

    try {
      // Fetch data
      let data;
      let query;

      if (report.database_id) {
        query = supabaseClient
          .from('table_data')
          .select('data')
          .eq('database_id', report.database_id);
      } else if (report.composite_view_id) {
        // Fetch from composite view
        query = supabaseClient
          .from('composite_view_data')
          .select('*')
          .eq('view_id', report.composite_view_id);
      }

      // Apply filters if specified
      if (report.filters && query) {
        // Apply JSON filters (simplified)
        const filters = report.filters as Record<string, any>;
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            query = query.eq(key, value);
          }
        });
      }

      const { data: fetchedData, error: dataError } = await query;
      if (dataError) throw dataError;

      data = fetchedData;

      // Generate report file (simplified - in production use proper PDF/Excel library)
      let reportContent = '';
      let fileExtension = report.report_format;

      if (report.report_format === 'csv') {
        // Generate CSV
        if (data && data.length > 0) {
          const headers = Object.keys(data[0]).join(',');
          const rows = data.map((row: any) =>
            Object.values(row).map(v => `"${v}"`).join(',')
          ).join('\n');
          reportContent = `${headers}\n${rows}`;
        }
      } else if (report.report_format === 'pdf') {
        // Placeholder for PDF generation
        reportContent = `Report: ${report.name}\nGenerated: ${new Date().toISOString()}\nRows: ${data?.length || 0}`;
        fileExtension = 'txt'; // Use txt for demo
      } else {
        // XLSX placeholder
        reportContent = JSON.stringify(data, null, 2);
        fileExtension = 'json'; // Use json for demo
      }

      // Upload to storage
      const fileName = `reports/${report.user_id}/${report_id}/${execution.id}.${fileExtension}`;
      const { data: uploadData, error: uploadError } = await supabaseClient
        .storage
        .from('reports')
        .upload(fileName, reportContent, {
          contentType: report.report_format === 'csv' ? 'text/csv' : 'text/plain',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabaseClient
        .storage
        .from('reports')
        .getPublicUrl(fileName);

      // Send via email/telegram
      if (report.delivery_method === 'email' || report.delivery_method === 'both') {
        // Send email (would integrate with email service)
        console.log('Would send email to:', report.email_recipients);
      }

      if (report.delivery_method === 'telegram' || report.delivery_method === 'both') {
        // Send via Telegram
        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
        if (botToken && report.telegram_chat_id) {
          const message = `📊 Scheduled Report: ${report.name}\n\nGenerated: ${new Date().toLocaleString()}\nRows: ${data?.length || 0}\n\nDownload: ${publicUrl}`;

          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: report.telegram_chat_id,
              text: message,
              parse_mode: 'Markdown',
            }),
          });
        }
      }

      // Update execution as successful
      await supabaseClient
        .from('report_executions')
        .update({
          execution_status: 'success',
          completed_at: new Date().toISOString(),
          file_url: publicUrl,
          file_size_bytes: reportContent.length,
          rows_included: data?.length || 0,
        })
        .eq('id', execution.id);

      // Update report last_run and run_count
      await supabaseClient
        .from('scheduled_reports')
        .update({
          last_run_at: new Date().toISOString(),
          run_count: report.run_count + 1,
        })
        .eq('id', report_id);

      return new Response(
        JSON.stringify({
          success: true,
          execution_id: execution.id,
          file_url: publicUrl,
          rows: data?.length || 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      // Mark execution as failed
      await supabaseClient
        .from('report_executions')
        .update({
          execution_status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', execution.id);

      throw error;
    }

  } catch (error) {
    console.error('Report generation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
