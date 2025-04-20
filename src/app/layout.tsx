import type React from "react"
import type { Metadata } from "next"
import { Inter } from 'next/font/google'
import "./globals.css"
import Header from "@/components/ui/Header"
import { AuthProvider } from "@/context/AuthContext"

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
      <body className={`${inter.className} min-h-screen bg-[#F5F5F5]`}>
        <AuthProvider>
          <Header />
          <main className="pt-[90px]">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  )
}
