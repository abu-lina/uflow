import Link from "next/link"
import ProjectCard from "@/components/ui/ProjectCard"
import Placeholder from "@/components/ui/Placeholder"
import QuoteCard from "@/components/ui/QuoteCard"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <>
      {/* Hero Section - Full Viewport Height */}
      <section className="h-[calc(100vh-90px)] flex">
        <div className="max-w-[1440px] w-full mx-auto px-20 my-auto">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="md:w-1/2 space-y-6">
              <h1 className="text-[78px] font-weight-400 letter-spacing-[-.007em] line-height-[110%] text-[#232323] leading-tight">
                Von Muslimen
                <br />
                für Muslime.
              </h1>
              <p className="text-[26px] text-[#7A7A7A] max-w-md leading-normal">
                Der erste halal-konforme Marktplatz der sicherstellt, das jeder Anbieter die Zakat entrichtet.
              </p>
              <Button asChild variant="action" size="action">
                <Link href="/about">Entdecke deine Ummah!</Link>
              </Button>
            </div>
            <div className="md:w-1/2">
              <QuoteCard className="w-full h-[400px]" />
            </div>
          </div>
        </div>
      </section>

      {/* Zakat Projects Section - Full Viewport Height */}
      <section className="h-[calc(100vh-90px)] bg-[#F8F8F8] flex">
        <div className="max-w-[1440px] w-full mx-auto px-20 my-auto">
          <div className="flex flex-col">
            <h2 className="text-[36px] font-semibold text-[#232323] mb-12 leading-tight">
              Unsere Zakat Projekte
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[...Array(4)].map((_, i) => (
                <ProjectCard key={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="h-[calc(100vh-90px)] flex">
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
    </>
  )
}