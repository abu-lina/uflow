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
      bookmarks: {
        Row: {
          id: string
          created_at: string
          user_id: string
          souk_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          souk_id: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          souk_id?: string
        }
      }
      categories: {
        Row: {
          category_id: string
          name_en: string
          name_de: string
          name_ar: string
          created_at?: string
          updated_at?: string
        }
        Insert: {
          category_id?: string
          name_en: string
          name_de: string
          name_ar: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          name_en?: string
          name_de?: string
          name_ar?: string
          created_at?: string
          updated_at?: string
        }
      }
      offers: {
        Row: {
          id: string
          created_at: string
          souk_id: string
          user_id: string
          amount: number
          status: 'pending' | 'accepted' | 'rejected'
          message: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          souk_id: string
          user_id: string
          amount: number
          status?: 'pending' | 'accepted' | 'rejected'
          message?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          souk_id?: string
          user_id?: string
          amount?: number
          status?: 'pending' | 'accepted' | 'rejected'
          message?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          updated_at: string | null
          created_at: string
          role: 'customer' | 'halal_reviewer' | 'admin'
          about: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string | null
          created_at?: string
          role?: 'customer' | 'halal_reviewer' | 'admin'
          about?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string | null
          created_at?: string
          role?: 'customer' | 'halal_reviewer' | 'admin'
          about?: string | null
        }
      }
      souks: {
        Row: {
          souk_id: string
          souk_owner_id: string
          souk_name: string
          souk_description: string | null
          souk_logo: string | null
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
          address_street: string | null
          address_zip: string | null
          address_country: string | null
          location_latitude: number | null
          location_longitude: number | null
          souk_status: 'published' | 'draft' | null
          review_feedback: string | null
          souk_images: { urls: string[] } | null
          address_city: string | null
          opening_hours: string | null
          bookmarks_id: string | null
        }
        Insert: {
          souk_id?: string
          souk_owner_id: string
          souk_name: string
          souk_description?: string | null
          souk_logo?: string | null
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
          address_street?: string | null
          address_zip?: string | null
          address_country?: string | null
          location_latitude?: number | null
          location_longitude?: number | null
          souk_status?: 'published' | 'draft' | null
          review_feedback?: string | null
          souk_images?: { urls: string[] } | null
          address_city?: string | null
          opening_hours?: string | null
          bookmarks_id?: string | null
        }
        Update: {
          souk_id?: string
          souk_owner_id?: string
          souk_name?: string
          souk_description?: string | null
          souk_logo?: string | null
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
          address_street?: string | null
          address_zip?: string | null
          address_country?: string | null
          location_latitude?: number | null
          location_longitude?: number | null
          souk_status?: 'published' | 'draft' | null
          review_feedback?: string | null
          souk_images?: { urls: string[] } | null
          address_city?: string | null
          opening_hours?: string | null
          bookmarks_id?: string | null
        }
      }
      views: {
        Row: {
          id: string
          created_at: string
          souk_id: string
          user_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          souk_id: string
          user_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          souk_id?: string
          user_id?: string | null
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