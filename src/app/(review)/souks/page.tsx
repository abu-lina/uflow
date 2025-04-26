'use client'

import { useEffect, useState } from 'react'
import { useAuthContext } from '@/providers/auth-provider'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Souk {
  id: string
  name: string
  description: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  owner: {
    full_name: string
    email: string
  }
}

export default function SoukReviewsPage() {
  const [souks, setSouks] = useState<Souk[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPendingSouks = async () => {
      try {
        const { data, error } = await supabase
          .from('souks')
          .select(`
            *,
            owner:profiles(full_name, email)
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })

        if (error) throw error
        setSouks(data || [])
      } catch (error) {
        console.error('Error fetching souks:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPendingSouks()
  }, [])

  const handleReview = async (soukId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('souks')
        .update({ status })
        .eq('id', soukId)

      if (error) throw error

      // Update local state
      setSouks(souks.filter(souk => souk.id !== soukId))
    } catch (error) {
      console.error('Error updating souk status:', error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Souk Reviews</h1>
        <Badge variant="outline">{souks.length} pending</Badge>
      </div>

      <div className="grid gap-6">
        {souks.map((souk) => (
          <Card key={souk.id}>
            <CardHeader>
              <CardTitle>{souk.name}</CardTitle>
              <CardDescription>
                Submitted by {souk.owner.full_name} ({souk.owner.email})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{souk.description}</p>
              <div className="flex gap-4">
                <Button
                  variant="default"
                  onClick={() => handleReview(souk.id, 'approved')}
                >
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReview(souk.id, 'rejected')}
                >
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {souks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No pending souk registrations to review.</p>
          </div>
        )}
      </div>
    </div>
  )
} 