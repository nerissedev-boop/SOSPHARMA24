import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { marquerSortieVersAutreApp } from '@/commun/lib';

import type { PhotoLocale } from './types';

/** Côté le plus long des photos envoyées (architecture : « réduites à 1 600 px »). */
export const COTE_MAX_PX = 1600;
const COMPRESSION = 0.7;

export type ResultatPhoto = { statut: 'ok'; photo: PhotoLocale } | { statut: 'annulee' } | { statut: 'refusee' };

/**
 * Réduit et recompresse une photo en JPEG. Le nouveau fichier ne garde aucune donnée EXIF
 * (dont la position GPS du fichier) : seule la position du relevé est envoyée.
 */
export async function reduirePhoto(uri: string, largeur: number, hauteur: number): Promise<PhotoLocale> {
  const contexte = ImageManipulator.manipulate(uri);
  if (Math.max(largeur, hauteur) > COTE_MAX_PX) {
    contexte.resize(largeur >= hauteur ? { width: COTE_MAX_PX } : { height: COTE_MAX_PX });
  }
  const image = await contexte.renderAsync();
  const resultat = await image.saveAsync({ compress: COMPRESSION, format: SaveFormat.JPEG });
  return { uri: resultat.uri, largeur: resultat.width, hauteur: resultat.height };
}

/**
 * Prend une photo avec l'appareil photo (expo-image-picker). L'autorisation n'est demandée
 * qu'à la première photo, pas avant.
 */
export async function prendrePhoto(): Promise<ResultatPhoto> {
  let permission = await ImagePicker.getCameraPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return { statut: 'refusee' };
  // L'appareil photo est une autre application : au retour, l'étape du relevé est reprise.
  marquerSortieVersAutreApp();
  const resultat = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1, exif: false, allowsEditing: false });
  const image = resultat.canceled ? undefined : resultat.assets[0];
  if (!image) return { statut: 'annulee' };
  return { statut: 'ok', photo: await reduirePhoto(image.uri, image.width, image.height) };
}
