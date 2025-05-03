import { vi } from 'vitest';

const mockParse = vi.fn().mockReturnValue({
  email: 'test@example.com',
  password: 'password123',
});

const stringValidator = {
  min: () => stringValidator,
  max: () => stringValidator,
  email: () => stringValidator,
  parse: mockParse,
};

const objectValidator = {
  shape: {
    email: stringValidator,
    password: stringValidator,
    confirmPassword: stringValidator,
  },
  parse: mockParse,
  extend: () => objectValidator,
  refine: () => objectValidator,
};

export const z = {
  object: () => objectValidator,
  string: () => stringValidator,
  ZodError: class extends Error {
    errors = [{ path: [], message: 'Mock error' }];
  },
};
