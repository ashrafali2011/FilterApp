import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ar';

interface Translations {
  [key: string]: {
    en: string;
    ar: string;
  };
}

const translations: Translations = {
  dashboard: { en: 'Dashboard', ar: 'لوحة القيادة' },
  filters: { en: 'Filters', ar: 'المرشحات' },
  history: { en: 'History', ar: 'السجل' },
  settings: { en: 'Settings', ar: 'الإعدادات' },
  login: { en: 'Log In', ar: 'تسجيل الدخول' },
  guest_warning: { en: 'Your data is stored only on this device. Log in to sync across devices.', ar: 'يتم تخزين بياناتك على هذا الجهاز فقط. قم بتسجيل الدخول للمزامنة عبر الأجهزة.' },
  healthy: { en: 'Healthy', ar: 'جيد' },
  warning: { en: 'Warning', ar: 'تحذير' },
  overdue: { en: 'Overdue', ar: 'متأخر' },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('aquatrack_lang') as Language;
    if (saved && (saved === 'en' || saved === 'ar')) {
      setLanguage(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('aquatrack_lang', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string) => {
    if (!translations[key]) return key;
    return translations[key][language] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, isRTL: language === 'ar' }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
