import Link from "next/link"
import { ProjectCard } from "@/components/core/card/project-card"
import Placeholder from "@/components/core/feedback/Placeholder"
import { QuoteCard } from "@/components/core/card/QuoteCard"
import { Button } from "@/components/core/button/button"
import { Basmala } from "@/components/core/visuals/basmala"
import Header from "@/components/core/layout/header"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="relative pt-20">
        {/* Hero Section */}
        <section className="min-h-[calc(100vh-5rem)] flex items-center py-16 md:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
              <div className="w-full md:w-1/2 space-y-8">
                <div className="w-full max-w-[240px] mx-auto md:mx-0">
                  <Basmala size="lg" />
                </div>
                <h1 className="text-4xl md:text-6xl lg:text-[78px] font-normal tracking-tight leading-[1.1] text-foreground text-center md:text-left">
                  Von Muslimen
                  <br />
                  für Muslime.
                </h1>
                <p className="text-lg md:text-2xl lg:text-[26px] text-muted-foreground max-w-xl leading-normal text-center md:text-left">
                  Der erste halal-konforme Marktplatz der sicherstellt, das jeder Anbieter die Zakat entrichtet.
                </p>
                <div className="flex justify-center md:justify-start">
                  <Link href="/about">
                    <Button variant="primary" size="lg" className="text-lg px-8 py-6">
                      Entdecke deine Ummah!
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="w-full md:w-1/2">
                <QuoteCard className="w-full aspect-square md:aspect-[4/3] max-w-2xl mx-auto" />
              </div>
            </div>
          </div>
        </section>

        {/* Zakat Projects Section */}
        <section className="py-16 md:py-24 bg-muted">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="space-y-12">
              <h2 className="text-3xl md:text-4xl lg:text-[36px] font-semibold text-foreground leading-tight text-center md:text-left">
                Unsere Zakat Projekte
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                {[...Array(4)].map((_, i) => (
                  <ProjectCard key={i} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
              <div className="w-full md:w-1/2 space-y-8">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground font-medium">Über Uns</p>
                  <h2 className="text-3xl md:text-4xl lg:text-[36px] font-semibold text-foreground leading-tight">
                    Wer steckt hinter
                    <br />
                    Ummah Flow?
                  </h2>
                </div>
                <div className="space-y-6 text-lg md:text-xl lg:text-2xl text-muted-foreground leading-relaxed">
                  <p>
                    Ummah Flow ist mehr als nur ein Marktplatz – es ist eine Bewegung. Wir verbinden die muslimische Community
                    mit nachhaltigen, ethischen und halal-konformen Produkten und Dienstleistungen. Unser Ziel ist es, eine
                    Platform zu schaffen, auf der muslimische Unternehmer, Kreative und Dienstleister ihre Angebote einer
                    engagierten Gemeinschaft präsentieren können.
                  </p>
                  <p>
                    Wir glauben an faire Wirtschaft, gegenseitige Unterstützung und ein starkes Netzwerk, das islamische Werte
                    lebt. Ummah Flow steht für Vertrauen, Qualität und Innovation – damit du Produkte und Dienstleistungen
                    findest, die zu deinem Lebensstil passen. Schließe dich uns an und werde Teil der Ummah Flow Community!
                  </p>
                </div>
              </div>
              <div className="w-full md:w-1/2 flex justify-center">
                <div className="bg-primary rounded-full p-12 md:p-20 relative">
                  <Placeholder width={300} height={300} className="text-primary-foreground" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}