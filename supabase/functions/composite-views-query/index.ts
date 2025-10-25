/**
 * Composite Views Query Edge Function
 *
 * Securely executes composite view queries with filtering, sorting, and pagination.
 * All inputs are validated to prevent SQL injection attacks.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPrelight, createErrorResponse, createSuccessResponse } from '../_shared/security.ts';
import { createAuthenticatedClient, verifyAuthentication } from '../_shared/supabaseClient.ts';
import {
  validateUUID,
  validatePagination,
  validateFilter,
  validateSort,
  validateOptional,
  validateArray,
  type ValidatedFilter,
  type ValidatedSort,
} from '../_shared/validation.ts';
import { buildSafeQuery, buildCountQuery, validateFilterColumns, extractColumnsFromQuery } from '../_shared/sqlBuilder.ts';

interface CompositeViewQueryRequest {
  composite_view_id: string;
  filters?: ValidatedFilter[];
  sort?: ValidatedSort;
  page?: number;
  page_size?: number;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  try {
    // Create authenticated client
    const authHeader = req.headers.get('Authorization');
    const supabase = createAuthenticatedClient(authHeader);

    // Verify authentication
    const user = await verifyAuthentication(supabase);

    // Parse and validate request body
    const rawBody = await req.json();

    const composite_view_id = validateUUID(rawBody.composite_view_id, 'composite_view_id');

    const filters = validateOptional(rawBody.filters, (val) =>
      validateArray(val, 'filters', (filter) => validateFilter(filter))
    );

    const sort = validateOptional(rawBody.sort, (val) => validateSort(val));

    const { page, page_size, offset } = validatePagination({
      page: rawBody.page,
      page_size: rawBody.page_size,
    });

    // Load composite view
    const { data: view, error: viewError } = await supabase
      .from('composite_views')
      .select('*, projects!inner(id, user_id)')
      .eq('id', composite_view_id)
      .single();

    if (viewError || !view) {
      return createErrorResponse(req, 'Composite view not found', 404);
    }

    // Check permissions
    const isOwner = (view.projects as any).user_id === user.id;

    if (!isOwner) {
      const { data: member } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', view.project_id)
        .eq('user_id', user.id)
        .single();

      if (!member) {
        return createErrorResponse(req, 'Access denied', 403);
      }
    }

    // Extract base query from view
    const baseQuery = view.sql_query;
    if (!baseQuery || typeof baseQuery !== 'string') {
      return createErrorResponse(req, 'Invalid composite view configuration', 400);
    }

    // Extract columns from base query for validation
    const allowedColumns = extractColumnsFromQuery(baseQuery);

    // Validate that filter columns exist in the query
    if (filters && filters.length > 0) {
      try {
        validateFilterColumns(filters, allowedColumns);
      } catch (error) {
        return createErrorResponse(
          req,
          error instanceof Error ? error.message : 'Invalid filter columns',
          400
        );
      }
    }

    // Build safe query with filters, sorting, and pagination
    let queryResult;
    try {
      queryResult = buildSafeQuery({
        baseQuery,
        filters: filters || [],
        sort,
        limit: page_size,
        offset,
      });
    } catch (error) {
      return createErrorResponse(
        req,
        `Query building failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        400
      );
    }

    // Execute main query
    // Note: In a production system, you would use a stored procedure that accepts
    // parameterized queries. For now, we ensure the query is safely built.
    const { data: rows, error: queryError } = await supabase.rpc('execute_readonly_sql', {
      sql: queryResult.query,
    });

    if (queryError) {
      console.error('[Composite Views Query] Query execution error:', queryError);
      return createErrorResponse(req, `Query execution failed: ${queryError.message}`, 500);
    }

    // Load custom data for each row
    const customColumns = (view.config as any)?.custom_columns || [];
    let finalRows = rows || [];

    if (customColumns.length > 0 && finalRows.length > 0) {
      try {
        const rowIdentifiers = finalRows.map((r: any) => {
          const rowNum = r.row_num;
          return rowNum !== undefined && rowNum !== null ? rowNum.toString() : null;
        }).filter((id: string | null) => id !== null);

        if (rowIdentifiers.length > 0) {
          const { data: customData } = await supabase
            .from('composite_view_custom_data')
            .select('*')
            .eq('composite_view_id', composite_view_id)
            .in('row_identifier', rowIdentifiers);

          // Merge custom data into rows
          if (customData && customData.length > 0) {
            finalRows = finalRows.map((row: any) => {
              const rowId = row.row_num?.toString();
              if (!rowId) return row;

              const rowCustomData = customData.filter(
                (cd: any) => cd.row_identifier === rowId
              );

              const enrichedRow = { ...row };
              rowCustomData.forEach((cd: any) => {
                enrichedRow[cd.column_name] = cd.data;
              });

              return enrichedRow;
            });
          }
        }
      } catch (error) {
        console.error('[Composite Views Query] Custom data loading error:', error);
        // Don't fail the request, just log the error
      }
    }

    // Get total count
    let total_count = 0;
    try {
      const countSql = buildCountQuery(baseQuery);
      const { data: countResult, error: countError } = await supabase.rpc('execute_readonly_sql', {
        sql: countSql,
      });

      if (!countError && countResult && countResult.length > 0) {
        total_count = parseInt(countResult[0].total) || 0;
      } else {
        // Fallback to row count
        total_count = finalRows.length;
      }
    } catch (error) {
      console.error('[Composite Views Query] Count query error:', error);
      // Fallback to row count
      total_count = finalRows.length;
    }

    return createSuccessResponse(req, {
      rows: finalRows,
      total_count,
      page,
      page_size,
      total_pages: Math.ceil(total_count / page_size),
    });

  } catch (error) {
    console.error('[Composite Views Query] Error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Authentication') || message.includes('Unauthorized') ? 401
      : message.includes('Access denied') ? 403
      : message.includes('not found') ? 404
      : 500;

    return createErrorResponse(req, message, status);
  }
});
