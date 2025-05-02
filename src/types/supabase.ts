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
      bookmarks: {
        Row: {
          bookmarkable_id: string
          bookmarkable_type:
            | Database["public"]["Enums"]["bookmark_types"]
            | null
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          bookmarkable_id: string
          bookmarkable_type?:
            | Database["public"]["Enums"]["bookmark_types"]
            | null
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          bookmarkable_id?: string
          bookmarkable_type?:
            | Database["public"]["Enums"]["bookmark_types"]
            | null
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          category_id: string
          name_ar: string | null
          name_de: string | null
          name_en: string
        }
        Insert: {
          category_id?: string
          name_ar?: string | null
          name_de?: string | null
          name_en: string
        }
        Update: {
          category_id?: string
          name_ar?: string | null
          name_de?: string | null
          name_en?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_urls: string[] | null
          price: number | null
          souk_id: string
          status: Database["public"]["Enums"]["souk_status"] | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_urls?: string[] | null
          price?: number | null
          souk_id: string
          status?: Database["public"]["Enums"]["souk_status"] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_urls?: string[] | null
          price?: number | null
          souk_id?: string
          status?: Database["public"]["Enums"]["souk_status"] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_offers_souk"
            columns: ["souk_id"]
            isOneToOne: false
            referencedRelation: "souks"
            referencedColumns: ["souk_id"]
          },
          {
            foreignKeyName: "offers_souk_id_fkey"
            columns: ["souk_id"]
            isOneToOne: false
            referencedRelation: "souks"
            referencedColumns: ["souk_id"]
          },
        ]
      }
      profiles: {
        Row: {
          about: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          about?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          about?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          id: string
          offer_id: string | null
          purchased_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          offer_id?: string | null
          purchased_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          offer_id?: string | null
          purchased_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      souks: {
        Row: {
          address_city: string | null
          address_country: string
          address_street: string
          address_zip: string
          bookmarks_id: string | null
          category_id: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          is_verified: boolean | null
          location_latitude: number | null
          location_longitude: number | null
          opening_hours: string | null
          purchase_count: number | null
          review_feedback: string | null
          social_instagram: string | null
          social_website: string | null
          souk_description: string | null
          souk_id: string
          souk_images: string | null
          souk_logo: Json | null
          souk_name: string
          souk_owner_id: string
          souk_status: Database["public"]["Enums"]["souk_status"] | null
          souk_view_count: number | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          address_city?: string | null
          address_country: string
          address_street: string
          address_zip: string
          bookmarks_id?: string | null
          category_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          is_verified?: boolean | null
          location_latitude?: number | null
          location_longitude?: number | null
          opening_hours?: string | null
          purchase_count?: number | null
          review_feedback?: string | null
          social_instagram?: string | null
          social_website?: string | null
          souk_description?: string | null
          souk_id?: string
          souk_images?: string | null
          souk_logo?: Json | null
          souk_name: string
          souk_owner_id: string
          souk_status?: Database["public"]["Enums"]["souk_status"] | null
          souk_view_count?: number | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          address_city?: string | null
          address_country?: string
          address_street?: string
          address_zip?: string
          bookmarks_id?: string | null
          category_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          is_verified?: boolean | null
          location_latitude?: number | null
          location_longitude?: number | null
          opening_hours?: string | null
          purchase_count?: number | null
          review_feedback?: string | null
          social_instagram?: string | null
          social_website?: string | null
          souk_description?: string | null
          souk_id?: string
          souk_images?: string | null
          souk_logo?: Json | null
          souk_name?: string
          souk_owner_id?: string
          souk_status?: Database["public"]["Enums"]["souk_status"] | null
          souk_view_count?: number | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "services_service_owner_id_fkey1"
            columns: ["souk_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "souks_bookmarks_id_fkey"
            columns: ["bookmarks_id"]
            isOneToOne: false
            referencedRelation: "bookmarks"
            referencedColumns: ["id"]
          },
        ]
      }
      views: {
        Row: {
          created_at: string | null
          id: string
          user_id: string | null
          viewable_id: string
          viewable_types: Database["public"]["Enums"]["bookmark_types"] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id?: string | null
          viewable_id: string
          viewable_types?: Database["public"]["Enums"]["bookmark_types"] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string | null
          viewable_id?: string
          viewable_types?: Database["public"]["Enums"]["bookmark_types"] | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_timestamp: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      bookmark_types: "souk" | "offer"
      souk_status: "draft" | "published" | "archived" | "suspended"
      user_role: "customer" | "souk_owner" | "halal_reviewer" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      bookmark_types: ["souk", "offer"],
      souk_status: ["draft", "published", "archived", "suspended"],
      user_role: ["customer", "souk_owner", "halal_reviewer", "admin"],
    },
  },
} as const
