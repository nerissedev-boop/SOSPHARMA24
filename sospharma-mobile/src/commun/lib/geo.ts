export type Coordonnees = { latitude: number; longitude: number };

/** Distance à vol d'oiseau en mètres (formule de haversine), comme l'API. */
export function distanceMetres(a: Coordonnees, b: Coordonnees): number {
  const R = 6371000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Temps à pied estimé (environ 80 m par minute), à afficher comme une estimation. */
export function marcheMinutes(distanceM: number): number {
  return Math.max(1, Math.ceil(distanceM / 80));
}

export type ModeTrajet = 'voiture' | 'moto' | 'pied';

/**
 * Estimation de trajet sans moteur d'itinéraire (V1) : distance à vol d'oiseau
 * majorée pour suivre les rues, et vitesse urbaine moyenne. À remplacer par les
 * durées de l'app de navigation, qui reste la référence.
 */
export function estimerTrajet(distanceM: number, mode: ModeTrajet): { distanceM: number; minutes: number } {
  const facteur = mode === 'pied' ? 1.15 : 1.35;
  const route = distanceM * facteur;
  const metresParMinute = mode === 'pied' ? 80 : 200; // 12 km/h en ville, embouteillages compris
  const minutes = mode === 'pied' ? Math.round(route / metresParMinute) : Math.ceil(route / metresParMinute);
  return { distanceM: Math.round(route), minutes: Math.max(1, minutes) };
}
