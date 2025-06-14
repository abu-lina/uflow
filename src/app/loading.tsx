import { Logo } from '@/components/ui/Logo';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white">
      <Logo className="size-12 text-primary" />
      <div className="size-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
    </div>
  );
}
