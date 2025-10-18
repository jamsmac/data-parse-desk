export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_agents: {
        Row: {
          agent_type: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          model: string | null
          name: string
          system_prompt: string
        }
        Insert: {
          agent_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          model?: string | null
          name: string
          system_prompt: string
        }
        Update: {
          agent_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          model?: string | null
          name?: string
          system_prompt?: string
        }
        Relationships: []
      }
      ai_requests: {
        Row: {
          agent_type: string
          completed_at: string | null
          created_at: string | null
          credits_used: number | null
          error_message: string | null
          id: string
          input_data: Json
          output_data: Json | null
          status: string | null
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          agent_type: string
          completed_at?: string | null
          created_at?: string | null
          credits_used?: number | null
          error_message?: string | null
          id?: string
          input_data: Json
          output_data?: Json | null
          status?: string | null
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          agent_type?: string
          completed_at?: string | null
          created_at?: string | null
          credits_used?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json
          output_data?: Json | null
          status?: string | null
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      cell_history: {
        Row: {
          cell_metadata_id: string
          change_type: string
          changed_at: string | null
          changed_by: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          source_file_id: string | null
        }
        Insert: {
          cell_metadata_id: string
          change_type: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          source_file_id?: string | null
        }
        Update: {
          cell_metadata_id?: string
          change_type?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          source_file_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cell_history_cell_metadata_id_fkey"
            columns: ["cell_metadata_id"]
            isOneToOne: false
            referencedRelation: "cell_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cell_history_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "database_files"
            referencedColumns: ["id"]
          },
        ]
      }
      cell_metadata: {
        Row: {
          column_name: string
          database_id: string
          id: string
          imported_at: string | null
          imported_by: string | null
          row_id: string
          source_file_id: string | null
          source_row_number: number | null
          version: number | null
        }
        Insert: {
          column_name: string
          database_id: string
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          row_id: string
          source_file_id?: string | null
          source_row_number?: number | null
          version?: number | null
        }
        Update: {
          column_name?: string
          database_id?: string
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          row_id?: string
          source_file_id?: string | null
          source_row_number?: number | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cell_metadata_database_id_fkey"
            columns: ["database_id"]
            isOneToOne: false
            referencedRelation: "databases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cell_metadata_row_id_fkey"
            columns: ["row_id"]
            isOneToOne: false
            referencedRelation: "table_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cell_metadata_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "database_files"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          description: string | null
          id: string
          operation_type: string | null
          stripe_payment_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          description?: string | null
          id?: string
          operation_type?: string | null
          stripe_payment_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          description?: string | null
          id?: string
          operation_type?: string | null
          stripe_payment_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      database_files: {
        Row: {
          database_id: string
          duplicate_strategy: string | null
          duplicates_found: number | null
          file_hash: string | null
          file_size: number | null
          file_type: string | null
          filename: string
          id: string
          import_mode: string
          metadata: Json | null
          rows_imported: number | null
          rows_skipped: number | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          database_id: string
          duplicate_strategy?: string | null
          duplicates_found?: number | null
          file_hash?: string | null
          file_size?: number | null
          file_type?: string | null
          filename: string
          id?: string
          import_mode?: string
          metadata?: Json | null
          rows_imported?: number | null
          rows_skipped?: number | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          database_id?: string
          duplicate_strategy?: string | null
          duplicates_found?: number | null
          file_hash?: string | null
          file_size?: number | null
          file_type?: string | null
          filename?: string
          id?: string
          import_mode?: string
          metadata?: Json | null
          rows_imported?: number | null
          rows_skipped?: number | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "database_files_database_id_fkey"
            columns: ["database_id"]
            isOneToOne: false
            referencedRelation: "databases"
            referencedColumns: ["id"]
          },
        ]
      }
      database_metadata: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          user_id: string
          value: string | null
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          user_id: string
          value?: string | null
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          user_id?: string
          value?: string | null
        }
        Relationships: []
      }
      database_relations: {
        Row: {
          cascade_delete: boolean | null
          created_at: string | null
          id: string
          junction_table_id: string | null
          relation_type: string
          source_column: string
          source_database_id: string
          target_column: string
          target_database_id: string
        }
        Insert: {
          cascade_delete?: boolean | null
          created_at?: string | null
          id?: string
          junction_table_id?: string | null
          relation_type: string
          source_column: string
          source_database_id: string
          target_column: string
          target_database_id: string
        }
        Update: {
          cascade_delete?: boolean | null
          created_at?: string | null
          id?: string
          junction_table_id?: string | null
          relation_type?: string
          source_column?: string
          source_database_id?: string
          target_column?: string
          target_database_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "database_relations_junction_table_id_fkey"
            columns: ["junction_table_id"]
            isOneToOne: false
            referencedRelation: "databases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "database_relations_source_database_id_fkey"
            columns: ["source_database_id"]
            isOneToOne: false
            referencedRelation: "databases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "database_relations_target_database_id_fkey"
            columns: ["target_database_id"]
            isOneToOne: false
            referencedRelation: "databases"
            referencedColumns: ["id"]
          },
        ]
      }
      databases: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          project_id: string
          table_count: number
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          project_id: string
          table_count?: number
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          project_id?: string
          table_count?: number
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "databases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          brew_status: string | null
          brewing_time: string | null
          created_at: string
          creation_time: string | null
          cup_type: number | null
          delivery_time: string | null
          flavour_name: string | null
          goods_name: string | null
          id: string
          machine_code: string | null
          operator_code: string | null
          order_number: string
          order_price: number | null
          order_resource: string | null
          order_status: string | null
          order_type: string | null
          pay_card: string | null
          paying_time: string | null
          reason: string | null
          refund_time: string | null
          remark: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          brew_status?: string | null
          brewing_time?: string | null
          created_at?: string
          creation_time?: string | null
          cup_type?: number | null
          delivery_time?: string | null
          flavour_name?: string | null
          goods_name?: string | null
          id?: string
          machine_code?: string | null
          operator_code?: string | null
          order_number: string
          order_price?: number | null
          order_resource?: string | null
          order_status?: string | null
          order_type?: string | null
          pay_card?: string | null
          paying_time?: string | null
          reason?: string | null
          refund_time?: string | null
          remark?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          brew_status?: string | null
          brewing_time?: string | null
          created_at?: string
          creation_time?: string | null
          cup_type?: number | null
          delivery_time?: string | null
          flavour_name?: string | null
          goods_name?: string | null
          id?: string
          machine_code?: string | null
          operator_code?: string | null
          order_number?: string
          order_price?: number | null
          order_resource?: string | null
          order_status?: string | null
          order_type?: string | null
          pay_card?: string | null
          paying_time?: string | null
          reason?: string | null
          refund_time?: string | null
          remark?: string | null
          user_id?: string
        }
        Relationships: []
      }
      password_history: {
        Row: {
          created_at: string | null
          id: string
          password_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          password_hash: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          password_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          id: string
          invited_at: string | null
          invited_by: string | null
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          project_id: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_archived: boolean | null
          name: string
          settings: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          name: string
          settings?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          name?: string
          settings?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_charts: {
        Row: {
          chart_config: Json
          created_at: string | null
          id: string
          name: string
          position: number | null
          project_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chart_config: Json
          created_at?: string | null
          id?: string
          name: string
          position?: number | null
          project_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chart_config?: Json
          created_at?: string | null
          id?: string
          name?: string
          position?: number | null
          project_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      storage_providers: {
        Row: {
          config: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          name: string
          provider_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          config: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name: string
          provider_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name?: string
          provider_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      table_data: {
        Row: {
          created_at: string | null
          data: Json
          database_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json
          database_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          database_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "table_data_database_id_fkey"
            columns: ["database_id"]
            isOneToOne: false
            referencedRelation: "databases"
            referencedColumns: ["id"]
          },
        ]
      }
      table_schemas: {
        Row: {
          column_name: string
          column_type: string
          created_at: string | null
          database_id: string
          default_value: Json | null
          formula_config: Json | null
          id: string
          is_required: boolean | null
          lookup_config: Json | null
          position: number
          relation_config: Json | null
          rollup_config: Json | null
          updated_at: string | null
        }
        Insert: {
          column_name: string
          column_type: string
          created_at?: string | null
          database_id: string
          default_value?: Json | null
          formula_config?: Json | null
          id?: string
          is_required?: boolean | null
          lookup_config?: Json | null
          position?: number
          relation_config?: Json | null
          rollup_config?: Json | null
          updated_at?: string | null
        }
        Update: {
          column_name?: string
          column_type?: string
          created_at?: string | null
          database_id?: string
          default_value?: Json | null
          formula_config?: Json | null
          id?: string
          is_required?: boolean | null
          lookup_config?: Json | null
          position?: number
          relation_config?: Json | null
          rollup_config?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "table_schemas_database_id_fkey"
            columns: ["database_id"]
            isOneToOne: false
            referencedRelation: "databases"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_accounts: {
        Row: {
          first_name: string | null
          id: string
          is_active: boolean | null
          last_interaction_at: string | null
          last_name: string | null
          linked_at: string | null
          telegram_id: number
          telegram_username: string | null
          user_id: string
        }
        Insert: {
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_interaction_at?: string | null
          last_name?: string | null
          linked_at?: string | null
          telegram_id: number
          telegram_username?: string | null
          user_id: string
        }
        Update: {
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_interaction_at?: string | null
          last_name?: string | null
          linked_at?: string | null
          telegram_id?: number
          telegram_username?: string | null
          user_id?: string
        }
        Relationships: []
      }
      upload_log: {
        Row: {
          duplicate_records: number | null
          error_message: string | null
          error_records: number | null
          file_size_bytes: number | null
          filename: string
          id: string
          new_records: number | null
          notes: string | null
          processing_time_seconds: number | null
          status: string | null
          total_rows: number | null
          upload_date: string
          user_id: string
        }
        Insert: {
          duplicate_records?: number | null
          error_message?: string | null
          error_records?: number | null
          file_size_bytes?: number | null
          filename: string
          id?: string
          new_records?: number | null
          notes?: string | null
          processing_time_seconds?: number | null
          status?: string | null
          total_rows?: number | null
          upload_date?: string
          user_id: string
        }
        Update: {
          duplicate_records?: number | null
          error_message?: string | null
          error_records?: number | null
          file_size_bytes?: number | null
          filename?: string
          id?: string
          new_records?: number | null
          notes?: string | null
          processing_time_seconds?: number | null
          status?: string | null
          total_rows?: number | null
          upload_date?: string
          user_id?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          created_at: string | null
          free_credits: number | null
          id: string
          paid_credits: number | null
          total_credits_used: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          free_credits?: number | null
          id?: string
          paid_credits?: number | null
          total_credits_used?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          free_credits?: number | null
          id?: string
          paid_credits?: number | null
          total_credits_used?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bulk_delete_table_rows: {
        Args: { p_ids: string[] }
        Returns: boolean
      }
      bulk_insert_table_rows: {
        Args: { p_database_id: string; p_rows: Json[] }
        Returns: {
          created_at: string | null
          data: Json
          database_id: string
          id: string
          updated_at: string | null
        }[]
      }
      clear_database_data: {
        Args: { p_database_id: string }
        Returns: boolean
      }
      create_database: {
        Args: {
          color?: string
          description?: string
          icon?: string
          name: string
          user_id: string
        }
        Returns: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          project_id: string
          table_count: number
          tags: string[] | null
          updated_at: string
          user_id: string
        }
      }
      create_database_relation: {
        Args: {
          p_cascade_delete?: boolean
          p_junction_table_id?: string
          p_relation_type: string
          p_source_column: string
          p_source_database_id: string
          p_target_column: string
          p_target_database_id: string
        }
        Returns: {
          cascade_delete: boolean | null
          created_at: string | null
          id: string
          junction_table_id: string | null
          relation_type: string
          source_column: string
          source_database_id: string
          target_column: string
          target_database_id: string
        }
      }
      create_project: {
        Args: {
          p_color?: string
          p_description?: string
          p_icon?: string
          p_name: string
          p_user_id: string
        }
        Returns: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_archived: boolean | null
          name: string
          settings: Json | null
          updated_at: string | null
          user_id: string
        }
      }
      create_table_schema: {
        Args: {
          p_column_name: string
          p_column_type: string
          p_database_id: string
          p_default_value?: Json
          p_formula_config?: Json
          p_is_required?: boolean
          p_lookup_config?: Json
          p_position?: number
          p_relation_config?: Json
          p_rollup_config?: Json
        }
        Returns: {
          column_name: string
          column_type: string
          created_at: string | null
          database_id: string
          default_value: Json | null
          formula_config: Json | null
          id: string
          is_required: boolean | null
          lookup_config: Json | null
          position: number
          relation_config: Json | null
          rollup_config: Json | null
          updated_at: string | null
        }
      }
      delete_database: {
        Args: { p_id: string }
        Returns: boolean
      }
      delete_database_relation: {
        Args: { p_id: string }
        Returns: boolean
      }
      delete_project: {
        Args: { p_id: string }
        Returns: boolean
      }
      delete_table_row: {
        Args: { p_id: string }
        Returns: boolean
      }
      delete_table_schema: {
        Args: { p_id: string }
        Returns: boolean
      }
      get_database: {
        Args: { p_id: string }
        Returns: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          project_id: string
          table_count: number
          tags: string[] | null
          updated_at: string
          user_id: string
        }
      }
      get_database_relations: {
        Args: { p_database_id: string }
        Returns: {
          cascade_delete: boolean | null
          created_at: string | null
          id: string
          junction_table_id: string | null
          relation_type: string
          source_column: string
          source_database_id: string
          target_column: string
          target_database_id: string
        }[]
      }
      get_database_stats: {
        Args: { p_database_id: string }
        Returns: {
          column_count: number
          last_updated: string
          row_count: number
        }[]
      }
      get_project_databases: {
        Args: { p_project_id: string }
        Returns: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          project_id: string
          table_count: number
          tags: string[] | null
          updated_at: string
          user_id: string
        }[]
      }
      get_table_data: {
        Args:
          | {
              p_database_id: string
              p_filters?: Json
              p_limit?: number
              p_offset?: number
              p_sort_column?: string
              p_sort_direction?: string
            }
          | {
              p_database_id: string
              p_limit?: number
              p_offset?: number
              p_sort_column?: string
              p_sort_direction?: string
            }
        Returns: {
          created_at: string
          data: Json
          id: string
          total_count: number
          updated_at: string
        }[]
      }
      get_table_schemas: {
        Args: { p_database_id: string }
        Returns: {
          column_name: string
          column_type: string
          created_at: string | null
          database_id: string
          default_value: Json | null
          formula_config: Json | null
          id: string
          is_required: boolean | null
          lookup_config: Json | null
          position: number
          relation_config: Json | null
          rollup_config: Json | null
          updated_at: string | null
        }[]
      }
      get_user_databases: {
        Args: { p_user_id: string }
        Returns: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          project_id: string
          table_count: number
          tags: string[] | null
          updated_at: string
          user_id: string
        }[]
      }
      get_user_projects: {
        Args: { p_user_id: string }
        Returns: {
          color: string
          created_at: string
          database_count: number
          description: string
          icon: string
          id: string
          is_archived: boolean
          name: string
          settings: Json
          updated_at: string
          user_id: string
        }[]
      }
      insert_table_row: {
        Args: { p_data: Json; p_database_id: string }
        Returns: {
          created_at: string | null
          data: Json
          database_id: string
          id: string
          updated_at: string | null
        }
      }
      reorder_columns: {
        Args: { p_column_order: string[]; p_database_id: string }
        Returns: boolean
      }
      update_database: {
        Args: {
          p_color?: string
          p_description?: string
          p_icon?: string
          p_id: string
          p_name?: string
          p_tags?: string[]
        }
        Returns: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          project_id: string
          table_count: number
          tags: string[] | null
          updated_at: string
          user_id: string
        }
      }
      update_project: {
        Args: {
          p_color?: string
          p_description?: string
          p_icon?: string
          p_id: string
          p_is_archived?: boolean
          p_name?: string
        }
        Returns: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_archived: boolean | null
          name: string
          settings: Json | null
          updated_at: string | null
          user_id: string
        }
      }
      update_table_row: {
        Args: { p_data: Json; p_id: string }
        Returns: {
          created_at: string | null
          data: Json
          database_id: string
          id: string
          updated_at: string | null
        }
      }
      update_table_schema: {
        Args: {
          p_column_name?: string
          p_column_type?: string
          p_default_value?: Json
          p_formula_config?: Json
          p_id: string
          p_is_required?: boolean
          p_lookup_config?: Json
          p_relation_config?: Json
          p_rollup_config?: Json
        }
        Returns: {
          column_name: string
          column_type: string
          created_at: string | null
          database_id: string
          default_value: Json | null
          formula_config: Json | null
          id: string
          is_required: boolean | null
          lookup_config: Json | null
          position: number
          relation_config: Json | null
          rollup_config: Json | null
          updated_at: string | null
        }
      }
      validate_password_strength: {
        Args: { password: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
