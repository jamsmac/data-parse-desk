import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UploadRequest {
  file: File;
  compositeViewId: string;
  rowIdentifier: string;
  columnName: string;
  itemIndex: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create Supabase client with auth
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const compositeViewId = formData.get("compositeViewId") as string;
    const rowIdentifier = formData.get("rowIdentifier") as string;
    const columnName = formData.get("columnName") as string;
    const itemIndex = parseInt(formData.get("itemIndex") as string);

    // Validate inputs
    if (!file || !compositeViewId || !rowIdentifier || !columnName || isNaN(itemIndex)) {
      throw new Error("Missing required fields");
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({
          error: "File too large. Maximum size is 10MB.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate file type (allow common types)
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "text/csv",
    ];

    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({
          error: `File type not allowed: ${file.type}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user has access to this composite view
    const { data: viewData, error: viewError } = await supabaseClient
      .from("composite_views")
      .select("id, user_id")
      .eq("id", compositeViewId)
      .eq("user_id", user.id)
      .single();

    if (viewError || !viewData) {
      throw new Error("Composite view not found or access denied");
    }

    console.log("[Attachment Upload] User:", user.id, "View:", compositeViewId, "File:", file.name);

    // Generate storage path
    const fileExt = file.name.split(".").pop() || "bin";
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${user.id}/${compositeViewId}/${timestamp}_${sanitizedFileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from("item-attachments")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[Attachment Upload] Storage error:", uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log("[Attachment Upload] Uploaded to storage:", storagePath);

    // TODO: Generate thumbnail for images (future enhancement)
    // This would use sharp or similar library
    const thumbnailPath = null;

    // Save metadata to database
    const { data: attachment, error: dbError } = await supabaseClient
      .from("item_attachments")
      .insert({
        composite_view_id: compositeViewId,
        row_identifier: rowIdentifier,
        column_name: columnName,
        item_index: itemIndex,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: storagePath,
        thumbnail_path: thumbnailPath,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error("[Attachment Upload] DB error:", dbError);

      // Cleanup storage if DB insert fails
      await supabaseClient.storage
        .from("item-attachments")
        .remove([storagePath]);

      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    console.log("[Attachment Upload] Success:", attachment.id);

    return new Response(
      JSON.stringify({
        success: true,
        attachment,
        message: "File uploaded successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Attachment Upload] Error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
