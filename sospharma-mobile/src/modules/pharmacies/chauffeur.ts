import type { PharmacieResume } from '@/commun/api';
import { lienPosition, t, telephoneAffiche } from '@/commun/lib';

/** Message pour un chauffeur : la pharmacie, son adresse, sa commune et le lien de sa position. */
export function messageChauffeur(
  p: Pick<PharmacieResume, 'nom' | 'adresse' | 'commune' | 'ville' | 'telephone' | 'latitude' | 'longitude'>,
  indicatif?: string,
): string {
  return [
    t('itineraire.chauffeurDestination', { nom: p.nom }),
    p.adresse,
    [p.commune, p.ville].filter(Boolean).join(', '),
    t('itineraire.chauffeurPosition', { lien: lienPosition({ latitude: p.latitude, longitude: p.longitude }) }),
    p.telephone ? t('itineraire.chauffeurTelephone', { telephone: telephoneAffiche(p.telephone, indicatif) }) : null,
  ]
    .filter(Boolean)
    .join('\n');
}
