import Image from "next/image"
import { Globe, Phone, TwitterIcon as TikTok, Instagram, Heart } from "lucide-react"
import Link from "next/link"

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
                <Image src="/placeholder.svg?height=30&width=100" alt="Decorative element" width={100} height={30} />
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
                <Image src="/placeholder.svg?height=30&width=100" alt="Decorative element" width={100} height={30} />
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

      {/* Second Projects Section */}
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
            <Image
              src="/placeholder.svg?height=200&width=200"
              alt="Ummah Flow Logo"
              width={200}
              height={200}
              className="text-white"
            />
          </div>
        </div>
      </section>
    </main>
  )
}

function ProjectCard() {
  return (
    <div className="border border-gray-light rounded-lg overflow-hidden">
      <div className="relative">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Projects.png-VhIRVamfOZQyzuW5LvZtyMZQlCUf26.jpeg"
          alt="Project Image"
          width={300}
          height={200}
          className="w-full h-48 object-cover"
        />
        <button className="absolute top-2 right-2 bg-white p-1 rounded-full">
          <Heart className="h-5 w-5 text-gray-medium" />
        </button>
        <div className="absolute bottom-2 left-2 bg-white px-2 py-1 rounded-md text-xs font-medium">Zakat</div>
      </div>
      <div className="p-4">
        <h3 className="font-medium text-dark">Wüstenkind e.V.</h3>
        <p className="text-xs text-gray-medium">Helfen spüren</p>
        <div className="flex flex-wrap gap-1 mt-2">
          <span className="text-xs bg-gray-light bg-opacity-30 px-2 py-0.5 rounded-full">Waisen</span>
          <span className="text-xs bg-gray-light bg-opacity-30 px-2 py-0.5 rounded-full">Bangladesch</span>
          <span className="text-xs bg-gray-light bg-opacity-30 px-2 py-0.5 rounded-full">Afghanistan</span>
          <button className="text-xs bg-gray-light bg-opacity-30 px-2 py-0.5 rounded-full">+</button>
        </div>
        <div className="flex justify-between mt-4">
          <button className="p-1">
            <Globe className="h-5 w-5 text-gray-medium" />
          </button>
          <button className="p-1">
            <Phone className="h-5 w-5 text-gray-medium" />
          </button>
          <button className="p-1">
            <TikTok className="h-5 w-5 text-gray-medium" />
          </button>
          <button className="p-1">
            <Instagram className="h-5 w-5 text-gray-medium" />
          </button>
        </div>
      </div>
    </div>
  )
}