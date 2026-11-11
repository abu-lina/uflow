-- Allow anonymous/public reads of food_providers so the ProofTierCard
-- can fetch certificate_url and attestation fields without auth.
CREATE POLICY "Allow public read on food_providers"
  ON public.food_providers FOR SELECT USING (true);
