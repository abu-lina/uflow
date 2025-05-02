import { createClient } from '@supabase/supabase-js';

const mockSupabase = createClient('http://localhost:54321', 'test-anon-key');

export default mockSupabase;
