import { OwnerDecisionContent } from './OwnerDecisionContent';
import { getWhatsAppContactUrl } from '@/services/email/outreachEmail';

export const metadata = {
  title: 'Ihr Eintrag | Ummah Flow',
  description: 'Verwalten Sie Ihren Eintrag auf Ummah Flow',
};

export default function OwnerDecisionPage() {
  const whatsappUrl = getWhatsAppContactUrl();
  return <OwnerDecisionContent whatsappUrl={whatsappUrl} />;
}
