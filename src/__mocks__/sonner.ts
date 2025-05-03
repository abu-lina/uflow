import { vi } from 'vitest';

export const toast = vi.fn();

const sonner = {
  toast,
};

export default sonner;
