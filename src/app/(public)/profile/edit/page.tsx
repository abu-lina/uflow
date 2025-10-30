'use client';

import { ProfileEditContent } from './ProfileEditContent';

export default function ProfileEditPage() {
  // Let client-side auth decide and redirect
  return <ProfileEditContent user={null} />;
}
