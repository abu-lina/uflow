export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          full_name: string | null
          avatar_url: string | null
          website: string | null
          about: string | null
          updated_at: string | null
          role: 'customer' | 'business_owner' | 'halal_reviewer' | 'admin'
        }
        Insert: {
          id: string
          created_at?: string
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
          about?: string | null
          updated_at?: string | null
          role: 'customer' | 'business_owner' | 'halal_reviewer' | 'admin'
        }
        Update: {
          id?: string
          created_at?: string
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
          about?: string | null
          updated_at?: string | null
          role?: 'customer' | 'business_owner' | 'halal_reviewer' | 'admin'
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "auth.users"
            referencedColumns: ["id"]
          }
        ]
      },
      businesses: {
        Row: {
          id: string
          created_at: string
          owner_id: string
          name: string
          description: string | null
          logo_url: string | null
          is_verified: boolean | null
          verified_at: string | null
          verified_by: string | null
          view_count: number | null
          purchase_count: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          owner_id: string
          name: string
          description?: string | null
          logo_url?: string | null
          is_verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          view_count?: number | null
          purchase_count?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          owner_id?: string
          name?: string
          description?: string | null
          logo_url?: string | null
          is_verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          view_count?: number | null
          purchase_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      services: {
        Row: {
          id: string
          created_at: string
          business_id: string
          title: string
          description: string | null
          category: 'food' | 'beauty' | 'fashion' | 'health' | 'education' | 'travel' | 'other' | null
          image_urls: string[] | null
          price: number | null
          status: 'draft' | 'published' | 'archived' | null
          view_count: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          business_id: string
          title: string
          description?: string | null
          category?: 'food' | 'beauty' | 'fashion' | 'health' | 'education' | 'travel' | 'other' | null
          image_urls?: string[] | null
          price?: number | null
          status?: 'draft' | 'published' | 'archived' | null
          view_count?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          business_id?: string
          title?: string
          description?: string | null
          category?: 'food' | 'beauty' | 'fashion' | 'health' | 'education' | 'travel' | 'other' | null
          image_urls?: string[] | null
          price?: number | null
          status?: 'draft' | 'published' | 'archived' | null
          view_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          }
        ]
      },
      views: {
        Row: {
          id: string
          user_id: string | null
          viewable_id: string
          viewable_type: 'business' | 'service'
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          viewable_id: string
          viewable_type: 'business' | 'service'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          viewable_id?: string
          viewable_type?: 'business' | 'service'
          created_at?: string
        }
      },
      bookmarks: {
        Row: {
          id: string
          created_at: string
          user_id: string
          bookmarkable_id: string
          bookmarkable_type: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          bookmarkable_id: string
          bookmarkable_type: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          bookmarkable_id?: string
          bookmarkable_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
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
      user_role: 'customer' | 'business_owner' | 'halal_reviewer' | 'admin'
      service_status: 'draft' | 'published' | 'archived'
      service_category: 'food' | 'beauty' | 'fashion' | 'health' | 'education' | 'travel' | 'other'
    }
  }
}

// Helper types for working with the entities
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Business = Database['public']['Tables']['businesses']['Row']
export type Service = Database['public']['Tables']['services']['Row']
export type View = Database['public']['Tables']['views']['Row']
export type Bookmark = Database['public']['Tables']['bookmarks']['Row']

// Types for creating and updating
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type BusinessInsert = Database['public']['Tables']['businesses']['Insert']
export type ServiceInsert = Database['public']['Tables']['services']['Insert']
export type ViewInsert = Database['public']['Tables']['views']['Insert']
export type BookmarkInsert = Database['public']['Tables']['bookmarks']['Insert']

export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type BusinessUpdate = Database['public']['Tables']['businesses']['Update']
export type ServiceUpdate = Database['public']['Tables']['services']['Update']
export type ViewUpdate = Database['public']['Tables']['views']['Update']
export type BookmarkUpdate = Database['public']['Tables']['bookmarks']['Update'] 