import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface SearchResult {
  souk_id: string
  souk_owner_id: string
  souk_name: string
  souk_description: string | null
  souk_logo: string | null
  souk_images: string | null
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
  address_city: string | null
  address_country: string | null
  location_latitude: number | null
  location_longitude: number | null
  souk_status: string
  review_feedback: string | null
}

export interface Category {
  category_id: string
  name_en: string
  name_de: string
  name_ar: string
}

export async function getAllCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name_de', { ascending: true })

    if (error) throw error

    return data.map(category => ({
      category_id: category.category_id,
      name_en: category.name_en,
      name_de: category.name_de,
      name_ar: category.name_ar
    }))
  } catch (error) {
    console.error('Error fetching categories:', error)
    return []
  }
}

export async function getAllSoukItems(): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabase
      .from('souks')
      .select('*')
      .eq('souk_status', 'published')
      .order('created_at', { ascending: false })

    if (error) throw error

    return data.map(item => ({
      souk_id: item.souk_id,
      souk_owner_id: item.souk_owner_id,
      souk_name: item.souk_name,
      souk_description: item.souk_description,
      souk_logo: item.souk_logo,
      souk_images: item.souk_images,
      is_verified: item.is_verified,
      verified_at: item.verified_at,
      verified_by: item.verified_by,
      souk_view_count: item.souk_view_count,
      purchase_count: item.purchase_count,
      category_id: item.category_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
      contact_email: item.contact_email,
      contact_phone: item.contact_phone,
      social_instagram: item.social_instagram,
      social_website: item.social_website,
      address_street: item.address_street,
      address_zip: item.address_zip,
      address_city: item.address_city,
      address_country: item.address_country,
      location_latitude: item.location_latitude,
      location_longitude: item.location_longitude,
      souk_status: item.souk_status,
      review_feedback: item.review_feedback
    }))
  } catch (error) {
    console.error('Error fetching souk items:', error)
    return []
  }
}

export async function searchSouk(query: string): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabase
      .from('souks')
      .select('*')
      .eq('souk_status', 'published')
      .textSearch('souk_name', query, {
        type: 'websearch',
        config: 'german'
      })
      .order('created_at', { ascending: false })

    if (error) throw error

    return data.map(item => ({
      souk_id: item.souk_id,
      souk_owner_id: item.souk_owner_id,
      souk_name: item.souk_name,
      souk_description: item.souk_description,
      souk_logo: item.souk_logo,
      souk_images: item.souk_images,
      is_verified: item.is_verified,
      verified_at: item.verified_at,
      verified_by: item.verified_by,
      souk_view_count: item.souk_view_count,
      purchase_count: item.purchase_count,
      category_id: item.category_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
      contact_email: item.contact_email,
      contact_phone: item.contact_phone,
      social_instagram: item.social_instagram,
      social_website: item.social_website,
      address_street: item.address_street,
      address_zip: item.address_zip,
      address_city: item.address_city,
      address_country: item.address_country,
      location_latitude: item.location_latitude,
      location_longitude: item.location_longitude,
      souk_status: item.souk_status,
      review_feedback: item.review_feedback
    }))
  } catch (error) {
    console.error('Error searching souk:', error)
    return []
  }
} 