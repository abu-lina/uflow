'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { CounterTrailing } from '@/components/ui/CounterTrailing';
import { RowItem } from '@/components/ui/RowItem';

export type AudienceKey = 'maenner' | 'frauen' | 'kinder';

type AudienceCounts = Record<AudienceKey, number>;

export interface WerAudienceSelectionChange {
  counts: AudienceCounts;
  summary: string;
  hasSelection: boolean;
  hasUserInteracted: boolean;
}

interface WerAudienceFilterProps {
  t: (key: string, variables?: Record<string, string | number>) => string;
  onSelectionChange?: (selection: WerAudienceSelectionChange) => void;
  resetSignal?: number;
}

interface AudienceItem {
  key: AudienceKey;
  labelKey: string;
  bgClass: string;
  iconKind: 'maenner' | 'frauen' | 'kinder';
}

const AUDIENCES: AudienceItem[] = [
  {
    key: 'maenner',
    labelKey: 'suchen.wer.maennerLabel',
    bgClass: 'bg-[#e3f2ef]',
    // TODO: Replace with Figma SVG asset for men icon when MCP asset export is available.
    iconKind: 'maenner',
  },
  {
    key: 'frauen',
    labelKey: 'suchen.wer.frauenLabel',
    bgClass: 'bg-[#fae6e6]',
    // TODO: Replace with Figma SVG asset for women icon when MCP asset export is available.
    iconKind: 'frauen',
  },
  {
    key: 'kinder',
    labelKey: 'suchen.wer.kinderLabel',
    bgClass: 'bg-[#fae6e6]',
    // TODO: Replace with Figma SVG asset for child icon when MCP asset export is available.
    iconKind: 'kinder',
  },
];

function AudienceIcon({ kind }: { kind: 'maenner' | 'frauen' | 'kinder' }) {

  if (kind === 'maenner') {
    return (
      <Image
        alt=""
        aria-hidden={true}
        className="size-8"
        height={32}
        src="/icons/audience/maenner.svg"
        width={32}
      />
    );
  }

  if (kind === 'frauen') {
    return (
      <Image
        alt=""
        aria-hidden={true}
        className="size-8"
        height={32}
        src="/icons/audience/frauen.svg"
        width={32}
      />
    );
  }

  if (kind === 'kinder') {
    return (
      <Image
        alt=""
        aria-hidden={true}
        className="size-8"
        height={32}
        src="/icons/audience/kinder.svg"
        width={32}
      />
    );
  }

  return null;
}

const DEFAULT_COUNTS: AudienceCounts = {
  maenner: 1,
  frauen: 0,
  kinder: 0,
};

export function WerAudienceFilter({ t, onSelectionChange, resetSignal }: WerAudienceFilterProps) {
  const [counts, setCounts] = useState<AudienceCounts>({
    ...DEFAULT_COUNTS,
  });
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  useEffect(() => {
    setCounts(DEFAULT_COUNTS);
    setHasUserInteracted(false);
  }, [resetSignal]);

  const selectedAudienceSummary = AUDIENCES
    .filter(({ key }) => counts[key] > 0)
    .map(({ labelKey }) => t(labelKey))
    .join(', ');
  const hasSelection = selectedAudienceSummary.length > 0;
  const totalSelected = Object.values(counts).reduce((sum, count) => sum + count, 0);

  useEffect(() => {
    onSelectionChange?.({
      counts,
      summary: selectedAudienceSummary,
      hasSelection,
      hasUserInteracted,
    });
  }, [counts, hasSelection, hasUserInteracted, onSelectionChange, selectedAudienceSummary]);

  return (
    <div className="mt-4 space-y-4">
      {AUDIENCES.map(({ key, labelKey, bgClass, iconKind }) => {
        const label = t(labelKey);
        const canDecrement = counts[key] > 0 && !(counts[key] === 1 && totalSelected === 1);

        return (
          <RowItem
            key={key}
            icon={
              <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${bgClass}`}>
                <AudienceIcon kind={iconKind} />
              </div>
            }
            selectable={false}
            subtitle={t('suchen.wer.subtitle')}
            title={label}
            trailing={
              <CounterTrailing
                decrementAriaLabel={t('suchen.wer.decrementAriaLabel', { audience: label })}
                incrementAriaLabel={t('suchen.wer.incrementAriaLabel', { audience: label })}
                min={canDecrement ? 0 : counts[key]}
                value={counts[key]}
                onDecrement={() => {
                  setHasUserInteracted(true);
                  setCounts((prev) => {
                    const currentValue = prev[key];
                    const selectedTotal = Object.values(prev).reduce((sum, value) => sum + value, 0);

                    if (currentValue === 0 || (currentValue === 1 && selectedTotal === 1)) {
                      return prev;
                    }

                    return {
                      ...prev,
                      [key]: currentValue - 1,
                    };
                  });
                }}
                onIncrement={() => {
                  setHasUserInteracted(true);
                  setCounts((prev) => ({
                    ...prev,
                    [key]: prev[key] + 1,
                  }));
                }}
              />
            }
          />
        );
      })}
    </div>
  );
}
