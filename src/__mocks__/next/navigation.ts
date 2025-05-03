import { vi } from 'vitest';

export const useRouter = vi.fn().mockReturnValue({
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
});

export const usePathname = vi.fn().mockReturnValue('/');

export const useSearchParams = vi.fn().mockReturnValue(new URLSearchParams());

export default {
  useRouter,
  usePathname,
  useSearchParams,
}; 