'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

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

function MinusIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3 text-text-muted"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3 text-text-muted"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

interface AudienceRowProps {
  label: string;
  count: number;
  canDecrement: boolean;
  bgClass: string;
  iconKind: 'maenner' | 'frauen' | 'kinder';
  t: (key: string, variables?: Record<string, string | number>) => string;
  onDecrement: () => void;
  onIncrement: () => void;
}

function AudienceRow({
  label,
  count,
  canDecrement,
  bgClass,
  iconKind,
  t,
  onDecrement,
  onIncrement,
}: AudienceRowProps) {
  return (
    <div className="flex w-full items-center gap-4 rounded-[16.8px]">
      <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${bgClass}`}>
        <AudienceIcon kind={iconKind} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-inter-tight text-base leading-none font-semibold text-text-primary">
          {label}
        </p>
        <p className="font-inter-tight text-base font-light leading-none text-text-muted">
          {t('suchen.wer.subtitle')}
        </p>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button
          aria-label={t('suchen.wer.decrementAriaLabel', { audience: label })}
          className="flex size-6 items-center justify-center rounded-full bg-[#e9e9e9] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canDecrement}
          type="button"
          onClick={onDecrement}
        >
          <MinusIcon />
        </button>

        <p className="min-w-[12px] text-center font-inter-tight text-base font-medium text-text-primary">
          {count}
        </p>

        <button
          aria-label={t('suchen.wer.incrementAriaLabel', { audience: label })}
          className="flex size-6 items-center justify-center rounded-full bg-[#e9e9e9]"
          type="button"
          onClick={onIncrement}
        >
          <PlusIcon />
        </button>
      </div>
    </div>
  );
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
          <AudienceRow
            key={key}
            bgClass={bgClass}
            canDecrement={canDecrement}
            count={counts[key]}
            iconKind={iconKind}
            label={label}
            t={t}
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
        );
      })}
    </div>
  );
}
