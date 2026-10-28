import { distanceMetres } from '../lib/geo';
import { t } from '../lib/i18n';
import type {
  Appareil,
  AssurancePharmacie,
  CompteurCommune,
  Compte,
  Connexion,
  MotifSignalement,
  NumeroUrgence,
  PeriodeGarde,
  Pays,
  Pharmacie,
  PlageHoraire,
  StatutPharmacie,
  SujetSupport,
  TourGarde,
  Ville,
  Zone,
  ZoneDetectee,
} from './schema';

/**
 * Traduction entre le format de l'API Laravel (source du contrat) et le modèle de l'app.
 *
 * Elle s'applique au seul transport réseau : l'adaptateur de démonstration sert directement
 * le modèle de l'app. Les écrans ne voient donc jamais le format de l'API. Les relevés et les
 * propositions suivent déjà le format de l'API : aucune traduction pour eux.
 * Chaque traducteur est vérifié sur de vraies réponses de l'API (__tests__/traduction.test.ts).
 */

// ---------------- Format de l'API (ressources Laravel) ----------------

type Ref = { id: string; nom: string };
type Point = { lat: number; lng: number };

export type PharmacieApi = {
  id: string;
  nom: string;
  adresse: string;
  quartier: string | null;
  zone: Ref | null;
  ville?: Ref | null;
  telephone: string | null;
  whatsapp: string | null;
  position: Point;
  h24: boolean;
  statut: StatutPharmacie;
  prochaine_ouverture: string | null;
  ferme_a?: string | null;
  garde: { debut: string; fin: string; jusqua?: string | null; confirmee_le: string | null } | null;
  horaires?: PlageHoraire[];
  gardes?: PeriodeGarde[];
  distance_m: number | null;
  marche_min: number | null;
  verifiee_le?: string | null;
  photo_facade?: string | null;
  assurances?: AssurancePharmacie[];
  accepte_mes_assurances?: boolean | null;
  services?: string[];
  note?: { moyenne: number; nombre: number } | null;
};

type UrgenceApi = { numero: string; libelle: string; service: string };
type PaysApi = Omit<Pays, 'urgences' | 'resume' | 'support'> & {
  urgences: UrgenceApi[];
  resume?: string | null;
  support?: Partial<Pays['support']> | null;
};
type VilleApi = { id: string; nom: string; statut: Ville['statut']; pays: string; centre: Point | null; nombre_communes?: number };
type ZoneApi = { id: string; nom: string; type: Zone['type']; ville: string; centre: Point | null; compteurs?: { pharmacies: number; gardes: number } };
type CompteurApi = { zone: Ref; centre: Point | null; pharmacies: number; gardes: number };
type DetectionApi = { commune: Ref; quartier: Ref | null; ville: Ref; pays: { code: string; nom: string } };
type TourApi = { id: string; ville: Ref; debut: string; fin: string; derniere_confirmation_le: string | null; pharmacies: PharmacieApi[] };
type AppareilApi = { id: string; ville: Ref | null; zone: Ref | null; notification_garde: boolean };
type CompteApi = { id: string; nom: string; email: string; role: Compte['role']; villes?: Ref[] };

/**
 * Paramètres de la requête telle que l'app l'a construite, avant traduction : utiles à
 * certaines réponses (position de l'usager, statuts demandés).
 */
export type Contexte = { params: Map<string, string> };

const nombre = (v: string | undefined): number | null => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);

function positionDemandee(ctx: Contexte): { latitude: number; longitude: number } | null {
  const lat = nombre(ctx.params.get('lat'));
  const lng = nombre(ctx.params.get('lng'));
  return lat !== null && lng !== null ? { latitude: lat, longitude: lng } : null;
}

// ---------------- Réponses : API -> app ----------------

export function depuisPharmacieApi(p: PharmacieApi): Pharmacie {
  return {
    id: p.id,
    nom: p.nom,
    adresse: p.adresse,
    commune: p.zone?.nom ?? p.quartier ?? '',
    commune_id: p.zone?.id ?? '',
    ville: p.ville?.nom ?? '',
    latitude: p.position.lat,
    longitude: p.position.lng,
    telephone: p.telephone,
    whatsapp: p.whatsapp,
    h24: p.h24,
    statut: p.statut,
    prochaine_ouverture: p.prochaine_ouverture,
    ferme_a: p.ferme_a ?? null,
    garde: p.garde ? { debut: p.garde.debut, fin: p.garde.fin, jusqua: p.garde.jusqua ?? null, confirmee_le: p.garde.confirmee_le } : null,
    horaires: p.horaires ?? [],
    gardes: p.gardes ?? [],
    assurances: p.assurances ?? [],
    accepte_mes_assurances: p.accepte_mes_assurances ?? null,
    distance_m: p.distance_m,
    marche_min: p.marche_min,
    // Champs de la fiche (présents seulement sur GET /pharmacies/{id}).
    pays_code: '',
    services: p.services ?? [],
    verifiee_le: p.verifiee_le ?? null,
    note: p.note ?? null,
    photo_url: p.photo_facade ?? null,
  };
}

const ICONES_URGENCE: Record<string, NumeroUrgence['icone']> = { samu: 'ambulance', pompiers: 'pompiers', police: 'police' };

export function depuisPaysApi(p: PaysApi): Pays {
  return {
    ...p,
    statut: p.statut === 'ouvert' ? 'ouvert' : 'bientot',
    // Coordonnées vides tant que l'équipe ne les a pas renseignées : « bientôt disponible ».
    resume: p.resume ?? null,
    support: { whatsapp: p.support?.whatsapp ?? null, telephone: p.support?.telephone ?? null, email: p.support?.email ?? null },
    // Libellés traduits par l'app quand elle les connaît (anglais) ; sinon celui de l'API.
    urgences: (p.urgences ?? []).map((u) => ({
      code: u.service,
      libelle: t(`urgences.libelles.${u.service}`, { defaultValue: u.libelle }),
      libelle_court: t(`urgences.libelles.${u.service}`, { defaultValue: u.libelle }),
      description: t(`urgences.descriptions.${u.service}`, { defaultValue: '' }),
      numero: u.numero,
      icone: ICONES_URGENCE[u.service] ?? 'autre',
    })),
  };
}

export function depuisVilleApi(v: VilleApi): Ville {
  return {
    id: v.id,
    pays_code: v.pays,
    nom: v.nom,
    statut: v.statut,
    latitude: v.centre?.lat ?? 0,
    longitude: v.centre?.lng ?? 0,
    // À défaut (ancienne API), les écrans prennent le nombre de communes chargées.
    nombre_communes: v.nombre_communes ?? 0,
  };
}

export function depuisZoneApi(z: ZoneApi, ctx: Contexte): Zone {
  const ici = positionDemandee(ctx);
  return {
    id: z.id,
    ville_id: z.ville,
    nom: z.nom,
    type: z.type,
    latitude: z.centre?.lat ?? 0,
    longitude: z.centre?.lng ?? 0,
    nombre_pharmacies: z.compteurs?.pharmacies ?? 0,
    nombre_gardes: z.compteurs?.gardes ?? 0,
    distance_m: ici && z.centre ? Math.round(distanceMetres(ici, { latitude: z.centre.lat, longitude: z.centre.lng })) : null,
  };
}

export function depuisDetectionApi(d: DetectionApi, ctx: Contexte): ZoneDetectee {
  const ici = positionDemandee(ctx) ?? { latitude: 0, longitude: 0 };
  return {
    zone: { id: d.commune.id, ville_id: d.ville.id, nom: d.commune.nom, type: 'commune', ...ici, nombre_pharmacies: 0, nombre_gardes: 0, distance_m: 0 },
    ville: { id: d.ville.id, pays_code: d.pays.code, nom: d.ville.nom, statut: 'ouverte', ...ici, nombre_communes: 0 },
    pays_code: d.pays.code,
  };
}

export function depuisCompteurApi(c: CompteurApi): CompteurCommune {
  return {
    zone_id: c.zone.id,
    nom: c.zone.nom,
    latitude: c.centre?.lat ?? 0,
    longitude: c.centre?.lng ?? 0,
    nombre_pharmacies: c.pharmacies,
    nombre_gardes: c.gardes,
  };
}

export function depuisTourApi(tour: TourApi): TourGarde {
  return {
    id: tour.id,
    ville_id: tour.ville.id,
    debut: tour.debut,
    fin: tour.fin,
    confirme_le: tour.derniere_confirmation_le,
    pharmacies: (tour.pharmacies ?? []).map(depuisPharmacieApi),
  };
}

export function depuisAppareilApi(d: AppareilApi | { appareil: AppareilApi; jeton: string }): Appareil {
  const a = 'appareil' in d ? d.appareil : d;
  return {
    // Le jeton n'est renvoyé qu'à l'enregistrement (POST /appareils).
    jeton: 'jeton' in d ? d.jeton : '',
    ville_suivie: a.ville?.id ?? null,
    commune_defaut: a.zone?.id ?? null,
    notification_garde: a.notification_garde,
  };
}

/** L'API n'a qu'un champ « nom » : le premier mot sert de prénom (initiales, « Bonjour »). */
export function depuisCompteApi(c: CompteApi): Compte {
  const [prenom = '', ...reste] = c.nom.trim().split(/\s+/);
  return { id: c.id, email: c.email, prenom, nom: reste.join(' '), role: c.role, villes: c.villes ?? [] };
}

// ---------------- Requêtes : app -> API ----------------

const MOTIFS: Record<MotifSignalement, string> = {
  fermee: 'fermee',
  tel: 'mauvais_telephone',
  adresse: 'mauvaise_adresse',
  garde: 'pas_de_garde',
  autre: 'autre',
};

const SUJETS: Record<SujetSupport, string> = {
  app: 'probleme_technique',
  pharma: 'donnees_pharmacie',
  idee: 'suggestion',
  autre: 'autre',
};

/** Rayon maximal accepté par l'API (RecherchePharmacies::RAYON_MAX_M). */
export const RAYON_MAX_API_M = 5000;

type Corps = Record<string, unknown>;
type Requete = { params: Map<string, string>; corps: unknown };
type Route = {
  methode: string;
  motif: RegExp;
  requete?: (r: Requete) => Requete;
  reponse?: (data: unknown, ctx: Contexte) => unknown;
};

const liste =
  <A, B>(f: (x: A, ctx: Contexte) => B) =>
  (data: unknown, ctx: Contexte) =>
    (data as A[]).map((x) => f(x, ctx));

/**
 * Filtre « Ouvertes » de l'app = ouvertes ou de garde ; l'API n'accepte qu'un statut à la fois.
 * Plusieurs statuts : le filtre est retiré de la requête puis appliqué à la réponse.
 * Le rayon est ramené au maximum de l'API (la maquette propose 10 km, l'API 5 km : à trancher).
 */
function requetePharmacies({ params, corps }: Requete): Requete {
  const p = new Map(params);
  // L'API refuse tout paramètre inconnu : les statuts demandés sont relus dans le contexte.
  if (p.get('filter[statut]')?.includes(',')) p.delete('filter[statut]');
  const rayon = nombre(p.get('rayon'));
  if (rayon !== null && rayon > RAYON_MAX_API_M) p.set('rayon', String(RAYON_MAX_API_M));
  return { params: p, corps };
}

function reponsePharmacies(data: unknown, ctx: Contexte): unknown {
  const demandes = ctx.params.get('filter[statut]');
  const statuts = demandes?.includes(',') ? demandes.split(',') : null;
  const toutes = (data as PharmacieApi[]).map(depuisPharmacieApi);
  return statuts ? toutes.filter((p) => statuts.includes(p.statut)) : toutes;
}

const avecCorps = (f: (c: Corps) => Corps) => (r: Requete): Requete => ({ ...r, corps: f((r.corps ?? {}) as Corps) });

function corpsAppareil(c: Corps): Corps {
  const { identifiant, ville_suivie, commune_defaut, ...reste } = c;
  return {
    ...reste,
    ...(identifiant !== undefined ? { identifiant_anonyme: identifiant } : {}),
    ...(ville_suivie !== undefined ? { ville: ville_suivie } : {}),
    ...(commune_defaut !== undefined ? { zone: commune_defaut } : {}),
  };
}

export const ROUTES: Route[] = [
  { methode: 'GET', motif: /^\/pays$/, reponse: liste(depuisPaysApi) },
  { methode: 'GET', motif: /^\/pays\/[^/]+\/villes$/, reponse: liste(depuisVilleApi) },
  { methode: 'GET', motif: /^\/villes\/[^/]+\/zones$/, reponse: liste(depuisZoneApi) },
  { methode: 'GET', motif: /^\/villes\/[^/]+\/compteurs$/, reponse: liste(depuisCompteurApi) },
  { methode: 'GET', motif: /^\/zones\/depuis-position$/, reponse: (d, ctx) => depuisDetectionApi(d as DetectionApi, ctx) },
  { methode: 'GET', motif: /^\/pharmacies\/(proches|cadre)$/, requete: requetePharmacies, reponse: reponsePharmacies },
  { methode: 'GET', motif: /^\/pharmacies\/recherche$/, reponse: liste(depuisPharmacieApi) },
  { methode: 'GET', motif: /^\/agent\/pharmacies\/proches$/, reponse: liste(depuisPharmacieApi) },
  { methode: 'GET', motif: /^\/pharmacies\/(?!proches$|cadre$|recherche$)[^/]+$/, reponse: (d) => depuisPharmacieApi(d as PharmacieApi) },
  { methode: 'GET', motif: /^\/gardes\/en-cours$/, reponse: (d) => depuisTourApi(d as TourApi) },
  { methode: 'GET', motif: /^\/appareils\/moi\/favoris$/, reponse: liste(depuisPharmacieApi) },
  {
    methode: 'POST',
    motif: /^\/appareils\/moi\/favoris$/,
    requete: avecCorps(({ pharmacie_id, ...reste }) => ({ ...reste, pharmacie: pharmacie_id })),
  },
  { methode: 'POST', motif: /^\/appareils$/, requete: avecCorps(corpsAppareil), reponse: (d) => depuisAppareilApi(d as AppareilApi) },
  { methode: 'PATCH', motif: /^\/appareils\/moi$/, requete: avecCorps(corpsAppareil), reponse: (d) => depuisAppareilApi(d as AppareilApi) },
  {
    methode: 'POST',
    motif: /^\/pharmacies\/[^/]+\/signalements$/,
    requete: avecCorps((c) => ({ ...c, motif: MOTIFS[c.motif as MotifSignalement] ?? c.motif })),
  },
  { methode: 'POST', motif: /^\/support\/messages$/, requete: avecCorps((c) => ({ ...c, sujet: SUJETS[c.sujet as SujetSupport] ?? c.sujet })) },
  {
    methode: 'POST',
    motif: /^\/auth\/connexion$/,
    requete: avecCorps(({ mot_de_passe, appareil, ...reste }) => ({ ...reste, password: mot_de_passe, nom_appareil: appareil })),
    reponse: (d) => {
      const { jeton, compte } = d as { jeton: string; compte: CompteApi };
      return { jeton, compte: depuisCompteApi(compte) } satisfies Connexion;
    },
  },
  { methode: 'GET', motif: /^\/auth\/moi$/, reponse: (d) => depuisCompteApi(d as CompteApi) },
];

export function trouverRoute(methode: string, chemin: string): Route | undefined {
  return ROUTES.find((r) => r.methode === methode && r.motif.test(chemin));
}
