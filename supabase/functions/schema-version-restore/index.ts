import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { getCorsHeaders, handleCorsPrelight } from '../_shared/security.ts';


interface RestoreVersionRequest {
  versionId: string;
  createNewVersion?: boolean; // If true, creates a new version instead of just setting as current
}

Deno.serve(async (req) => {
  // Get secure CORS headers based on origin
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const { versionId, createNewVersion = false }: RestoreVersionRequest =
      await req.json();

    if (!versionId) {
      throw new Error("versionId is required");
    }

    console.log("[schema-version-restore] Restoring version:", versionId);

    // Get the version to restore
    const { data: versionToRestore, error: fetchError } =
      await supabaseClient
        .from("schema_versions")
        .select("*")
        .eq("id", versionId)
        .eq("created_by", user.id)
        .single();

    if (fetchError) {
      console.error("[schema-version-restore] Fetch error:", fetchError);
      throw fetchError;
    }

    if (!versionToRestore) {
      throw new Error("Version not found or access denied");
    }

    if (createNewVersion) {
      // Create a new version based on the old one
      console.log("[schema-version-restore] Creating new version from:", versionId);

      // Get current max version number
      const { data: maxVersionData, error: maxVersionError } =
        await supabaseClient
          .from("schema_versions")
          .select("version_number")
          .eq("project_id", versionToRestore.project_id)
          .eq("created_by", user.id)
          .order("version_number", { ascending: false })
          .limit(1)
          .single();

      if (maxVersionError) {
        console.error("[schema-version-restore] Max version error:", maxVersionError);
        throw maxVersionError;
      }

      const nextVersionNumber = (maxVersionData?.version_number ?? 0) + 1;

      // Unset current version flag
      const { error: unsetError } = await supabaseClient
        .from("schema_versions")
        .update({ is_current: false })
        .eq("project_id", versionToRestore.project_id)
        .eq("created_by", user.id)
        .eq("is_current", true);

      if (unsetError) {
        console.error("[schema-version-restore] Unset error:", unsetError);
        throw unsetError;
      }

      // Create new version
      const { data: newVersion, error: insertError } = await supabaseClient
        .from("schema_versions")
        .insert({
          project_id: versionToRestore.project_id,
          version_number: nextVersionNumber,
          schema_data: versionToRestore.schema_data,
          description: `Restored from version ${versionToRestore.version_number}`,
          is_current: true,
          checksum: versionToRestore.checksum,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) {
        console.error("[schema-version-restore] Insert error:", insertError);
        throw insertError;
      }

      console.log("[schema-version-restore] New version created:", newVersion.id);

      return new Response(
        JSON.stringify({
          success: true,
          version: newVersion,
          restored_from: versionToRestore.version_number,
          message: `Version ${versionToRestore.version_number} restored as version ${nextVersionNumber}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      // Simply set as current version
      console.log("[schema-version-restore] Setting as current:", versionId);

      const { data, error } = await supabaseClient.rpc(
        "set_current_schema_version",
        {
          p_version_id: versionId,
        }
      );

      if (error) {
        console.error("[schema-version-restore] Set current error:", error);
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          version: versionToRestore,
          message: `Version ${versionToRestore.version_number} set as current`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("[schema-version-restore] Error:", error);
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
