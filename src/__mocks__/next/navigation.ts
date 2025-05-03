import { vi } from 'vitest';

export const useRouter = vi.fn().mockReturnValue({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
});

export const usePathname = vi.fn().mockReturnValue('/');
