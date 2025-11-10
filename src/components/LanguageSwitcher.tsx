'use client';

import { useLanguage } from '../hooks/useLanguage';

export const LanguageSwitcher = () => {
  const { language, updateLanguage } = useLanguage();

  return (
    <div className="flex items-center space-x-2">
      <button
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          language === 'en'
            ? 'bg-primary text-white'
            : 'text-content hover:text-primary'
        }`}
        onClick={() => updateLanguage('en')}
      >
        EN
      </button>
      <button
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          language === 'de'
            ? 'bg-primary text-white'
            : 'text-content hover:text-primary'
        }`}
        onClick={() => updateLanguage('de')}
      >
        DE
      </button>
    </div>
  );
};
