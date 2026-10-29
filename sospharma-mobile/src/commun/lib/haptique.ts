import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Retours haptiques (petites vibrations) de l'app. Jamais bloquants : on n'attend pas le
 * moteur de vibration, et une erreur (téléphone sans vibreur, module absent, vibrations
 * coupées) est avalée en silence. Rien sur le web.
 *
 * Usage parcimonieux : un toucher de carte ou de filtre (légère), une action qui quitte
 * l'app (Appeler, Partager), et la fin d'un envoi (succès / erreur).
 */

function vibrer(declencher: () => Promise<void>): void {
  if (Platform.OS === 'web') return;
  try {
    declencher().catch(() => undefined);
  } catch {
    // Module natif indisponible (client de développement ancien…) : sans vibration.
  }
}

/** Toucher d'une carte, d'un filtre, d'une pilule : le « tic » le plus discret. */
export function vibrationLegere(): void {
  vibrer(() => Haptics.selectionAsync());
}

/** Action franche : Appeler, Itinéraire, Partager. */
export function vibrationAction(): void {
  vibrer(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** Opération réussie (relevé envoyé, favori ajouté…). */
export function vibrationSucces(): void {
  vibrer(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Opération refusée ou échouée. */
export function vibrationErreur(): void {
  vibrer(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}
