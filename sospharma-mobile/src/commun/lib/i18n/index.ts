import { getLocales } from 'expo-localization';
import { createInstance, type TOptions } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import en from './en.json';
import fr from './fr.json';

/**
 * Toutes les phrases de l'interface sont dans des fichiers i18next (français et anglais).
 * Les noms de communes et de pharmacies restent tels quels (données de l'API).
 */
export const LANGUES_DISPONIBLES = ['fr', 'en'] as const;
export type Langue = (typeof LANGUES_DISPONIBLES)[number];
/** Choix de l'usager dans le Profil : « auto » suit la langue du téléphone. */
export type PreferenceLangue = Langue | 'auto';

/** Locale Intl de chaque langue (dates, nombres) : « sam. 24 oct. », « Sat 24 Oct ». */
const LOCALES: Record<Langue, string> = { fr: 'fr-FR', en: 'en-GB' };

function estLangue(code: string | null | undefined): code is Langue {
  return (LANGUES_DISPONIBLES as readonly string[]).includes(code ?? '');
}

function langueAppareil(): Langue {
  try {
    const code = getLocales()[0]?.languageCode;
    return estLangue(code) ? code : 'fr';
  } catch {
    return 'fr';
  }
}

const i18next = createInstance();
void i18next.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: langueAppareil(),
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  initAsync: false,
  returnNull: false,
});

/** Applique le choix du Profil (au lancement, puis à chaque changement). */
export function appliquerLangue(preference: PreferenceLangue): void {
  const langue = preference === 'auto' ? langueAppareil() : preference;
  if (i18next.language !== langue) void i18next.changeLanguage(langue);
}

export function langueActive(): Langue {
  return estLangue(i18next.language) ? i18next.language : 'fr';
}

export function localeActive(): string {
  return LOCALES[langueActive()];
}

/** Traduction hors composant (client d'API, règles). */
export function t(cle: string, options?: TOptions): string {
  return i18next.t(cle, options) as string;
}

export { useTranslation };
export default i18next;
