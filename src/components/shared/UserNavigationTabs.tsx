'use client';


import { Icon } from '@iconify/react';

import { HeartIcon } from '@/components/ui/icons/HeartIcon';

// Types
export type UserTab = 'saved' | 'created' | 'create';

export interface UserNavigationTabsProps {
  /** Currently active tab */
  activeTab: UserTab;
  /** Callback when tab changes */
  onTabChange: (tab: UserTab) => void;
  /** Optional callback for editing profile */
  onEditProfile?: () => void;
}

// Constants
const BUTTON_STYLES = {
  base: 'flex h-10 items-center justify-center rounded-xl transition-colors',
  active: 'bg-primary text-white',
  inactive: 'hover:bg-gray-100 text-text-secondary',
  icon: 'size-6',
  text: 'font-inter-tight text-base font-medium',
} as const;


export function UserNavigationTabs({
  activeTab,
  onTabChange,
  onEditProfile,
}: UserNavigationTabsProps) {
  return (
    <div
      aria-label="User navigation"
      className="box-border flex h-14 flex-row items-center justify-start rounded-[16.8px] border border-[#D4D4D4] bg-white px-2 backdrop-blur-sm"
      role="tablist"
      style={{
        position: 'sticky',
        top: '120px',
        zIndex: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
      }}
    >
      {/* Saved Tab */}
      <button
        aria-label="Gespeicherte Provider anzeigen"
        aria-selected={activeTab === 'saved'}
        className={`${BUTTON_STYLES.base} ${activeTab === 'saved' ? 'w-auto px-3' : 'w-11'} ${
          activeTab === 'saved' ? BUTTON_STYLES.active : BUTTON_STYLES.inactive
        }`}
        role="tab"
        onClick={() => onTabChange('saved')}
      >
        <HeartIcon
          className={`${BUTTON_STYLES.icon} ${
            activeTab === 'saved' ? 'text-white' : 'text-text-secondary'
          }`}
          isActive={activeTab === 'saved'}
        />
        {activeTab === 'saved' && (
          <span className={`${BUTTON_STYLES.text} ml-1.5`}>Gespeichert</span>
        )}
      </button>

      {/* Created Tab */}
      <button
        aria-label="Erstellte Provider anzeigen"
        aria-selected={activeTab === 'created'}
        className={`${BUTTON_STYLES.base} ${activeTab === 'created' ? 'w-auto px-3' : 'w-11'} ${
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
        {activeTab === 'created' && (
          <span className={`${BUTTON_STYLES.text} ml-1.5`}>Erstellt</span>
        )}
      </button>

      {/* Create Provider Button */}
      <button
        aria-label="Neuen Provider erstellen"
        aria-selected={activeTab === 'create'}
        className={`${BUTTON_STYLES.base} ${activeTab === 'create' ? 'w-auto px-3' : 'w-11'} ${
          activeTab === 'create' ? BUTTON_STYLES.active : BUTTON_STYLES.inactive
        }`}
        role="tab"
        onClick={() => onTabChange('create')}
      >
        <Icon
          className={`${BUTTON_STYLES.icon} ${
            activeTab === 'create' ? 'text-white' : 'text-text-secondary'
          }`}
          icon="ic:round-plus"
        />
        {activeTab === 'create' && (
          <span className={`${BUTTON_STYLES.text} ml-1.5`}>Erstellen</span>
        )}
      </button>

      {/* Edit Profile Button */}
      <button
        aria-label="Profil bearbeiten"
        className={`${BUTTON_STYLES.base} w-11 ${BUTTON_STYLES.inactive}`}
        onClick={onEditProfile}
      >
        <Icon
          className={`${BUTTON_STYLES.icon} text-text-secondary`}
          icon="tabler:user-edit"
        />
      </button>
    </div>
  );
}
