'use client';

import { useLanguage } from '@/providers/LanguageProvider';
import { cn } from '@/lib/utils';

export type HalalAttestationField = 'no_alcohol' | 'no_pork' | 'no_gambling';

/**
 * Tri-state answer for one halal attestation question (#415):
 *   true  = "yes"      -> attested
 *   false = "no"       -> submitter declares non-compliance
 *   null  = "not sure" -> unknown, needs verification
 */
export type HalalAttestationAnswer = boolean | null;

export type HalalAttestationValues = Record<HalalAttestationField, HalalAttestationAnswer>;

interface HalalAttestationFieldsProps {
  values: HalalAttestationValues;
  onChange: (field: HalalAttestationField, value: HalalAttestationAnswer) => void;
}

const FIELDS: Array<{ key: HalalAttestationField; labelKey: string; descKey: string }> = [
  {
    key: 'no_alcohol',
    labelKey: 'halal.attestation.noAlcohol.label',
    descKey: 'halal.attestation.noAlcohol.desc',
  },
  {
    key: 'no_pork',
    labelKey: 'halal.attestation.noPork.label',
    descKey: 'halal.attestation.noPork.desc',
  },
  {
    key: 'no_gambling',
    labelKey: 'halal.attestation.noGambling.label',
    descKey: 'halal.attestation.noGambling.desc',
  },
];

const OPTIONS: Array<{ value: HalalAttestationAnswer; labelKey: string }> = [
  { value: true, labelKey: 'halal.attestation.answer.yes' },
  { value: false, labelKey: 'halal.attestation.answer.no' },
  { value: null, labelKey: 'halal.attestation.answer.notSure' },
];

/**
 * Shared tri-state halal attestation questions (#415).
 * Used by the owner create wizard (create/halal) and the recommend form so
 * both flows ask and store the same answers (yes/no/not sure -> true/false/NULL).
 */
export function HalalAttestationFields({ values, onChange }: HalalAttestationFieldsProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-3">
      {FIELDS.map((item) => (
        <div
          key={item.key}
          className="flex flex-col gap-3 rounded-2xl border-2 border-[#E5E5E5] bg-white px-4 py-4"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-[#272727]">{t(item.labelKey)}</span>
            <span className="text-xs leading-relaxed text-[#7A7A7A]">{t(item.descKey)}</span>
          </div>
          <div className="flex gap-2" role="radiogroup">
            {OPTIONS.map((opt) => {
              const selected = values[item.key] === opt.value;
              return (
                <button
                  key={opt.labelKey}
                  aria-checked={selected}
                  className={cn(
                    'flex-1 rounded-full border px-3 py-2 text-xs font-semibold transition-colors',
                    selected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-[#D4D4D4] bg-white text-[#7A7A7A] hover:border-[#999999]',
                  )}
                  role="radio"
                  type="button"
                  onClick={() => onChange(item.key, opt.value)}
                >
                  {t(opt.labelKey)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
