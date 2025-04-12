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
          location: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          created_at?: string
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
          location?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
          location?: string | null
          updated_at?: string | null
        }
      }
      services: {
        Row: {
          id: string
          created_at: string
          provider_id: string
          title: string
          description: string
          category: string
          image_urls: string[]
          price: number
          location: string
          status: 'active' | 'inactive' | 'pending' | 'rejected'
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          provider_id: string
          title: string
          description: string
          category: string
          image_urls?: string[]
          price: number
          location: string
          status?: 'active' | 'inactive' | 'pending' | 'rejected'
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          provider_id?: string
          title?: string
          description?: string
          category?: string
          image_urls?: string[]
          price?: number
          location?: string
          status?: 'active' | 'inactive' | 'pending' | 'rejected'
          updated_at?: string | null
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