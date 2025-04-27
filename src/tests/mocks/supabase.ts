import { createClient } from '@supabase/supabase-js';
import { jest } from '@jest/globals';

// Mock Supabase client
export const createSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
};

// Mock Supabase auth
export const mockAuth = {
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChange: jest.fn(),
  getSession: jest.fn(),
  getUser: jest.fn(),
};

// Mock Supabase database
export const mockDatabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  execute: jest.fn(),
};

// Mock Supabase storage
export const mockStorage = {
  from: jest.fn().mockReturnThis(),
  upload: jest.fn(),
  download: jest.fn(),
  getPublicUrl: jest.fn(),
  remove: jest.fn(),
};

// Mock Supabase client
export const mockSupabaseClient = {
  auth: {
    signIn: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  textSearch: jest.fn().mockReturnThis(),
  single: jest.fn(),
  maybeSingle: jest.fn(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  count: jest.fn(),
  error: null,
  data: [],
};

// Reset all mocks
export const resetMocks = () => {
  Object.values(mockAuth).forEach((mock) => mock.mockReset());
  Object.values(mockDatabase).forEach((mock) => mock.mockReset());
  Object.values(mockStorage).forEach((mock) => mock.mockReset());
};
