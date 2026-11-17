// ---------------------------------------------------------------------------
// Tier derivation – shared module (no 'use client') so both server and client
// code can import it without crossing the React Server Component boundary.
// ---------------------------------------------------------------------------

export function computeSealTier(
  verificationMethod: 'online' | 'onsite' | null | undefined,
  hasCertificate: boolean | null | undefined,
  attestation?: {
    noAlcohol?: boolean | null;
    noPork?: boolean | null;
    noGambling?: boolean | null;
  },
  certificateUrl?: string | null,
): 'bronze' | 'silver' | 'gold' | null {
  // AC6.8: gold requires an actual certificate on file. A bare has_certificate
  // toggle (upload failed, legacy row, self-declared) must not produce gold.
  const certified = Boolean(hasCertificate) && Boolean(certificateUrl);
  if (certified) return 'gold';
  if (!verificationMethod) return null;
  // Require at least one attestation answer before awarding a tier.
  // Without this, a provider with verification_method set as a DB default
  // (but no actual halal check done) would auto-show as bronze.
  if (attestation) {
    const hasAttestation =
      Boolean(attestation.noAlcohol) ||
      Boolean(attestation.noPork) ||
      Boolean(attestation.noGambling);
    if (!hasAttestation) return null;
  }
  if (verificationMethod === 'onsite') return 'silver';
  return 'bronze';
}
