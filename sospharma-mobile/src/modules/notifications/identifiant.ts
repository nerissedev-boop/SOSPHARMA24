import { stockage } from '@/commun/lib';

const CLE_IDENTIFIANT = 'appareil.identifiant';

/** Format accepté par l'API (EnregistrerAppareilRequest) : lettres, chiffres et tirets, 16 caractères au moins. */
const FORMAT_IDENTIFIANT = /^[A-Za-z0-9-]{16,100}$/;

/** Identifiant anonyme et stable de l'appareil, envoyé à l'enregistrement (POST /appareils). */
export function identifiantAnonyme(): string {
  let id = stockage().getString(CLE_IDENTIFIANT);
  // Les premières versions écrivaient « app_… » : le tiret bas est refusé par l'API, on le remplace.
  if (id && !FORMAT_IDENTIFIANT.test(id)) id = id.replace(/[^A-Za-z0-9-]/g, '-');
  if (!id || !FORMAT_IDENTIFIANT.test(id)) {
    id = `app-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
  stockage().set(CLE_IDENTIFIANT, id);
  return id;
}
