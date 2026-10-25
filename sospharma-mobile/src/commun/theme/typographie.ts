import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Urbanist_600SemiBold, Urbanist_700Bold, Urbanist_800ExtraBold } from '@expo-google-fonts/urbanist';
import type { TextStyle } from 'react-native';

import { POLICES_VONCA } from './polices-vonca';

export type Graisse = 400 | 500 | 600 | 700 | 800;

/** Famille des titres : Vonca (licence client) avec repli Urbanist. */
export const FAMILLE_TITRES = 'Vonca';
export const FAMILLE_TITRES_REPLI = 'Urbanist';
export const FAMILLE_TEXTE = 'Plus Jakarta Sans';

const familleTexte: Record<Graisse, string> = {
  400: 'PlusJakartaSans_400Regular',
  500: 'PlusJakartaSans_500Medium',
  600: 'PlusJakartaSans_600SemiBold',
  700: 'PlusJakartaSans_700Bold',
  800: 'PlusJakartaSans_800ExtraBold',
};

const familleUrbanist: Record<600 | 700 | 800, string> = {
  600: 'Urbanist_600SemiBold',
  700: 'Urbanist_700Bold',
  800: 'Urbanist_800ExtraBold',
};

/** Polices à charger au démarrage (useFonts). Vonca seulement si le fichier existe. */
export const policesACharger: Record<string, number> = {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  Urbanist_600SemiBold,
  Urbanist_700Bold,
  Urbanist_800ExtraBold,
  ...Object.fromEntries(Object.values(POLICES_VONCA).map((p) => [p.famille, p.source])),
};

/** Nom de famille à utiliser pour un texte courant. */
export function policeTexte(graisse: Graisse = 400): string {
  return familleTexte[graisse];
}

/** Nom de famille pour un titre : Vonca si présente, sinon Urbanist. */
export function policeTitre(graisse: 600 | 700 | 800 = 800): string {
  return POLICES_VONCA[graisse]?.famille ?? familleUrbanist[graisse];
}

/**
 * Variantes typographiques relevées dans les maquettes.
 * Titres : Vonca/Urbanist. Texte : Plus Jakarta Sans.
 */
export const variantes = {
  logotype: { fontFamily: policeTitre(800), fontSize: 52, lineHeight: 52, letterSpacing: -1 },
  titreEcran: { fontFamily: policeTitre(800), fontSize: 24, lineHeight: 30 },
  titre: { fontFamily: policeTitre(800), fontSize: 22, lineHeight: 28 },
  titreBarre: { fontFamily: policeTitre(800), fontSize: 19, lineHeight: 24 },
  titreModal: { fontFamily: policeTitre(800), fontSize: 20, lineHeight: 26 },
  section: { fontFamily: policeTitre(800), fontSize: 17, lineHeight: 22 },
  sectionMoyenne: { fontFamily: policeTitre(800), fontSize: 16, lineHeight: 21 },
  sectionPetite: { fontFamily: policeTitre(800), fontSize: 15, lineHeight: 20 },
  nomGrand: { fontFamily: policeTexte(700), fontSize: 16, lineHeight: 21 },
  nom: { fontFamily: policeTexte(700), fontSize: 15, lineHeight: 20 },
  nomPetit: { fontFamily: policeTexte(700), fontSize: 14, lineHeight: 19 },
  distanceGrande: { fontFamily: policeTexte(800), fontSize: 18, lineHeight: 23 },
  corpsFort: { fontFamily: policeTexte(600), fontSize: 15, lineHeight: 21 },
  corps: { fontFamily: policeTexte(400), fontSize: 15, lineHeight: 23 },
  texte: { fontFamily: policeTexte(400), fontSize: 14, lineHeight: 20 },
  bouton: { fontFamily: policeTexte(700), fontSize: 15, lineHeight: 20 },
  boutonGrand: { fontFamily: policeTexte(700), fontSize: 16, lineHeight: 21 },
  boutonPetit: { fontFamily: policeTexte(700), fontSize: 14, lineHeight: 19 },
  petitFort: { fontFamily: policeTexte(600), fontSize: 13, lineHeight: 18 },
  petit: { fontFamily: policeTexte(400), fontSize: 13, lineHeight: 18 },
  libelleFort: { fontFamily: policeTexte(700), fontSize: 12, lineHeight: 16 },
  libelleMoyen: { fontFamily: policeTexte(600), fontSize: 12, lineHeight: 16 },
  libelle: { fontFamily: policeTexte(400), fontSize: 12, lineHeight: 16 },
  mini: { fontFamily: policeTexte(600), fontSize: 11, lineHeight: 14 },
  miniFort: { fontFamily: policeTexte(800), fontSize: 11, lineHeight: 14 },
} satisfies Record<string, TextStyle>;

export type Variante = keyof typeof variantes;
