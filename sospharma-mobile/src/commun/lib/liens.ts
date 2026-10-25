import { Linking, Platform } from 'react-native';

import type { Coordonnees, ModeTrajet } from './geo';
import { alerte } from './dialogues';
import { t } from './i18n';
import { marquerSortieVersAutreApp } from './premierPlan';
import { signalerErreur } from './sentry';

/**
 * Liens sortants : appel (tel:), WhatsApp (https://wa.me/), SMS, applications de navigation.
 * Les numéros arrivent de l'API au format international ; à défaut, on ajoute
 * l'indicatif du pays (jamais en dur : il vient de la configuration pays).
 */

export function numeroInternational(numero: string, indicatif?: string): string {
  const propre = numero.replace(/[^\d+]/g, '');
  if (propre.startsWith('+')) return propre;
  if (propre.startsWith('00')) return `+${propre.slice(2)}`;
  return indicatif ? `${indicatif}${propre}` : propre;
}

async function ouvrir(url: string): Promise<boolean> {
  try {
    // Au retour (fin d'appel, sortie de Maps…), l'usager retrouve l'écran qu'il avait quitté.
    marquerSortieVersAutreApp();
    await Linking.openURL(url);
    return true;
  } catch (e) {
    signalerErreur(e, { url: url.split('?')[0] });
    alerte(t('erreurs.titre'), t('erreurs.appelImpossible'));
    return false;
  }
}

export function appeler(numero: string, indicatif?: string): Promise<boolean> {
  // Les numéros courts d'urgence (185, 180) restent tels quels.
  const cible = /^\d{2,4}$/.test(numero) ? numero : numeroInternational(numero, indicatif);
  return ouvrir(`tel:${cible}`);
}

export function ecrireWhatsApp(numero: string | null, texte?: string, indicatif?: string): Promise<boolean> {
  const chiffres = numero ? numeroInternational(numero, indicatif).replace(/\D/g, '') : '';
  const message = texte ? `?text=${encodeURIComponent(texte)}` : '';
  return ouvrir(`https://wa.me/${chiffres}${message}`);
}

export function envoyerSms(texte: string): Promise<boolean> {
  const separateur = Platform.OS === 'ios' ? '&' : '?';
  return ouvrir(`sms:${separateur}body=${encodeURIComponent(texte)}`);
}

export function ecrireEmail(adresse: string, sujet?: string): Promise<boolean> {
  return ouvrir(`mailto:${adresse}${sujet ? `?subject=${encodeURIComponent(sujet)}` : ''}`);
}

export type AppNavigation = 'google' | 'plans' | 'yango' | 'systeme';

/** Lien Google Maps universel (s'ouvre dans l'app si installée, sinon dans le navigateur). */
export function lienGoogleMaps(destination: Coordonnees, mode: ModeTrajet = 'voiture', origine?: Coordonnees): string {
  const travelmode = mode === 'pied' ? 'walking' : mode === 'moto' ? 'two-wheeler' : 'driving';
  const o = origine ? `&origin=${origine.latitude},${origine.longitude}` : '';
  return `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}${o}&travelmode=${travelmode}`;
}

/** Lien de partage d'un point (message « Itinéraire : ... »). */
export function lienPosition(destination: Coordonnees): string {
  return `https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`;
}

export function ouvrirNavigation(
  app: AppNavigation,
  destination: Coordonnees,
  mode: ModeTrajet = 'voiture',
  origine?: Coordonnees,
  nom?: string,
): Promise<boolean> {
  const { latitude: lat, longitude: lng } = destination;
  switch (app) {
    case 'plans': {
      const dirflg = mode === 'pied' ? 'w' : 'd';
      const saddr = origine ? `&saddr=${origine.latitude},${origine.longitude}` : '';
      return ouvrir(`http://maps.apple.com/?daddr=${lat},${lng}${saddr}&dirflg=${dirflg}`);
    }
    case 'yango':
      // À VÉRIFIER : schéma de lien profond de Yango (non documenté publiquement).
      // En cas d'échec, on bascule sur Google Maps.
      marquerSortieVersAutreApp();
      return Linking.openURL(`yango://route?end-lat=${lat}&end-lon=${lng}`)
        .then(() => true)
        .catch(() => ouvrir(lienGoogleMaps(destination, mode, origine)));
    case 'systeme':
      return ouvrir(
        Platform.OS === 'android'
          ? `geo:${lat},${lng}?q=${lat},${lng}${nom ? `(${encodeURIComponent(nom)})` : ''}`
          : `http://maps.apple.com/?daddr=${lat},${lng}`,
      );
    case 'google':
    default:
      return ouvrir(lienGoogleMaps(destination, mode, origine));
  }
}

/** Réglages de l'app dans le téléphone (autorisation refusée) ; au retour, l'écran quitté est repris. */
export function ouvrirReglages(): Promise<void> {
  marquerSortieVersAutreApp();
  return Linking.openSettings();
}
