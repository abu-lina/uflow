import Link from "next/link"
import ProjectCard from "@/components/ui/ProjectCard"
import Placeholder from "@/components/ui/Placeholder"

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="flex flex-col md:flex-row items-center justify-between px-4 py-12 md:px-12 md:py-16">
        <div className="md:w-1/2 space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-dark">
            Von Muslimen
            <br />
            für Muslime.
          </h1>
          <p className="text-gray-dark max-w-md">
            Der erste halal-konforme Marktplatz der sicherstellt, das jeder Anbieter die Zakat entrichtet.
          </p>
          <Link href="/about" className="inline-block bg-primary text-white px-4 py-2 rounded-md text-sm">
            Entdecke deine Ummah!
          </Link>
        </div>
        <div className="md:w-1/2 mt-8 md:mt-0">
          <div className="bg-secondary rounded-3xl p-8 relative">
            <div className="bg-[#dbf7f4] rounded-2xl p-6 relative">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <Placeholder width={100} height={30} />
              </div>
              <div className="text-center space-y-4">
                <h2 className="text-xl font-medium">
                  Viele Muslime
                  <br />
                  <span className="text-white">aber</span> wenig Gemeinschaft
                </h2>
                <p className="text-dark italic">
                  &quote;Es wird eine Zeit kommen, in der die Muslime viele sein werden, doch ihr Zusammenhalt wird so schwach
                  sein wie der Schaum des Meeres.&quote;
                </p>
                <p className="text-sm">-Der Prophet Mohammed ﷺ, Sahih Muslim</p>
              </div>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
                <Placeholder width={100} height={30} />
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-8 space-x-2">
            <div className="h-2 w-2 rounded-full bg-primary"></div>
            <div className="h-2 w-2 rounded-full bg-gray-light"></div>
            <div className="h-2 w-2 rounded-full bg-gray-light"></div>
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section className="px-4 py-8 md:px-12 md:py-12">
        <h2 className="text-3xl font-bold text-dark mb-8">Unsere Zakat Projekte</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <ProjectCard key={i} />
          ))}
        </div>
      </section>

      {/* About Section */}
      <section className="px-4 py-12 md:px-12 md:py-16 flex flex-col md:flex-row items-center justify-between">
        <div className="md:w-1/2 space-y-6">
          <p className="text-sm text-gray-medium">Über Uns</p>
          <h2 className="text-3xl font-bold text-dark">
            Wer steckt hinter
            <br />
            Ummah Flow?
          </h2>
          <div className="space-y-4 max-w-lg">
            <p className="text-gray-dark">
              Ummah Flow ist mehr als nur ein Marktplatz – es ist eine Bewegung. Wir verbinden die muslimische Community
              mit nachhaltigen, ethischen und halal-konformen Produkten und Dienstleistungen. Unser Ziel ist es, eine
              Platform zu schaffen, auf der muslimische Unternehmer, Kreative und Dienstleister ihre Angebote einer
              engagierten Gemeinschaft präsentieren können.
            </p>
            <p className="text-gray-dark">
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

