'use client';

import { ProfileContent } from './ProfileContent';

export default function ProfilePage() {
  // Let client-side auth decide and redirect
  return <ProfileContent user={null} />;
}
