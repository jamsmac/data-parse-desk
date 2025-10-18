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
      databases: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
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
          table_count?: number
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
          table_count: number
          tags: string[] | null
          updated_at: string
          user_id: string
        }
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
          table_count: number
          tags: string[] | null
          updated_at: string
          user_id: string
        }
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
          table_count: number
          tags: string[] | null
          updated_at: string
          user_id: string
        }[]
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
