import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  // Check if user is authenticated and has reviewer role
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'reviewer') {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Get pending souks
  const { data: souks, error } = await supabase
    .from('souks')
    .select(`
      *,
      owner:profiles(full_name, email)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    return new NextResponse('Error fetching souks', { status: 500 })
  }

  return NextResponse.json(souks)
}

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  // Check if user is authenticated and has reviewer role
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'reviewer') {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const { soukId, status, comment } = await request.json()

  // Update souk status
  const { error } = await supabase
    .from('souks')
    .update({ 
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.user.id,
      review_comment: comment
    })
    .eq('id', soukId)

  if (error) {
    return new NextResponse('Error updating souk status', { status: 500 })
  }

  return NextResponse.json({ success: true })
} 