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
      users: {
        Row: {
          id?: string
          user_id?: string
          email: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          email: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          role?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          service_id: string
          service_owner_id: string
          service_name: string
          service_description?: string
          service_logo?: string
          is_verified?: boolean
          service_view_count?: number
          purchase_count?: number
          category_id?: string
          created_at?: string
          updated_at?: string
          contact_email?: string
          contact_phone?: string
          social_instagram?: string
          social_website?: string
          address_street?: string
          address_zip?: string
          address_country?: string
          location_latitude?: number
          location_longitude?: number
          service_status?: string
          reviewer_id?: string
          review_feedback?: string
          reviewed_at?: string
        }
        Insert: {
          service_id?: string
          service_owner_id: string
          service_name: string
          service_description?: string
          service_logo?: string
          is_verified?: boolean
          service_view_count?: number
          purchase_count?: number
          category_id?: string
          created_at?: string
          updated_at?: string
          contact_email?: string
          contact_phone?: string
          social_instagram?: string
          social_website?: string
          address_street?: string
          address_zip?: string
          address_country?: string
          location_latitude?: number
          location_longitude?: number
          service_status?: string
          reviewer_id?: string
          review_feedback?: string
          reviewed_at?: string
        }
        Update: {
          service_id?: string
          service_owner_id?: string
          service_name?: string
          service_description?: string
          service_logo?: string | null
          is_verified?: boolean
          service_view_count?: number
          purchase_count?: number
          category_id?: string
          updated_at?: string
          contact_email?: string
          contact_phone?: string | null
          social_instagram?: string | null
          social_website?: string | null
          address_street?: string | null
          address_zip?: string | null
          address_country?: string | null
          location_latitude?: number | null
          location_longitude?: number | null
          service_status?: string
          reviewer_id?: string | null
          review_feedback?: string | null
          reviewed_at?: string | null
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