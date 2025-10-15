'use client';

import { useLanguage } from '../hooks/useLanguage';

export const LanguageSwitcher = () => {
  const { language, updateLanguage } = useLanguage();

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => updateLanguage('en')}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          language === 'en'
            ? 'bg-mint text-white'
            : 'text-content hover:text-mint'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => updateLanguage('de')}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          language === 'de'
            ? 'bg-mint text-white'
            : 'text-content hover:text-mint'
        }`}
      >
        DE
      </button>
    </div>
  );
};
