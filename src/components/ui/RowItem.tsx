import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconListRow } from '@/components/ui/IconListRow';
import { cn } from '@/lib/utils';

interface RowItemBaseProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  ariaLabel?: string;
  selected?: boolean;
  multiSelect?: boolean;
  className?: string;
}

interface RowItemSelectableProps extends RowItemBaseProps {
  selectable: true;
  onSelect: () => void;
}

interface RowItemStaticProps extends RowItemBaseProps {
  selectable?: false;
  onSelect?: never;
}

type RowItemProps = RowItemSelectableProps | RowItemStaticProps;

function RowItemContent({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <p className="truncate font-inter-tight text-base font-semibold text-text-primary">{title}</p>
      {subtitle ? <p className="truncate font-inter text-sm text-text-muted">{subtitle}</p> : null}
    </>
  );
}

function IconWrapper({ icon, selected }: { icon: ReactNode; selected: boolean }) {
  return (
    <div className="relative">
      {icon}
      {selected ? <span className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-primary" /> : null}
      {selected ? (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
          <Check aria-hidden="true" className="h-3 w-3" />
        </span>
      ) : null}
    </div>
  );
}

export function RowItem(props: RowItemProps) {
  const {
    icon,
    title,
    subtitle,
    trailing,
    ariaLabel,
    selected = false,
    multiSelect = false,
    className,
  } = props;

  const iconEl = <IconWrapper icon={icon} selected={Boolean(props.selectable && selected)} />;

  if (props.selectable) {
    return (
      <button
        aria-checked={multiSelect ? selected : undefined}
        aria-label={ariaLabel}
        className={cn('w-full rounded-xl px-2 py-2 text-left', className)}
        role={multiSelect ? 'checkbox' : undefined}
        type="button"
        onClick={props.onSelect}
      >
        <IconListRow icon={iconEl} trailing={trailing}>
          <RowItemContent subtitle={subtitle} title={title} />
        </IconListRow>
      </button>
    );
  }

  return (
    <IconListRow className={cn('px-2 py-2', className)} icon={iconEl} trailing={trailing}>
      <RowItemContent subtitle={subtitle} title={title} />
    </IconListRow>
  );
}
