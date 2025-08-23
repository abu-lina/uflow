import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

import { getSoukById } from '@/services/souks';

// Dynamically import the modal wrapper with SSR disabled
const SoukModalWrapper = dynamic(() => import('./SoukModalWrapper'), { ssr: false });

export default async function SoukDetailPage({ params }: { params: { souk_id: string } }) {
  const souk = await getSoukById(params.souk_id);
  if (!souk) return notFound();

  return <SoukModalWrapper souk={souk} />;
}
