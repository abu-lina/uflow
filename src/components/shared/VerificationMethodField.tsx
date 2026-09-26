'use client';

import { useLanguage } from '@/providers/LanguageProvider';

type VerificationMethod = 'online' | 'onsite';

/** Narrows free-form form data to a real verification method; anything else
 *  (empty draft value, chat-provided string) means "unanswered". */
export function toVerificationMethod(
  value: string | null | undefined,
): VerificationMethod | undefined {
  return value === 'online' || value === 'onsite' ? value : undefined;
}

interface VerificationMethodFieldProps {
  value: VerificationMethod | undefined;
  onChange: (value: VerificationMethod | undefined) => void;
}

/**
 * Verification-method selector for recommend/import flows (#415 AC6.1).
 * Neutral framing — a recommender may not know, so the question is optional
 * and tapping the selected option again clears it (unanswered -> no seal,
 * the column's 'online' schema default carries no verification claim).
 */
export function VerificationMethodField({ value, onChange }: VerificationMethodFieldProps) {
  const { t } = useLanguage();

  const options: Array<{ value: VerificationMethod; label: string; desc: string }> = [
    {
      value: 'online',
      label: t('createHalal.methodOnline'),
      desc: t('createHalal.methodOnlineDesc'),
    },
    {
      value: 'onsite',
      label: t('createHalal.methodOnsite'),
      desc: t('createHalal.methodOnsiteDesc'),
    },
  ];

  return (
    <div className="flex flex-col gap-3" role="radiogroup">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            aria-checked={selected}
            className={`flex w-full items-start gap-4 rounded-2xl border-2 px-4 py-4 text-left transition-all ${selected ? 'border-primary bg-primary/5' : 'border-neutral bg-white'}`}
            role="radio"
            type="button"
            onClick={() => onChange(selected ? undefined : opt.value)}
          >
            <div
              className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${selected ? 'border-primary' : 'border-content-muted'}`}
            >
              {selected && <div className="h-3 w-3 rounded-full bg-primary" />}
            </div>
            <div className="flex flex-col gap-0.5">
              <span
                className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-content-heading'}`}
              >
                {opt.label}
              </span>
              <span className="text-xs leading-relaxed text-content-muted">{opt.desc}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
