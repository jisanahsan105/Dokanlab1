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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_payment_settings: {
        Row: {
          bank_details: string | null
          bkash_number: string | null
          created_at: string
          done_for_you_first_amount: number
          done_for_you_recurring_amount: number
          id: string
          instructions: string | null
          nagad_number: string | null
          rocket_number: string | null
          self_serve_amount: number
          updated_at: string
        }
        Insert: {
          bank_details?: string | null
          bkash_number?: string | null
          created_at?: string
          done_for_you_first_amount?: number
          done_for_you_recurring_amount?: number
          id?: string
          instructions?: string | null
          nagad_number?: string | null
          rocket_number?: string | null
          self_serve_amount?: number
          updated_at?: string
        }
        Update: {
          bank_details?: string | null
          bkash_number?: string | null
          created_at?: string
          done_for_you_first_amount?: number
          done_for_you_recurring_amount?: number
          id?: string
          instructions?: string | null
          nagad_number?: string | null
          rocket_number?: string | null
          self_serve_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          image_url: string | null
          name: string
          position: number
          store_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          position?: number
          store_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          position?: number
          store_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_address: string
          customer_name: string
          customer_phone: string
          delivery_area: string | null
          delivery_charge: number
          id: string
          notes: string | null
          product_id: string | null
          product_title: string
          quantity: number
          status: string
          store_id: string
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          customer_address: string
          customer_name: string
          customer_phone: string
          delivery_area?: string | null
          delivery_charge?: number
          id?: string
          notes?: string | null
          product_id?: string | null
          product_title: string
          quantity?: number
          status?: string
          store_id: string
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          customer_address?: string
          customer_name?: string
          customer_phone?: string
          delivery_area?: string | null
          delivery_charge?: number
          id?: string
          notes?: string | null
          product_id?: string | null
          product_title?: string
          quantity?: number
          status?: string
          store_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: string | null
          category_id: string | null
          created_at: string
          description: string | null
          download_url: string | null
          id: string
          image_url: string | null
          price: number
          store_id: string
          title: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          id?: string
          image_url?: string | null
          price?: number
          store_id: string
          title: string
        }
        Update: {
          active?: boolean
          category?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          id?: string
          image_url?: string | null
          price?: number
          store_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          access_status: string
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          subscription_plan: string | null
          subscription_status: string
          subscription_valid_until: string | null
        }
        Insert: {
          access_status?: string
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          subscription_plan?: string | null
          subscription_status?: string
          subscription_valid_until?: string | null
        }
        Update: {
          access_status?: string
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          subscription_plan?: string | null
          subscription_status?: string
          subscription_valid_until?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          approved: boolean
          comment: string | null
          created_at: string
          customer_name: string
          id: string
          product_id: string
          rating: number
          store_id: string
        }
        Insert: {
          approved?: boolean
          comment?: string | null
          created_at?: string
          customer_name: string
          id?: string
          product_id: string
          rating: number
          store_id: string
        }
        Update: {
          approved?: boolean
          comment?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          product_id?: string
          rating?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_messages: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          message: string
          seen: boolean
          seen_at: string | null
          source: string
          store_id: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          message: string
          seen?: boolean
          seen_at?: string | null
          source?: string
          store_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          message?: string
          seen?: boolean
          seen_at?: string | null
          source?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_messages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          announcement_enabled: boolean
          announcement_text: string | null
          banner_enabled: boolean
          banner_url: string | null
          bio: string | null
          brand_primary_color: string | null
          business_days: string | null
          business_hours: string | null
          created_at: string
          currency: string
          custom_domain: string | null
          delivery_inside_dhaka: number
          delivery_outside_dhaka: number
          delivery_zones: Json
          domain_last_check_error: string | null
          domain_last_checked_at: string | null
          domain_verification_token: string | null
          domain_verified: boolean
          favicon_url: string | null
          footer_about_url: string | null
          footer_address: string | null
          footer_appstore_url: string | null
          footer_copyright: string | null
          footer_email: string | null
          footer_facebook_url: string | null
          footer_phone: string | null
          footer_playstore_url: string | null
          footer_privacy_text: string | null
          footer_privacy_url: string | null
          footer_return_text: string | null
          footer_return_url: string | null
          footer_terms_text: string | null
          footer_terms_url: string | null
          footer_warranty_text: string | null
          footer_warranty_url: string | null
          holiday_message: string | null
          holiday_mode: boolean
          id: string
          instagram_url: string | null
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          min_order_amount: number
          name: string
          og_image_url: string | null
          owner_id: string
          payment_bkash_enabled: boolean
          payment_bkash_number: string | null
          payment_cod_enabled: boolean
          payment_instructions: string | null
          payment_nagad_enabled: boolean
          payment_nagad_number: string | null
          payment_rocket_enabled: boolean
          payment_rocket_number: string | null
          product_whatsapp_url: string | null
          site_status: string | null
          site_status_checked_at: string | null
          site_status_message: string | null
          slug: string
          tagline: string | null
          theme: string
          tiktok_url: string | null
          updated_at: string
          whatsapp: string | null
          whatsapp_channel_url: string | null
          youtube_url: string | null
        }
        Insert: {
          announcement_enabled?: boolean
          announcement_text?: string | null
          banner_enabled?: boolean
          banner_url?: string | null
          bio?: string | null
          brand_primary_color?: string | null
          business_days?: string | null
          business_hours?: string | null
          created_at?: string
          currency?: string
          custom_domain?: string | null
          delivery_inside_dhaka?: number
          delivery_outside_dhaka?: number
          delivery_zones?: Json
          domain_last_check_error?: string | null
          domain_last_checked_at?: string | null
          domain_verification_token?: string | null
          domain_verified?: boolean
          favicon_url?: string | null
          footer_about_url?: string | null
          footer_address?: string | null
          footer_appstore_url?: string | null
          footer_copyright?: string | null
          footer_email?: string | null
          footer_facebook_url?: string | null
          footer_phone?: string | null
          footer_playstore_url?: string | null
          footer_privacy_text?: string | null
          footer_privacy_url?: string | null
          footer_return_text?: string | null
          footer_return_url?: string | null
          footer_terms_text?: string | null
          footer_terms_url?: string | null
          footer_warranty_text?: string | null
          footer_warranty_url?: string | null
          holiday_message?: string | null
          holiday_mode?: boolean
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          min_order_amount?: number
          name: string
          og_image_url?: string | null
          owner_id: string
          payment_bkash_enabled?: boolean
          payment_bkash_number?: string | null
          payment_cod_enabled?: boolean
          payment_instructions?: string | null
          payment_nagad_enabled?: boolean
          payment_nagad_number?: string | null
          payment_rocket_enabled?: boolean
          payment_rocket_number?: string | null
          product_whatsapp_url?: string | null
          site_status?: string | null
          site_status_checked_at?: string | null
          site_status_message?: string | null
          slug: string
          tagline?: string | null
          theme?: string
          tiktok_url?: string | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_channel_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          announcement_enabled?: boolean
          announcement_text?: string | null
          banner_enabled?: boolean
          banner_url?: string | null
          bio?: string | null
          brand_primary_color?: string | null
          business_days?: string | null
          business_hours?: string | null
          created_at?: string
          currency?: string
          custom_domain?: string | null
          delivery_inside_dhaka?: number
          delivery_outside_dhaka?: number
          delivery_zones?: Json
          domain_last_check_error?: string | null
          domain_last_checked_at?: string | null
          domain_verification_token?: string | null
          domain_verified?: boolean
          favicon_url?: string | null
          footer_about_url?: string | null
          footer_address?: string | null
          footer_appstore_url?: string | null
          footer_copyright?: string | null
          footer_email?: string | null
          footer_facebook_url?: string | null
          footer_phone?: string | null
          footer_playstore_url?: string | null
          footer_privacy_text?: string | null
          footer_privacy_url?: string | null
          footer_return_text?: string | null
          footer_return_url?: string | null
          footer_terms_text?: string | null
          footer_terms_url?: string | null
          footer_warranty_text?: string | null
          footer_warranty_url?: string | null
          holiday_message?: string | null
          holiday_mode?: boolean
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          min_order_amount?: number
          name?: string
          og_image_url?: string | null
          owner_id?: string
          payment_bkash_enabled?: boolean
          payment_bkash_number?: string | null
          payment_cod_enabled?: boolean
          payment_instructions?: string | null
          payment_nagad_enabled?: boolean
          payment_nagad_number?: string | null
          payment_rocket_enabled?: boolean
          payment_rocket_number?: string | null
          product_whatsapp_url?: string | null
          site_status?: string | null
          site_status_checked_at?: string | null
          site_status_message?: string | null
          slug?: string
          tagline?: string | null
          theme?: string
          tiktok_url?: string | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_channel_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          note: string | null
          payment_method: string
          plan: string
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_url: string | null
          sender_number: string | null
          status: string
          transaction_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          payment_method: string
          plan: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          sender_number?: string | null
          status?: string
          transaction_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          payment_method?: string
          plan?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          sender_number?: string | null
          status?: string
          transaction_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "user"
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
    Enums: {
      app_role: ["super_admin", "user"],
    },
  },
} as const
