'use client';

import { Icon } from '@iconify/react';

import { LucideHeart } from '@/components/ui/icons/LucideHeart';

// Types
export type UserTab = 'saved' | 'created' | 'recommendations' | 'create' | 'profile';

export interface UserNavigationTabsProps {
  /** Currently active tab */
  activeTab: UserTab;
  /** Callback when tab changes */
  onTabChange: (tab: UserTab) => void;
}

// Constants
const BUTTON_STYLES = {
  base: 'flex h-10 items-center justify-center rounded-xl transition-colors',
  active: 'bg-primary text-white',
  inactive: 'hover:bg-neutral-100 text-text-secondary',
  icon: 'size-6',
  text: 'font-inter-tight text-base font-medium',
} as const;


export function UserNavigationTabs({
  activeTab,
  onTabChange,
}: UserNavigationTabsProps) {
  return (
    <div
      aria-label="User navigation"
      className="box-border flex h-14 flex-row items-center justify-start rounded-[16.8px] border border-border bg-background px-2 backdrop-blur-sm"
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
        <LucideHeart
          className={`${BUTTON_STYLES.icon} ${
            activeTab === 'saved' ? 'text-white' : 'text-text-secondary'
          }`}
          filled={activeTab === 'saved'}
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

      {/* Recommendations Tab */}
      <button
        aria-label="Empfehlungen anzeigen"
        aria-selected={activeTab === 'recommendations'}
        className={`${BUTTON_STYLES.base} ${activeTab === 'recommendations' ? 'w-auto px-3' : 'w-11'} ${
          activeTab === 'recommendations' ? BUTTON_STYLES.active : BUTTON_STYLES.inactive
        }`}
        role="tab"
        onClick={() => onTabChange('recommendations')}
      >
        <Icon
          className={`${BUTTON_STYLES.icon} ${
            activeTab === 'recommendations' ? 'text-white' : 'text-text-secondary'
          }`}
          icon="mdi:star-outline"
        />
        {activeTab === 'recommendations' && (
          <span className={`${BUTTON_STYLES.text} ml-1.5`}>Empfehlungen</span>
        )}
      </button>

      {/* Edit Profile Tab */}
      <button
        aria-label="Profil bearbeiten"
        aria-selected={activeTab === 'profile'}
        className={`${BUTTON_STYLES.base} ${activeTab === 'profile' ? 'w-auto px-3' : 'w-11'} ${
          activeTab === 'profile' ? BUTTON_STYLES.active : BUTTON_STYLES.inactive
        }`}
        role="tab"
        onClick={() => onTabChange('profile')}
      >
        <Icon
          className={`${BUTTON_STYLES.icon} ${
            activeTab === 'profile' ? 'text-white' : 'text-text-secondary'
          }`}
          icon="tabler:user-edit"
        />
        {activeTab === 'profile' && (
          <span className={`${BUTTON_STYLES.text} ml-1.5`}>Profil</span>
        )}
      </button>
    </div>
  );
}
