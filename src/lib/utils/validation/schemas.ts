/**
 * @fileoverview Zod schemas for data validation
 * @module utils/validation/schemas
 */

import { z } from 'zod';

// Common schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const searchSchema = z.object({
  search: z.string().optional(),
  sort: z.enum(['asc', 'desc']).optional(),
});

// Souk schemas
export const soukSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().min(1).max(1000),
  category: z.string().min(1),
  location: z.string().min(1),
  imageUrl: z.string().url().optional(),
});

export const soukQuerySchema = paginationSchema.merge(searchSchema).extend({
  category: z.string().optional(),
});

// Offer schemas
export const offerSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1).max(1000),
  price: z.number().min(0),
  currency: z.string().min(1).max(3),
  soukId: z.string().uuid(),
});

export const offerQuerySchema = paginationSchema.merge(searchSchema).extend({
  soukId: z.string().uuid().optional(),
});

// Validation utility
export const validateRequest = async <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; error: string }> => {
  try {
    const validatedData = await schema.parseAsync(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(err => err.message).join(', '),
      };
    }
    return { success: false, error: 'Invalid request data' };
  }
}; 