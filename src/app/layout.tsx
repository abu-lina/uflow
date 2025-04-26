import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/ui/layout/header"
import { AuthProvider } from "@/providers/AuthProvider"
import { Navbar } from '@/components/layout/navbar'

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: {
    default: "Ummah Flow",
    template: "%s | Ummah Flow"
  },
  description: "Der erste halal-konforme Marktplatz für Muslime",
  keywords: ["halal", "marktplatz", "muslime", "islam", "shopping", "e-commerce"],
  authors: [{ name: "Ummah Flow Team" }],
  creator: "Ummah Flow",
  publisher: "Ummah Flow",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: "/",
    title: "Ummah Flow - Von Muslimen für Muslime",
    description: "Der erste halal-konforme Marktplatz",
    siteName: "Ummah Flow",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ummah Flow - Von Muslimen für Muslime",
    description: "Der erste halal-konforme Marktplatz",
    creator: "@ummahflow",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#589D96" },
    { media: "(prefers-color-scheme: dark)", color: "#BFDBD8" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de" className={`${inter.variable} h-full`}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider>
          <Navbar />
          <Header />
          <main className="pt-[90px] min-h-[calc(100vh-90px)]">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  )
}
