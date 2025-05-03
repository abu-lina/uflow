import { vi } from 'vitest';

type ZodSchema = {
  parse: ReturnType<typeof vi.fn>;
  email?: () => ZodSchema;
  min?: () => ZodSchema;
  max?: () => ZodSchema;
  shape?: (shape: ZodShape) => ZodSchema;
  extend?: (extension: ZodShape) => ZodSchema;
  refine?: (validator: (data: unknown) => boolean) => ZodSchema;
};

type ZodShape = Record<string, ZodSchema>;

const stringFn = () => ({
  email: () => stringFn(),
  min: () => stringFn(),
  max: () => stringFn(),
  parse: vi.fn(),
});

const objectFn = (schema: ZodShape = {}) => ({
  shape: (shape: ZodShape) => objectFn(shape),
  extend: (extension: ZodShape) => objectFn({ ...schema, ...extension }),
  parse: vi.fn(),
  refine: (_validator: (data: unknown) => boolean) => objectFn(schema),
});

export const z = {
  string: stringFn,
  object: objectFn,
};

export default {
  z,
}; 