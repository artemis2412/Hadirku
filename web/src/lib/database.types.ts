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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          created_at: string
          id: string
          marked_at: string
          marked_by: string
          note: string | null
          organization_id: string
          person_id: string
          session_id: string
          status_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          marked_at?: string
          marked_by: string
          note?: string | null
          organization_id: string
          person_id: string
          session_id: string
          status_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          marked_at?: string
          marked_by?: string
          note?: string | null
          organization_id?: string
          person_id?: string
          session_id?: string
          status_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_person_id_organization_id_fkey"
            columns: ["person_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "attendance_records_session_id_organization_id_fkey"
            columns: ["session_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "attendance_records_status_id_organization_id_fkey"
            columns: ["status_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "attendance_statuses"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          attendance_date: string
          created_at: string
          created_by: string
          ends_at: string | null
          id: string
          notes: string | null
          organization_id: string
          session_status: string
          starts_at: string | null
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          attendance_date?: string
          created_at?: string
          created_by: string
          ends_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          session_status?: string
          starts_at?: string | null
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          created_at?: string
          created_by?: string
          ends_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          session_status?: string
          starts_at?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_unit_id_organization_id_fkey"
            columns: ["unit_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_units"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      attendance_statuses: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_excused: boolean
          is_present: boolean
          label: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_excused?: boolean
          is_present?: boolean
          label: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_excused?: boolean
          is_present?: boolean
          label?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_statuses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          joined_at: string | null
          membership_status: string
          organization_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string | null
          membership_status?: string
          organization_id: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string | null
          membership_status?: string
          organization_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_units: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          parent_unit_id: string | null
          unit_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          parent_unit_id?: string | null
          unit_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          parent_unit_id?: string | null
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_units_parent_unit_id_organization_id_fkey"
            columns: ["parent_unit_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_units"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          organization_type: string
          phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_type?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_type?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          external_code: string | null
          full_name: string
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          is_active: boolean
          joined_on: string | null
          notes: string | null
          organization_id: string
          person_type: string
          phone: string | null
          unit_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          external_code?: string | null
          full_name: string
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          is_active?: boolean
          joined_on?: string | null
          notes?: string | null
          organization_id: string
          person_type?: string
          phone?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          external_code?: string | null
          full_name?: string
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          is_active?: boolean
          joined_on?: string | null
          notes?: string | null
          organization_id?: string
          person_type?: string
          phone?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_unit_id_organization_id_fkey"
            columns: ["unit_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_units"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_consents: {
        Row: {
          consent_method: string
          consent_status: string
          consent_text: string | null
          consented_at: string | null
          created_at: string
          created_by: string | null
          evidence_reference: string | null
          id: string
          organization_id: string
          person_id: string
          phone_number: string
          recipient_type: string
          revoked_at: string | null
          updated_at: string
        }
        Insert: {
          consent_method?: string
          consent_status?: string
          consent_text?: string | null
          consented_at?: string | null
          created_at?: string
          created_by?: string | null
          evidence_reference?: string | null
          id?: string
          organization_id: string
          person_id: string
          phone_number: string
          recipient_type?: string
          revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          consent_method?: string
          consent_status?: string
          consent_text?: string | null
          consented_at?: string | null
          created_at?: string
          created_by?: string | null
          evidence_reference?: string | null
          id?: string
          organization_id?: string
          person_id?: string
          phone_number?: string
          recipient_type?: string
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_consents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_consents_person_id_organization_id_fkey"
            columns: ["person_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      whatsapp_message_events: {
        Row: {
          event_key: string
          event_type: string
          id: string
          message_id: string
          organization_id: string
          provider_message_id: string | null
          provider_status: string | null
          provider_timestamp: string | null
          received_at: string
          sanitized_payload: Json
        }
        Insert: {
          event_key: string
          event_type: string
          id?: string
          message_id: string
          organization_id: string
          provider_message_id?: string | null
          provider_status?: string | null
          provider_timestamp?: string | null
          received_at?: string
          sanitized_payload?: Json
        }
        Update: {
          event_key?: string
          event_type?: string
          id?: string
          message_id?: string
          organization_id?: string
          provider_message_id?: string | null
          provider_status?: string | null
          provider_timestamp?: string | null
          received_at?: string
          sanitized_payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_events_message_id_organization_id_fkey"
            columns: ["message_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "whatsapp_message_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          attempts: number
          created_at: string
          created_by: string | null
          delivered_at: string | null
          delivery_status: string
          error_code: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          idempotency_key: string
          language_code: string
          organization_id: string
          person_id: string | null
          provider_message_id: string | null
          read_at: string | null
          recipient_phone: string
          recipient_type: string
          scheduled_at: string
          sent_at: string | null
          template_id: string
          template_name_snapshot: string
          template_variables: Json
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          delivery_status?: string
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key: string
          language_code?: string
          organization_id: string
          person_id?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          recipient_phone: string
          recipient_type: string
          scheduled_at?: string
          sent_at?: string | null
          template_id: string
          template_name_snapshot: string
          template_variables?: Json
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          delivery_status?: string
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key?: string
          language_code?: string
          organization_id?: string
          person_id?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          recipient_phone?: string
          recipient_type?: string
          scheduled_at?: string
          sent_at?: string | null
          template_id?: string
          template_name_snapshot?: string
          template_variables?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_person_id_organization_id_fkey"
            columns: ["person_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "whatsapp_messages_template_id_organization_id_fkey"
            columns: ["template_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      whatsapp_settings: {
        Row: {
          business_account_id: string | null
          created_at: string
          created_by: string | null
          default_language: string
          display_phone_number: string | null
          id: string
          is_enabled: boolean
          organization_id: string
          phone_number_id: string | null
          sending_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_account_id?: string | null
          created_at?: string
          created_by?: string | null
          default_language?: string
          display_phone_number?: string | null
          id?: string
          is_enabled?: boolean
          organization_id: string
          phone_number_id?: string | null
          sending_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_account_id?: string | null
          created_at?: string
          created_by?: string | null
          default_language?: string
          display_phone_number?: string | null
          id?: string
          is_enabled?: boolean
          organization_id?: string
          phone_number_id?: string | null
          sending_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          approval_status: string
          body_preview: string
          category: string
          created_at: string
          created_by: string | null
          display_name: string
          id: string
          is_active: boolean
          language_code: string
          organization_id: string
          provider_template_name: string | null
          rejection_reason: string | null
          template_key: string
          updated_at: string
          variables: Json
        }
        Insert: {
          approval_status?: string
          body_preview: string
          category?: string
          created_at?: string
          created_by?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          language_code?: string
          organization_id: string
          provider_template_name?: string | null
          rejection_reason?: string | null
          template_key: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          approval_status?: string
          body_preview?: string
          category?: string
          created_at?: string
          created_by?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          language_code?: string
          organization_id?: string
          provider_template_name?: string | null
          rejection_reason?: string | null
          template_key?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization: {
        Args: {
          p_name: string
          p_organization_type?: string
          p_timezone?: string
        }
        Returns: string
      }
      whatsapp_claim_batch: { Args: { p_limit?: number }; Returns: Json }
      whatsapp_set_access_token: {
        Args: { p_access_token: string; p_organization_id: string }
        Returns: undefined
      }
      whatsapp_set_sending_enabled: {
        Args: { p_enabled: boolean; p_organization_id: string }
        Returns: undefined
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
