import type React from "react"
import type { Metadata } from "next"
import { Inter } from 'next/font/google'
import "./globals.css"
import Header from "@/components/ui/Header"
import { AuthProvider } from "@/context/AuthContext"
import { Toaster } from "react-hot-toast"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "Ummah Flow - Von Muslimen für Muslime",
  description: "Der erste halal-konforme Marktplatz",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de" className="h-full">
      <body className={inter.className}>
        <AuthProvider>
          <div className="relative flex min-h-screen flex-col bg-transparent">
            <Header />
            <main className="flex-1">
              {children}
            </main>
          </div>
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  )
}
