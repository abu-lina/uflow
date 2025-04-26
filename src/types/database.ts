/**
 * @fileoverview Database schema types
 * @module types/database
 */

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
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'customer' | 'service_owner' | 'halal_reviewer' | 'admin'
        }
        Insert: {
          id: string
          created_at?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'customer' | 'service_owner' | 'halal_reviewer' | 'admin'
        }
        Update: {
          id?: string
          created_at?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'customer' | 'service_owner' | 'halal_reviewer' | 'admin'
        }
      }
      souks: {
        Row: {
          souk_id: string
          souk_owner_id: string
          souk_name: string
          souk_description: string | null
          souk_logo: Json | null
          is_verified: boolean
          verified_at: string | null
          verified_by: string | null
          souk_view_count: number
          purchase_count: number
          category_id: string | null
          created_at: string
          updated_at: string
          contact_email: string | null
          contact_phone: string | null
          social_instagram: string | null
          social_website: string | null
          address_street: string
          address_zip: string
          address_country: string
          location_latitude: number | null
          location_longitude: number | null
          souk_status: 'draft' | 'published' | 'archived' | 'suspended'
          review_feedback: string | null
          souk_images: string | null
          address_city: string | null
          opening_hours: string | null
          bookmarks_id: string | null
        }
        Insert: {
          souk_id?: string
          souk_owner_id: string
          souk_name: string
          souk_description?: string | null
          souk_logo?: Json | null
          is_verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          souk_view_count?: number
          purchase_count?: number
          category_id?: string | null
          created_at?: string
          updated_at?: string
          contact_email?: string | null
          contact_phone?: string | null
          social_instagram?: string | null
          social_website?: string | null
          address_street: string
          address_zip: string
          address_country: string
          location_latitude?: number | null
          location_longitude?: number | null
          souk_status?: 'draft' | 'published' | 'archived' | 'suspended'
          review_feedback?: string | null
          souk_images?: string | null
          address_city?: string | null
          opening_hours?: string | null
          bookmarks_id?: string | null
        }
        Update: {
          souk_id?: string
          souk_owner_id?: string
          souk_name?: string
          souk_description?: string | null
          souk_logo?: Json | null
          is_verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          souk_view_count?: number
          purchase_count?: number
          category_id?: string | null
          created_at?: string
          updated_at?: string
          contact_email?: string | null
          contact_phone?: string | null
          social_instagram?: string | null
          social_website?: string | null
          address_street?: string
          address_zip?: string
          address_country?: string
          location_latitude?: number | null
          location_longitude?: number | null
          souk_status?: 'draft' | 'published' | 'archived' | 'suspended'
          review_feedback?: string | null
          souk_images?: string | null
          address_city?: string | null
          opening_hours?: string | null
          bookmarks_id?: string | null
        }
      }
      categories: {
        Row: {
          category_id: string
          name_en: string
          name_de: string | null
          name_ar: string | null
        }
        Insert: {
          category_id?: string
          name_en: string
          name_de?: string | null
          name_ar?: string | null
        }
        Update: {
          category_id?: string
          name_en?: string
          name_de?: string | null
          name_ar?: string | null
        }
      }
      offers: {
        Row: {
          id: string
          service_id: string
          title: string
          description: string | null
          price: number | null
          image_urls: string[] | null
          status: 'draft' | 'published' | 'archived' | 'suspended'
          view_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_id: string
          title: string
          description?: string | null
          price?: number | null
          image_urls?: string[] | null
          status?: 'draft' | 'published' | 'archived' | 'suspended'
          view_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          title?: string
          description?: string | null
          price?: number | null
          image_urls?: string[] | null
          status?: 'draft' | 'published' | 'archived' | 'suspended'
          view_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      bookmarks: {
        Row: {
          id: string
          user_id: string
          bookmarkable_id: string
          bookmarkable_type: 'business' | 'service'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bookmarkable_id: string
          bookmarkable_type: 'business' | 'service'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bookmarkable_id?: string
          bookmarkable_type?: 'business' | 'service'
          created_at?: string
        }
      }
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
  }
}

// Type exports
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type Souk = Database['public']['Tables']['souks']['Row'];
export type SoukInsert = Database['public']['Tables']['souks']['Insert'];
export type SoukUpdate = Database['public']['Tables']['souks']['Update'];

export type Category = Database['public']['Tables']['categories']['Row'];
export type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
export type CategoryUpdate = Database['public']['Tables']['categories']['Update'];

export type Offer = Database['public']['Tables']['offers']['Row'];
export type OfferInsert = Database['public']['Tables']['offers']['Insert'];
export type OfferUpdate = Database['public']['Tables']['offers']['Update'];

export type Bookmark = Database['public']['Tables']['bookmarks']['Row'];
export type BookmarkInsert = Database['public']['Tables']['bookmarks']['Insert'];
export type BookmarkUpdate = Database['public']['Tables']['bookmarks']['Update'];

export type View = Database['public']['Tables']['views']['Row'];
export type ViewInsert = Database['public']['Tables']['views']['Insert'];
export type ViewUpdate = Database['public']['Tables']['views']['Update']; 