import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { donneesOuErreur, estErreurAppel, type ZoneDetectee } from '@/commun/api';
import { t, usePreferences, useSession, type Coordonnees, type ZoneChoisie } from '@/commun/lib';

import { clesTerritoire, detecterZone, lireCompteurs, lireZones } from '../api';

export function versZoneChoisie(d: ZoneDetectee, source: ZoneChoisie['source']): ZoneChoisie {
  return {
    zoneId: d.zone.id,
    nom: d.zone.nom,
    villeId: d.ville.id,
    villeNom: d.ville.nom,
    latitude: d.zone.latitude,
    longitude: d.zone.longitude,
    source,
  };
}

/** Commune détectée depuis la position (GET /zones/depuis-position). */
export function useZoneDetectee(position: Coordonnees | null) {
  return useQuery({
    queryKey: position ? clesTerritoire.detection(position) : ['zones', 'depuis-position', 'aucune'],
    queryFn: async () => donneesOuErreur(await detecterZone(position as Coordonnees)),
    enabled: position !== null,
    retry: false,
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Zone courante de l'usager et point de recherche :
 * - zone détectée par la position (par défaut) ;
 * - ou commune choisie à la main (centre de la commune).
 */
export function useZoneCourante() {
  const zone = usePreferences((e) => e.zone);
  const position = useSession((e) => e.position);
  return useMemo(() => {
    const point: Coordonnees | null =
      zone?.source === 'manuelle'
        ? { latitude: zone.latitude, longitude: zone.longitude }
        : (position ?? (zone ? { latitude: zone.latitude, longitude: zone.longitude } : null));
    const libelle = zone ? t('commun.zoneVille', { zone: zone.nom, ville: zone.villeNom }) : t('commun.aucuneZone');
    return { zone, point, libelle, villeId: zone?.villeId ?? null };
  }, [zone, position]);
}

/**
 * Tient la zone « position » à jour quand la position change, et signale une zone
 * non couverte (l'appelant applique la réaction via useReactionErreur).
 */
export function useSynchroniserZone(onNonCouverte?: (erreur: unknown) => void) {
  const position = useSession((e) => e.position);
  const zone = usePreferences((e) => e.zone);
  const definirZone = usePreferences((e) => e.definirZone);
  const detection = useZoneDetectee(zone?.source === 'manuelle' ? null : position);

  useEffect(() => {
    if (detection.data && (zone === null || zone.source === 'position')) {
      const nouvelle = versZoneChoisie(detection.data, 'position');
      if (nouvelle.zoneId !== zone?.zoneId) definirZone(nouvelle);
    }
  }, [detection.data, zone, definirZone]);

  useEffect(() => {
    if (detection.error && estErreurAppel(detection.error) && detection.error.code === 'ZONE_NOT_COVERED' && !zone) {
      onNonCouverte?.(detection.error);
    }
    // onNonCouverte est stable chez l'appelant (useCallback).
  }, [detection.error, zone, onNonCouverte]);

  return detection;
}

export function useCommunes(villeId: string | null, q = '') {
  const { point } = useZoneCourante();
  return useQuery({
    queryKey: clesTerritoire.zones(villeId ?? 'aucune', q, point),
    queryFn: async () => donneesOuErreur(await lireZones(villeId as string, q, point)),
    enabled: villeId !== null,
    placeholderData: (precedent) => precedent,
  });
}

export function useCompteurs(villeId: string | null) {
  return useQuery({
    queryKey: clesTerritoire.compteurs(villeId ?? 'aucune'),
    queryFn: async () => donneesOuErreur(await lireCompteurs(villeId as string)),
    enabled: villeId !== null,
    staleTime: 15 * 60 * 1000,
  });
}
