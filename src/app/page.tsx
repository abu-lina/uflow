import Link from "next/link"
import ProjectCard from "@/components/ui/ProjectCard"
import Placeholder from "@/components/ui/Placeholder"
import QuoteCard from "@/components/ui/QuoteCard"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="min-h-screen bg-white px-20">
      {/* Hero Section */}
      <section className="flex flex-col md:flex-row items-center justify-between py-12 md:py-16">
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
        <div className="md:w-1/2 mt-8 md:mt-0">
          <QuoteCard
            className="w-full h-[400px]"
            quote="Es wird eine Zeit kommen, in der die Muslime viele sein werden, doch ihr Zusammenhalt wird so schwach sein wie der Schaum des Meeres."
            attribution="-Der Prophet Mohammed ﷺ, Sahih Muslim"
          />
        </div>
      </section>

      {/* Projects Section */}
      <section className="py-8 md:py-12">
        <h2 className="text-[36px] font-semibold text-[#232323] mb-8 leading-tight">Unsere Zakat Projekte</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <ProjectCard key={i} />
          ))}
        </div>
      </section>

      {/* About Section */}
      <section className="py-12 md:py-16 flex flex-col md:flex-row items-center justify-between">
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
        <div className="md:w-1/2 flex justify-center mt-8 md:mt-0">
          <div className="bg-primary rounded-full p-16 relative">
            <Placeholder width={200} height={200} className="text-white" />
          </div>
        </div>
      </section>
    </main>
  )
}

