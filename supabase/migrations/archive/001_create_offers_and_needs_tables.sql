-- Add unique constraint to offers table
ALTER TABLE offers ADD CONSTRAINT offers_name_de_unique UNIQUE (name_de);

-- Add unique constraint to needs table  
ALTER TABLE needs ADD CONSTRAINT needs_name_de_unique UNIQUE (name_de);

-- Add foreign key columns to providers table for offers and needs
-- Using arrays to support multiple selections
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS offers_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS needs_ids UUID[] DEFAULT '{}';

-- Add indexes for better performance on array columns
CREATE INDEX IF NOT EXISTS idx_providers_offers_ids ON providers USING GIN (offers_ids);
CREATE INDEX IF NOT EXISTS idx_providers_needs_ids ON providers USING GIN (needs_ids);

-- Insert some sample offers
INSERT INTO offers (name_de, name_en) VALUES 
  ('Beratung', 'Consultation'),
  ('Coaching', 'Coaching'),
  ('Kurse', 'Courses'),
  ('Workshops', 'Workshops'),
  ('Mentoring', 'Mentoring'),
  ('Networking', 'Networking'),
  ('Support', 'Support'),
  ('Training', 'Training'),
  ('Seminare', 'Seminars'),
  ('Webinare', 'Webinars')
ON CONFLICT (name_de) DO NOTHING;

-- Insert some sample needs
INSERT INTO needs (name_de, name_en) VALUES 
  ('Beratung', 'Consultation'),
  ('Coaching', 'Coaching'),
  ('Kurse', 'Courses'),
  ('Workshops', 'Workshops'),
  ('Mentoring', 'Mentoring'),
  ('Networking', 'Networking'),
  ('Support', 'Support'),
  ('Training', 'Training'),
  ('Seminare', 'Seminars'),
  ('Webinare', 'Webinars')
ON CONFLICT (name_de) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE needs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for offers (public read, authenticated write)
CREATE POLICY "Offers are viewable by everyone" ON offers FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert offers" ON offers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update offers" ON offers FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete offers" ON offers FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for needs (public read, authenticated write)
CREATE POLICY "Needs are viewable by everyone" ON needs FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert needs" ON needs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update needs" ON needs FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete needs" ON needs FOR DELETE USING (auth.role() = 'authenticated');
