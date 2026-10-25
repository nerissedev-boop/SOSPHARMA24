import { getLocales } from 'expo-localization';
import { createInstance, type TOptions } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import fr from './fr.json';

/**
 * Toutes les phrases de l'interface sont dans des fichiers i18next (français pour la V1).
 * Les noms de communes et de pharmacies restent tels quels (données de l'API).
 */
export const LANGUES_DISPONIBLES = ['fr'] as const;

function langueAppareil(): string {
  try {
    const code = getLocales()[0]?.languageCode ?? 'fr';
    return (LANGUES_DISPONIBLES as readonly string[]).includes(code) ? code : 'fr';
  } catch {
    return 'fr';
  }
}

const i18next = createInstance();
void i18next.use(initReactI18next).init({
  resources: { fr: { translation: fr } },
  lng: langueAppareil(),
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  initAsync: false,
  returnNull: false,
});

/** Traduction hors composant (client d'API, règles). */
export function t(cle: string, options?: TOptions): string {
  return i18next.t(cle, options) as string;
}

export { useTranslation };
export default i18next;
