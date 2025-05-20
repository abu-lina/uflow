'use client';

import { Icon } from '@iconify/react';

// Types
export type UserTab = 'saved' | 'created';

export interface UserNavigationTabsProps {
  /** Currently active tab */
  activeTab: UserTab;
  /** Callback when tab changes */
  onTabChange: (tab: UserTab) => void;
  /** Optional callback for creating new souk */
  onCreateSouk?: () => void;
  /** Optional callback for editing profile */
  onEditProfile?: () => void;
}

// Constants
const BUTTON_STYLES = {
  base: 'flex h-10 items-center justify-center rounded-xl transition-colors',
  active: 'bg-primary text-white',
  inactive: 'hover:bg-gray-100 text-text-secondary',
  icon: 'size-5',
  text: 'font-inter-tight text-base font-medium',
} as const;

export function UserNavigationTabs({
  activeTab,
  onTabChange,
  onCreateSouk,
  onEditProfile,
}: UserNavigationTabsProps) {
  return (
    <div
      aria-label="User navigation"
      className="box-border flex h-14 w-[285px] flex-row items-center justify-between rounded-[16.8px] border border-[#D4D4D4] bg-white px-2"
      role="tablist"
    >
      {/* Saved Tab */}
      <button
        aria-label="Gespeicherte Souks anzeigen"
        aria-selected={activeTab === 'saved'}
        className={`${BUTTON_STYLES.base} w-[137px] gap-1.5 ${
          activeTab === 'saved' ? BUTTON_STYLES.active : BUTTON_STYLES.inactive
        }`}
        role="tab"
        onClick={() => onTabChange('saved')}
      >
        <Icon
          className={`${BUTTON_STYLES.icon} ${
            activeTab === 'saved' ? 'text-white' : 'text-text-secondary'
          }`}
          icon="iconamoon:heart"
        />
        <span className={BUTTON_STYLES.text}>Merken</span>
      </button>

      {/* Created Tab */}
      <button
        aria-label="Erstellte Souks anzeigen"
        aria-selected={activeTab === 'created'}
        className={`${BUTTON_STYLES.base} w-11 ${
          activeTab === 'created' ? BUTTON_STYLES.active : BUTTON_STYLES.inactive
        }`}
        role="tab"
        onClick={() => onTabChange('created')}
      >
        <Icon
          className={`${BUTTON_STYLES.icon} ${
            activeTab === 'created' ? 'text-white' : 'text-text-secondary'
          }`}
          icon="mynaui:store"
        />
      </button>

      {/* Create Souk Button */}
      <button
        aria-label="Neuen Souk erstellen"
        className={`${BUTTON_STYLES.base} w-11 ${BUTTON_STYLES.inactive}`}
        onClick={onCreateSouk}
      >
        <Icon className={`${BUTTON_STYLES.icon} text-text-secondary`} icon="ic:round-plus" />
      </button>

      {/* Edit Profile Button */}
      <button
        aria-label="Profil bearbeiten"
        className={`${BUTTON_STYLES.base} w-11 ${BUTTON_STYLES.inactive}`}
        onClick={onEditProfile}
      >
        <Icon className={`${BUTTON_STYLES.icon} text-text-secondary`} icon="tabler:user-edit" />
      </button>
    </div>
  );
}
