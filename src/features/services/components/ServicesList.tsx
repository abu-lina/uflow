import { Service } from "@/types/service"
import ServiceCard from "./ServiceCard"

interface ServicesListProps {
  services: Service[]
}

export default function ServicesList({ services }: ServicesListProps) {
  if (!services?.length) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Keine Dienstleistungen gefunden.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} />
      ))}
    </div>
  )
} 