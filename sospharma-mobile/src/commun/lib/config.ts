/**
 * Variables d'environnement publiques (préfixe EXPO_PUBLIC_, lues au build par Expo).
 * Voir .env.example et le README.
 */
export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.example.invalid',
  /** Adaptateur de démonstration : actif par défaut tant que l'API n'est pas déployée. */
  apiMock: (process.env.EXPO_PUBLIC_API_MOCK ?? '1') !== '0',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  environnement: process.env.EXPO_PUBLIC_ENVIRONNEMENT ?? 'development',
  styleCarteJour: process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? '',
  styleCarteNuit: process.env.EXPO_PUBLIC_MAP_STYLE_URL_NUIT ?? '',
  tuilesCarte: process.env.EXPO_PUBLIC_MAP_TILES_URL ?? '',
  lienPartageBase: process.env.EXPO_PUBLIC_LIEN_PARTAGE_BASE ?? '',
  /** Position simulée (« lat,lng ») en mode démo ; vide = vraie position GPS. */
  positionSimulee: process.env.EXPO_PUBLIC_POSITION_SIMULEE ?? '5.3600,-3.9800',
} as const;

export function estModeDemo(): boolean {
  return config.apiMock;
}

export function positionSimulee(): { latitude: number; longitude: number } | null {
  if (!config.apiMock || !config.positionSimulee) return null;
  const [lat, lng] = config.positionSimulee.split(',').map(Number);
  if (lat === undefined || lng === undefined || Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { latitude: lat, longitude: lng };
}
