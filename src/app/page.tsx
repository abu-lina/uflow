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
    <div className="flex flex-col items-center w-full min-h-screen bg-[#F5F5F5]">
      {/* Hero Section - Full Viewport Height */}
      <section className="h-[calc(100vh-90px)] mt-[90px] flex flex-col items-center">
        {/* Div 1: Bisma Logo */}
        <div className="mt-[80px] flex flex-col items-center gap-2 mb-8">
          <Bisma width={200} height={36} />
          <BismaDE />
        </div>

        {/* Div 2: Heading and Description */}
        <div className="flex flex-col items-center gap-6 mb-8">
          <h1 className="font-['Inter_Tight'] font-normal text-[72px] leading-[87px] text-center text-[#000000]">
            Von <span className="text-[#589D96]">Muslimen</span> für <span className="text-[#589D96]">Muslime</span>.
          </h1>
          <p className="max-w-[722px] font-sans text-[24px] leading-[29px] text-center text-[#7A7A7A]">
            Ummah Flow – der erste halal-konforme Marktplatz, der sicherstellt, dass jeder die Zakat entrichtet, in sha Allah.
          </p>
        </div>

        {/* Div3 Section */}
        <div className="flex flex-col items-center w-full max-w-[1200px] px-4 py-8 gap-8">
          <div className="flex flex-col items-center gap-8 w-full">
            <Link href="/souk" className="w-[274px] h-[56px] flex items-center justify-between px-5 bg-[#589D96] rounded-[16.8px] hover:bg-[#4a8a84] transition-colors">
              <span className="text-white font-['Inter_Tight'] text-[20px] leading-[24px]">
                Entdecke deine Ummah!
              </span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                xmlns="http://www.w3.org/2000/svg" className="rotate-180">
                <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Section - Full Viewport Height */}
      <section className="min-h-[calc(100vh-90px)] flex items-center justify-center px-4">
        <div className="max-w-[960px] w-full flex flex-col items-center gap-6 text-center">
          <h2 className="font-['Inter_Tight'] font-medium text-[72px] leading-[87px] text-black">
            Warum braucht es einen <span className="text-[#589D96]">muslimischen</span> Marktplatz?
          </h2>
          <p className="font-['Inter_Tight'] font-normal text-[24px] leading-[29px] text-[#565656] max-w-[722px]">
            Mit Ummah Flow möchten wir – mit der Erlaubnis Allahs ﷲ – unsere Ummah wieder stark machen.
          </p>
          <QuoteCard className="w-[800px] h-[532.14px] mt-8" />
        </div>
      </section>

      {/* Zakat Projects Section - Full Viewport Height */}
      <section className="h-[calc(100vh-90px)] flex">
        <div className="max-w-[1440px] w-full mx-auto px-20 my-auto">
          <div className="flex flex-col">
            <h2 className="text-[36px] font-semibold text-[#232323] mb-12 leading-tight">
              Unsere Zakat Projekte
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <SoukCard key={i} souk={null} ownerName="Loading..." />
                ))
              ) : (
                souks.map((souk) => (
                  <SoukCard key={souk.souk_id} souk={souk} ownerName={souk.souk_owner_id} />
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="h-[calc(100vh-90px)] flex">
        <div className="max-w-[1440px] w-full mx-auto px-20 my-auto">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="md:w-1/2 space-y-6">
              <p className="text-[12px] text-[#7A7A7A]">Über Uns</p>
              <h2 className="text-[36px] font-semibold text-[#232323] leading-tight">
                Wer steckt hinter
                <br />
                Ummah Flow?
              </h2>
              <div className="space-y-4 max-w-lg">
                <p className="text-[24px] text-[#7A7A7A] leading-normal">
                  Ummah Flow ist mehr als nur ein Marktplatz – es ist eine Bewegung. Wir verbinden die muslimische Community
                  mit nachhaltigen, ethischen und halal-konformen Produkten und Dienstleistungen. Unser Ziel ist es, eine
                  Platform zu schaffen, auf der muslimische Unternehmer, Kreative und Dienstleister ihre Angebote einer
                  engagierten Gemeinschaft präsentieren können.
                </p>
                <p className="text-[24px] text-[#7A7A7A] leading-normal">
                  Wir glauben an faire Wirtschaft, gegenseitige Unterstützung und ein starkes Netzwerk, das islamische Werte
                  lebt. Ummah Flow steht für Vertrauen, Qualität und Innovation – damit du Produkte und Dienstleistungen
                  findest, die zu deinem Lebensstil passen. Schließe dich uns an und werde Teil der Ummah Flow Community!
                </p>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="bg-primary rounded-full p-16 relative">
                <Placeholder width={200} height={200} className="text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}