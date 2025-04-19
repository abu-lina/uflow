import Link from "next/link"
import { Card } from "@/components/ui/card"
import { ServiceListItem } from "../types"

interface ServiceCardProps {
  service: ServiceListItem
}

export default function ServiceCard({ service }: ServiceCardProps) {
  return (
    <Link href={`/services/${service.service_id}`}>
      <Card className="p-4 hover:shadow-lg transition-shadow">
        <h3 className="text-lg font-semibold">{service.service_name}</h3>
        <p className="text-sm text-gray-600 mt-2">{service.service_description}</p>
        <div className="mt-4 flex justify-between items-center">
          <span className="text-primary font-medium">{service.price ? `${service.price}€` : 'Preis auf Anfrage'}</span>
          <span className="text-sm text-gray-500">{service.location || service.address_country}</span>
        </div>
      </Card>
    </Link>
  )
} 