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
      services: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          description: string
          price: number
          category: string
          image_url: string | null
          provider_id: string
          status: 'active' | 'inactive' | 'pending'
          view_count: number
          average_rating: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          description: string
          price: number
          category: string
          image_url?: string | null
          provider_id: string
          status?: 'active' | 'inactive' | 'pending'
          view_count?: number
          average_rating?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          description?: string
          price?: number
          category?: string
          image_url?: string | null
          provider_id?: string
          status?: 'active' | 'inactive' | 'pending'
          view_count?: number
          average_rating?: number | null
        }
      }
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string | null
          full_name: string | null
          avatar_url: string | null
          email: string | null
          bio: string | null
          website: string | null
          location: string | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string | null
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          bio?: string | null
          website?: string | null
          location?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string | null
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          bio?: string | null
          website?: string | null
          location?: string | null
        }
      }
      bookmarks: {
        Row: {
          id: string
          created_at: string
          user_id: string
          service_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          service_id: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          service_id?: string
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