import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en/translation.json';
import hi from '../locales/hi/translation.json';
import bn from '../locales/bn/translation.json';
import gu from '../locales/gu/translation.json';
import mr from '../locales/mr/translation.json';
import kn from '../locales/kn/translation.json';
import or from '../locales/or/translation.json';
import ta from '../locales/ta/translation.json';
import te from '../locales/te/translation.json';

export const LANGUAGE_KEY = 'gkp_language';

export const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { code: 'or', label: 'Odia', nativeLabel: 'ଓଡ଼ିଆ' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
] as const;

export const resources = {
  en: { translation: en },
  hi: { translation: hi },
  bn: { translation: bn },
  gu: { translation: gu },
  mr: { translation: mr },
  kn: { translation: kn },
  or: { translation: or },
  ta: { translation: ta },
  te: { translation: te },
} as const;

export async function initI18n() {
  let saved: string | null = null;
  try {
    saved = await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch {}

  await i18n.use(initReactI18next).init({
    resources,
    lng: saved || 'en',
    fallbackLng: 'en',
    supportedLngs: LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  i18n.on('languageChanged', (lng) => {
    AsyncStorage.setItem(LANGUAGE_KEY, lng).catch(() => {});
  });

  return i18n;
}

export async function setLanguage(code: string) {
  await i18n.changeLanguage(code);
  await AsyncStorage.setItem(LANGUAGE_KEY, code).catch(() => {});
}

export default i18n;
