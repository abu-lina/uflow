import type React from "react"
import type { Metadata } from "next"
import { Inter_Tight } from "next/font/google"
import "./globals.css"

const interTight = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter-tight",
})

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
    <html lang="de">
      <body className={interTight.className}>{children}</body>
    </html>
  )
}
