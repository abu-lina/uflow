import { useState, useEffect } from 'react';

export const useLanguage = () => {
  const [language, setLanguage] = useState<'en' | 'de'>('en');
  
  useEffect(() => {
    // Check stored preference
    const stored = localStorage.getItem('ummahflow-language');
    if (stored && ['en', 'de'].includes(stored)) {
      setLanguage(stored as 'en' | 'de');
      return;
    }
    
    // Check browser language
    const browserLang = navigator.language || navigator.languages?.[0];
    if (browserLang?.startsWith('de')) {
      setLanguage('de');
    }
  }, []);
  
  const updateLanguage = (newLang: 'en' | 'de') => {
    setLanguage(newLang);
    localStorage.setItem('ummahflow-language', newLang);
  };
  
  return { language, updateLanguage };
};
