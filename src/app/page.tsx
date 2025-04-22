"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Header from "@/components/ui/Header"
import SoukCard from "@/components/ui/SoukCard"
import Placeholder from "@/components/ui/Placeholder"
import QuoteCard from "@/components/ui/QuoteCard"
import { Button } from "@/components/ui/button"
import { Bisma } from "@/components/ui/bisma"
import { BismaDE } from "@/components/ui/BismaDE"
import { getAllSoukItems, SearchResult } from "@/lib/search"
import PageTransition from "@/components/ui/PageTransition"
import { motion } from "framer-motion"

export default function Home() {
  const [souks, setSouks] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSouks = async () => {
      const data = await getAllSoukItems()
      setSouks(data)
      setIsLoading(false)
    }
    fetchSouks()
  }, [])

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-[#F5F5F5] snap-y snap-mandatory overflow-y-auto">
      {/* Hero Section - Full Viewport Height */}
      <section className="min-h-screen flex flex-col items-center justify-center snap-start">
        <PageTransition delay={0}>
          {/* Div 1: Bisma Logo */}
          <div className="flex flex-col items-center gap-2 mb-8">
            <Bisma width={200} height={36} />
            <BismaDE />
          </div>

          {/* Div 2: Heading and Description */}
          <div className="flex flex-col items-center gap-6 mb-8">
            <h1 className="font-sans font-normal text-[72px] leading-[87px] text-center text-[#000000]">
              Von <span className="text-[#589D96]">Muslimen</span> für <span className="text-[#589D96]">Muslime</span>.
            </h1>
            <p className="max-w-[722px] font-sans text-[24px] leading-[29px] text-center text-[#7A7A7A]">
              Ummah Flow – der erste halal-konforme Marktplatz, der sicherstellt, dass jeder die Zakat entrichtet, in sha Allah.
            </p>
          </div>

          {/* Div3 Section */}
          <div className="flex flex-col items-center w-full max-w-[1200px] px-4 py-8 gap-8">
            <div className="flex flex-col items-center gap-8 w-full">
              <Link href="/souk" className="h-[56px] flex items-center justify-between px-5 bg-[#589D96] rounded-[16.8px] hover:bg-[#4a8a84] transition-colors">
                <span className="text-white font-sans text-[20px] leading-[24px] whitespace-nowrap px-5">
                  Entdecke deine Ummah
                </span>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                  xmlns="http://www.w3.org/2000/svg" className="rotate-180">
                  <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </div>
        </PageTransition>
      </section>

      {/* Why Section - Full Viewport Height */}
      <section className="min-h-screen flex items-center justify-center px-4 snap-start">
        <PageTransition delay={200} sectionType="why">
          <div className="max-w-[960px] w-full flex flex-col items-center gap-6 text-center">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="font-sans font-medium text-[72px] leading-[87px] text-black"
            >
              Warum braucht es einen <span className="text-[#589D96]">muslimischen</span> Marktplatz?
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="font-sans font-normal text-[24px] leading-[29px] text-[#565656] max-w-[722px]"
            >
              Mit Ummah Flow möchten wir – mit der Erlaubnis Allahs ﷲ – unsere Ummah wieder stark machen.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
            >
              <QuoteCard className="w-[800px] h-[532.14px] mt-8" />
            </motion.div>
          </div>
        </PageTransition>
      </section>

      {/* Zakat Projects Section - Full Viewport Height */}
      <section className="min-h-screen flex items-center justify-center snap-start">
        <PageTransition delay={400}>
          <div className="max-w-[1440px] w-full mx-auto px-20">
            <div className="flex flex-col">
              <h2 className="text-[36px] font-semibold text-[#232323] mb-12 leading-tight">
                Unsere Zakat Projekte
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <SoukCard key={i} souk={null} />
                  ))
                ) : (
                  souks.map((souk) => (
                    <SoukCard key={souk.souk_id} souk={souk} />
                  ))
                )}
              </div>
            </div>
          </div>
        </PageTransition>
      </section>

      {/* About Section */}
      <section id="about" className="min-h-screen flex items-center justify-center snap-start">
        <PageTransition delay={600}>
          <div className="w-[1440px] flex flex-row items-center px-[80px] gap-[80px]">
            <div className="w-[720px] h-[526px] flex flex-col justify-center items-start gap-[24px]">
              <h2 className="w-[720px] h-[154px] font-['Inter_Tight'] text-[64px] font-medium leading-[77px] text-black">
                Wer steckt hinter Ummah Flow?
              </h2>
              <p className="w-[720px] h-[348px] font-['Inter_Tight'] text-[24px] font-normal leading-[29px] text-[#565656]">
                Ummah Flow ist mehr als nur ein Marktplatz – es ist eine Bewegung. Wir verbinden die muslimische Community mit halal-konformen Produkten und Dienstleistungen. Unser Ziel ist es, eine Plattform zu schaffen, auf der muslimische Unternehmer, Kreative und Dienstleister ihre Angebote einer engagierten Gemeinschaft präsentieren können. Wir glauben an faire Wirtschaft, gegenseitige Unterstützung und ein starkes Netzwerk, das islamische Werte lebt. Ummah Flow steht für Vertrauen, Qualität und Innovation – damit du Produkte und Dienstleistungen findest, die zu deinem Lebensstil passen. Schließe dich uns an und werde Teil von Ummah Flow!
              </p>
            </div>
            <div className="w-[480px] h-[640px] flex flex-row items-center gap-[32px]">
              <div className="w-[480px] h-[640px] rounded-[24px] transform -scale-x-100 overflow-hidden">
                <Placeholder width={480} height={640} />
              </div>
            </div>
          </div>
        </PageTransition>
      </section>
    </div>
  )
}