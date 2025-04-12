import { baseMetadata } from '@/config/metadata';
import { Metadata } from 'next';

// Create specialized metadata for the offline page
const metadata: Metadata = {
  ...baseMetadata,
  title: 'You\'re Offline | Ummah Flow',
  description: 'You are currently offline. Some features may be unavailable.',
  robots: {
    index: false,
    follow: false,
  },
};

export default metadata; 