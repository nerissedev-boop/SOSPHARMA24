/**
 * Quand l'app revient au premier plan, faut-il rejouer l'écran de démarrage (logo) ?
 *
 * Android garde l'app en mémoire quand on la quitte : un nouvel appui sur l'icône la reprend
 * où elle était, sans le logo. Avec la touche retour, Android détruit même la fenêtre de l'app,
 * mais la mémoire JavaScript survit : l'app croit le démarrage déjà fait. La règle :
 * - sortie par la touche retour depuis l'accueil : le logo s'affiche au retour ;
 * - autre sortie (bouton d'accueil…) d'au moins 5 minutes : le logo s'affiche aussi ;
 * - mais si c'est l'app qui a ouvert une autre application (appel, Maps, WhatsApp, SMS,
 *   partage, réglages, appareil photo), on revient là où on était.
 *
 * L'état vit ici, hors des composants : il survit à la reconstruction de la fenêtre.
 */
export const ABSENCE_AVANT_DEMARRAGE_MS = 5 * 60 * 1000;

let quitteLe: number | null = null;
let volontaire = false;
let versAutreApp = false;

/** L'app passe en arrière-plan. */
export function noterDepart(maintenant: number = Date.now()): void {
  quitteLe = maintenant;
}

/** La touche retour quitte l'app depuis l'accueil. */
export function marquerSortieVolontaire(): void {
  volontaire = true;
}

/** L'app ouvre une autre application (appel, navigation, WhatsApp, partage, réglages…). */
export function marquerSortieVersAutreApp(): void {
  versAutreApp = true;
}

/**
 * Décision au retour au premier plan (ou à la reconstruction de la fenêtre).
 * Faux s'il n'y a pas eu de départ ; remet tout à zéro pour la sortie suivante.
 */
export function rejouerDemarrageAuRetour(maintenant: number = Date.now()): boolean {
  if (quitteLe === null) return false;
  const absence = maintenant - quitteLe;
  const resultat = volontaire || (!versAutreApp && absence >= ABSENCE_AVANT_DEMARRAGE_MS);
  quitteLe = null;
  volontaire = false;
  versAutreApp = false;
  return resultat;
}
