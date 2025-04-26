'use client'

import { APP_CONFIG } from '@/config/constants/app'
import { errorMetadata } from '@/config/metadata'
import { FilledButton } from '@/components/ui/button/filled'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card/card'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

export const metadata = errorMetadata

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Error Page Component
 * 
 * This page is shown when an unexpected error occurs in the application.
 * It provides options to retry the failed action or return to the homepage.
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-center">Oops! Something went wrong</CardTitle>
          <CardDescription className="text-center">
            {error.message || `An unexpected error occurred in ${APP_CONFIG.name}. Please try again later.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FilledButton
            onClick={reset}
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </FilledButton>
          <Link href="/" className="w-full">
            <FilledButton variant="outline" className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Go to Homepage
            </FilledButton>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
} 