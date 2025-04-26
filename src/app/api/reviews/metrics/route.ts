import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
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

  // Get review metrics
  const { count: pending } = await supabase
    .from('souks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { count: approved } = await supabase
    .from('souks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')

  const { count: rejected } = await supabase
    .from('souks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'rejected')

  const { count: total } = await supabase
    .from('souks')
    .select('*', { count: 'exact', head: true })

  // Calculate statistics
  const stats = {
    pending: pending || 0,
    approved: approved || 0,
    rejected: rejected || 0,
    total: total || 0
  }

  return NextResponse.json(stats)
} 