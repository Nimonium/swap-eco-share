export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          city: string | null
          bio: string | null
          rating_avg: number | null
          swap_count: number | null
          email_notifications_enabled: boolean
          push_notifications_enabled: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          city?: string | null
          bio?: string | null
          rating_avg?: number | null
          swap_count?: number | null
          email_notifications_enabled?: boolean
          push_notifications_enabled?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          city?: string | null
          bio?: string | null
          rating_avg?: number | null
          swap_count?: number | null
          email_notifications_enabled?: boolean
          push_notifications_enabled?: boolean
          created_at?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          id: string
          owner_id: string
          title: string
          description: string
          category: string
          condition: string
          price_value: number | null
          exchange_preference: string | null
          wanted_items: string[] | null
          city: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          description: string
          category: string
          condition: string
          price_value?: number | null
          exchange_preference?: string | null
          wanted_items?: string[] | null
          city?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          description?: string
          category?: string
          condition?: string
          price_value?: number | null
          exchange_preference?: string | null
          wanted_items?: string[] | null
          city?: string | null
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      item_media: {
        Row: {
          id: string
          item_id: string
          storage_path: string
          media_type: string | null
          angle_index: number | null
          created_at: string
        }
        Insert: {
          id?: string
          item_id: string
          storage_path: string
          media_type?: string | null
          angle_index?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          storage_path?: string
          media_type?: string | null
          angle_index?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_media_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          }
        ]
      }
      swaps: {
        Row: {
          id: string
          item_id: string
          proposer_id: string
          owner_id: string
          offered_item_id: string | null
          message: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          item_id: string
          proposer_id: string
          owner_id: string
          offered_item_id?: string | null
          message?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          proposer_id?: string
          owner_id?: string
          offered_item_id?: string | null
          message?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "swaps_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swaps_offered_item_id_fkey"
            columns: ["offered_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swaps_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swaps_proposer_id_fkey"
            columns: ["proposer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      consent_records: {
        Row: {
          id: string
          item_id: string
          user_id: string
          signature_text: string
          terms_version: string
          user_agent: string | null
          ip_address: string | null
          signed_at: string
        }
        Insert: {
          id?: string
          item_id: string
          user_id: string
          signature_text: string
          terms_version?: string
          user_agent?: string | null
          ip_address?: string | null
          signed_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          user_id?: string
          signature_text?: string
          terms_version?: string
          user_agent?: string | null
          ip_address?: string | null
          signed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      reviews: {
        Row: {
          id: string
          swap_id: string
          reviewer_id: string
          reviewee_id: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          swap_id: string
          reviewer_id: string
          reviewee_id: string
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          swap_id?: string
          reviewer_id?: string
          reviewee_id?: string
          rating?: number
          comment?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_swap_id_fkey"
            columns: ["swap_id"]
            isOneToOne: false
            referencedRelation: "swaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          reported_user_id: string | null
          reported_item_id: string | null
          reason: string
          details: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          reported_user_id?: string | null
          reported_item_id?: string | null
          reason: string
          details?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          reported_user_id?: string | null
          reported_item_id?: string | null
          reason?: string
          details?: string | null
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_item_id_fkey"
            columns: ["reported_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          }
        ]
      }
      blocks: {
        Row: {
          id: string
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: {
          id?: string
          blocker_id: string
          blocked_id: string
          created_at?: string
        }
        Update: {
          id?: string
          blocker_id?: string
          blocked_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      swap_messages: {
        Row: {
          id: string
          swap_id: string
          sender_id: string
          content: string
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          swap_id: string
          sender_id: string
          content: string
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          swap_id?: string
          sender_id?: string
          content?: string
          created_at?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "swap_messages_swap_id_fkey"
            columns: ["swap_id"]
            isOneToOne: false
            referencedRelation: "swaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swap_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notification_logs: {
        Row: {
          id: string
          recipient_id: string
          actor_id: string | null
          swap_id: string | null
          notification_type: string
          created_at: string
        }
        Insert: {
          id?: string
          recipient_id: string
          actor_id?: string | null
          swap_id?: string | null
          notification_type: string
          created_at?: string
        }
        Update: {
          id?: string
          recipient_id?: string
          actor_id?: string | null
          swap_id?: string | null
          notification_type?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_swap_id_fkey"
            columns: ["swap_id"]
            isOneToOne: false
            referencedRelation: "swaps"
            referencedColumns: ["id"]
          }
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      disputes: {
        Row: {
          id: string
          swap_id: string
          filed_by: string
          against_user_id: string
          category: "item_not_as_described" | "item_damaged" | "no_show" | "non_delivery" | "other"
          description: string
          status: "open" | "under_review" | "resolved_favor_filer" | "resolved_favor_other" | "resolved_mutual" | "closed_no_action"
          resolution_notes: string | null
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          swap_id: string
          filed_by: string
          against_user_id: string
          category: "item_not_as_described" | "item_damaged" | "no_show" | "non_delivery" | "other"
          description: string
          status?: "open" | "under_review" | "resolved_favor_filer" | "resolved_favor_other" | "resolved_mutual" | "closed_no_action"
          resolution_notes?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          swap_id?: string
          filed_by?: string
          against_user_id?: string
          category?: "item_not_as_described" | "item_damaged" | "no_show" | "non_delivery" | "other"
          description?: string
          status?: "open" | "under_review" | "resolved_favor_filer" | "resolved_favor_other" | "resolved_mutual" | "closed_no_action"
          resolution_notes?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_swap_id_fkey"
            columns: ["swap_id"]
            isOneToOne: false
            referencedRelation: "swaps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_filed_by_fkey"
            columns: ["filed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_against_user_id_fkey"
            columns: ["against_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      dispute_evidence: {
        Row: {
          id: string
          dispute_id: string
          uploaded_by: string
          storage_path: string
          media_type: "image" | "video" | "document"
          created_at: string
        }
        Insert: {
          id?: string
          dispute_id: string
          uploaded_by: string
          storage_path: string
          media_type?: "image" | "video" | "document"
          created_at?: string
        }
        Update: {
          id?: string
          dispute_id?: string
          uploaded_by?: string
          storage_path?: string
          media_type?: "image" | "video" | "document"
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_evidence_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_evidence_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      wishlist_items: {
        Row: {
          id: string
          user_id: string
          item_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Database

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
