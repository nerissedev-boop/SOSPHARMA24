/**
 * ============================================================================
 *  DONNÉES FICTIVES DE DÉMONSTRATION. AUCUNE DE CES PHARMACIES N'EXISTE.
 * ============================================================================
 * Noms, adresses, positions, horaires et téléphones reprennent les maquettes
 * (Pharmacie du Centre, Pharmacie de la Paix, Grande Pharmacie...) et ne
 * correspondent à aucune officine réelle. Le numéro +225 01 23 45 67 89 est celui
 * des maquettes. Seuls les numéros d'urgence (SAMU 185, pompiers 180) sont ceux
 * indiqués par l'architecture validée pour la Côte d'Ivoire.
 * Ce fichier n'est utilisé que si EXPO_PUBLIC_API_MOCK vaut 1.
 */
import type { Assurance, NumeroUrgence, Pays, PlageHoraire, Ville } from '../schema';

export const FUSEAU_DEMO = 'Africa/Abidjan';
export const TELEPHONE_FICTIF = '+2250123456789';

/** Point de référence des maquettes (Cocody). */
export const REFERENCE = { latitude: 5.36, longitude: -3.98 };

/** Point situé à `distanceM` mètres et `cap` degrés d'un autre (formule sphérique). */
export function decaler(
  depart: { latitude: number; longitude: number },
  distanceM: number,
  cap: number,
): { latitude: number; longitude: number } {
  const R = 6371000;
  const d = distanceM / R;
  const c = (cap * Math.PI) / 180;
  const la1 = (depart.latitude * Math.PI) / 180;
  const lo1 = (depart.longitude * Math.PI) / 180;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(c));
  const lo2 = lo1 + Math.atan2(Math.sin(c) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2));
  return { latitude: Number(((la2 * 180) / Math.PI).toFixed(6)), longitude: Number(((lo2 * 180) / Math.PI).toFixed(6)) };
}

const URGENCES_CI: NumeroUrgence[] = [
  { code: 'samu', libelle: 'SAMU', libelle_court: 'SAMU', description: 'Urgence médicale', numero: '185', icone: 'ambulance' },
  {
    code: 'pompiers',
    libelle: 'Sapeurs-pompiers',
    libelle_court: 'Pompiers',
    description: 'Accident, incendie, secours',
    numero: '180',
    icone: 'pompiers',
  },
];

const paysBientot = (code: string, nom: string, indicatif: string, fuseau: string): Pays => ({
  code,
  nom,
  indicatif,
  fuseau,
  devise: 'XOF',
  langues: ['fr'],
  statut: 'bientot',
  resume: null,
  urgences: [],
  support: { whatsapp: null, telephone: null, email: null },
});

export const PAYS: Pays[] = [
  {
    code: 'CI',
    nom: "Côte d'Ivoire",
    indicatif: '+225',
    fuseau: FUSEAU_DEMO,
    devise: 'XOF',
    langues: ['fr'],
    statut: 'ouvert',
    resume: 'Abidjan ouvert, autres villes bientôt',
    urgences: URGENCES_CI,
    // Coordonnées du support à fournir par le client : non renseignées dans la démo.
    support: { whatsapp: null, telephone: null, email: null },
  },
  paysBientot('SN', 'Sénégal', '+221', 'Africa/Dakar'),
  paysBientot('BF', 'Burkina Faso', '+226', 'Africa/Ouagadougou'),
  paysBientot('ML', 'Mali', '+223', 'Africa/Bamako'),
  { ...paysBientot('CM', 'Cameroun', '+237', 'Africa/Douala'), devise: 'XAF' },
  paysBientot('TG', 'Togo', '+228', 'Africa/Lome'),
  paysBientot('BJ', 'Bénin', '+229', 'Africa/Porto-Novo'),
  { ...paysBientot('GN', 'Guinée', '+224', 'Africa/Conakry'), devise: 'GNF' },
];

/**
 * Référentiel d'assurances de la démo (Côte d'Ivoire), groupé par type comme l'écran
 * ChoixAssurances : 2 régimes publics, 6 mutuelles, 10 assureurs privés (18 au total,
 * « Ajouter (18 au total) » de la maquette Filtres). Seuls CMU et MUGEF-CI sont des noms
 * réels ; les autres sont des emplacements entre crochets, comme dans les maquettes.
 */
const lettres = 'ABCDEFGHIJ'.split('');
export const ASSURANCES_CI: Assurance[] = [
  { id: 'as_0001', slug: 'cmu', nom: 'CMU', type: 'publique', logo: null },
  { id: 'as_0002', slug: 'mugef-ci', nom: 'MUGEF-CI', type: 'publique', logo: null },
  ...lettres.slice(0, 6).map((l, i): Assurance => ({
    id: `as_01${String(i + 1).padStart(2, '0')}`,
    slug: `mutuelle-${l.toLowerCase()}`,
    nom: `[Mutuelle ${l}]`,
    type: 'mutuelle',
    logo: null,
  })),
  ...lettres.map((l, i): Assurance => ({
    id: `as_02${String(i + 1).padStart(2, '0')}`,
    slug: `prive-${l.toLowerCase()}`,
    nom: `[Assureur privé ${l}]`,
    type: 'privee',
    logo: null,
  })),
];

/** « Mes assurances » du profil fictif des maquettes (MUGEF-CI, CMU). */
export const MES_ASSURANCES_DEMO = ['mugef-ci', 'cmu'];

export const VILLES: Ville[] = [
  { id: 'abj', pays_code: 'CI', nom: 'Abidjan', statut: 'ouverte', latitude: 5.33, longitude: -4.02, nombre_communes: 13 },
  { id: 'bke', pays_code: 'CI', nom: 'Bouaké', statut: 'bientot', latitude: 7.69, longitude: -5.03, nombre_communes: 0 },
  { id: 'yam', pays_code: 'CI', nom: 'Yamoussoukro', statut: 'bientot', latitude: 6.82, longitude: -5.28, nombre_communes: 0 },
];

/** Localités non couvertes, pour l'écran « zone pas encore couverte » (détection). */
export const LOCALITES_NON_COUVERTES = [
  { nom: 'Bouaké', latitude: 7.69, longitude: -5.03 },
  { nom: 'Yamoussoukro', latitude: 6.82, longitude: -5.28 },
  { nom: 'Korhogo', latitude: 9.46, longitude: -5.63 },
  { nom: 'San-Pédro', latitude: 4.75, longitude: -6.64 },
  { nom: 'Daloa', latitude: 6.88, longitude: -6.45 },
];

/** Rectangle de couverture d'Abidjan (fictif, simplifié). */
export const CADRE_ABIDJAN = { minLat: 5.2, maxLat: 5.6, minLng: -4.35, maxLng: -3.8 };

type CommuneDemo = { id: string; nom: string; pharmacies: number; gardes: number; distanceKm: number; cap: number };

/** Compteurs repris des maquettes (Zone, ZoneCommunes, CarteZoom). Fictifs. */
const COMMUNES_BRUTES: CommuneDemo[] = [
  { id: 'abj-abobo', nom: 'Abobo', pharmacies: 36, gardes: 4, distanceKm: 10, cap: 335 },
  { id: 'abj-adjame', nom: 'Adjamé', pharmacies: 24, gardes: 3, distanceKm: 6, cap: 285 },
  { id: 'abj-anyama', nom: 'Anyama', pharmacies: 9, gardes: 1, distanceKm: 18, cap: 345 },
  { id: 'abj-attecoube', nom: 'Attécoubé', pharmacies: 12, gardes: 2, distanceKm: 8, cap: 268 },
  { id: 'abj-bingerville', nom: 'Bingerville', pharmacies: 11, gardes: 1, distanceKm: 12, cap: 85 },
  { id: 'abj-cocody', nom: 'Cocody', pharmacies: 48, gardes: 6, distanceKm: 0, cap: 0 },
  { id: 'abj-koumassi', nom: 'Koumassi', pharmacies: 19, gardes: 2, distanceKm: 9, cap: 165 },
  { id: 'abj-marcory', nom: 'Marcory', pharmacies: 21, gardes: 3, distanceKm: 7, cap: 185 },
  { id: 'abj-plateau', nom: 'Plateau', pharmacies: 14, gardes: 2, distanceKm: 4, cap: 240 },
  { id: 'abj-port-bouet', nom: 'Port-Bouët', pharmacies: 15, gardes: 2, distanceKm: 14, cap: 172 },
  { id: 'abj-songon', nom: 'Songon', pharmacies: 5, gardes: 1, distanceKm: 28, cap: 265 },
  { id: 'abj-treichville', nom: 'Treichville', pharmacies: 18, gardes: 2, distanceKm: 8, cap: 215 },
  { id: 'abj-yopougon', nom: 'Yopougon', pharmacies: 52, gardes: 7, distanceKm: 13, cap: 278 },
];

export const COMMUNES = COMMUNES_BRUTES.map((c) => ({
  id: c.id,
  nom: c.nom,
  pharmacies: c.pharmacies,
  gardes: c.gardes,
  ...decaler(REFERENCE, c.distanceKm * 1000, c.cap),
}));

const semaine = (ouverture: string, fermeture: string, jours = [1, 2, 3, 4, 5, 6]): PlageHoraire[] =>
  jours.map((jour) => ({ jour, ouverture, fermeture }));
const tousLesJours = [0, 1, 2, 3, 4, 5, 6];

export type PharmacieDemo = {
  id: string;
  nom: string;
  adresse: string;
  distanceM: number;
  cap: number;
  h24: boolean;
  horaires: PlageHoraire[];
  /** null = pas de garde ; '' = toute la nuit ; '02:00' = jusqu'à 02:00. */
  garde: string | null;
  services: string[];
  /** Slugs du référentiel ; `tp` = tiers payant. */
  assurances: { slug: string; tp?: boolean }[];
  note: { moyenne: number; nombre: number } | null;
  whatsapp: boolean;
};

export const PHARMACIES: PharmacieDemo[] = [
  {
    id: 'ph_0101',
    nom: 'Pharmacie du Centre',
    adresse: '123, avenue de la Paix, Cocody',
    distanceM: 440,
    cap: 45,
    h24: true,
    horaires: [],
    garde: null,
    services: ['ordonnances', 'assurances', 'conseil'],
    // 7 assurances, comme la maquette Detail (« Assurances acceptées (7) »).
    assurances: [
      { slug: 'mugef-ci', tp: true },
      { slug: 'cmu' },
      { slug: 'prive-a' },
      { slug: 'mutuelle-a' },
      { slug: 'mutuelle-b' },
      { slug: 'prive-b' },
      { slug: 'prive-c' },
    ],
    note: { moyenne: 4.7, nombre: 120 },
    whatsapp: true,
  },
  {
    id: 'ph_0142',
    nom: 'Pharmacie de la Paix',
    adresse: 'Rue des Jardins, Cocody Danga',
    distanceM: 700,
    cap: 225,
    h24: false,
    horaires: semaine('08:00', '22:00'),
    garde: '',
    services: ['ordonnances', 'assurances', 'conseil'],
    assurances: [{ slug: 'mugef-ci', tp: true }, { slug: 'cmu' }],
    note: null,
    whatsapp: true,
  },
  {
    id: 'ph_0155',
    nom: 'Grande Pharmacie',
    adresse: 'Boulevard Latrille, Cocody',
    distanceM: 1180,
    cap: 140,
    h24: false,
    horaires: semaine('07:00', '19:30'),
    garde: null,
    services: ['ordonnances', 'conseil'],
    assurances: [{ slug: 'prive-a' }, { slug: 'prive-b' }],
    note: null,
    whatsapp: false,
  },
  {
    id: 'ph_0163',
    nom: 'Pharmacie des Oliviers',
    adresse: 'Rue des Oliviers, Cocody',
    distanceM: 1100,
    cap: 100,
    h24: false,
    horaires: semaine('08:00', '21:00'),
    garde: '',
    services: ['ordonnances', 'assurances'],
    assurances: [{ slug: 'mugef-ci', tp: true }, { slug: 'cmu' }],
    note: null,
    whatsapp: true,
  },
  {
    id: 'ph_0170',
    nom: 'Pharmacie des Nations',
    adresse: 'Carrefour des Nations, Cocody',
    distanceM: 1290,
    cap: 165,
    h24: false,
    horaires: semaine('08:00', '21:00'),
    garde: '02:00',
    services: ['ordonnances', 'conseil'],
    assurances: [{ slug: 'cmu' }],
    note: null,
    whatsapp: false,
  },
  {
    id: 'ph_0178',
    nom: 'Pharmacie Espoir',
    adresse: 'Rue de l’Espoir, Cocody',
    distanceM: 1500,
    cap: 305,
    h24: false,
    horaires: semaine('08:00', '21:30'),
    garde: '01:00',
    services: ['ordonnances', 'assurances', 'conseil'],
    assurances: [{ slug: 'mugef-ci', tp: true }, { slug: 'prive-a' }, { slug: 'prive-b' }],
    note: null,
    whatsapp: true,
  },
  {
    id: 'ph_0186',
    nom: 'Pharmacie Sainte-Marie',
    adresse: 'Allée Sainte-Marie, Cocody',
    distanceM: 2100,
    cap: 20,
    h24: false,
    horaires: semaine('08:00', '20:30'),
    garde: '',
    services: ['ordonnances'],
    assurances: [{ slug: 'cmu' }, { slug: 'prive-a' }, { slug: 'prive-b' }],
    note: null,
    whatsapp: false,
  },
  {
    id: 'ph_0193',
    nom: 'Pharmacie du Lycée',
    adresse: 'Avenue du Lycée, Cocody',
    distanceM: 2420,
    cap: 250,
    h24: false,
    horaires: semaine('08:00', '21:00'),
    garde: '02:00',
    services: ['ordonnances', 'conseil'],
    assurances: [{ slug: 'mugef-ci', tp: true }],
    note: null,
    whatsapp: true,
  },
  {
    id: 'ph_0201',
    nom: 'Pharmacie des Deux-Plateaux',
    adresse: 'Rue des Deux-Plateaux, Cocody',
    distanceM: 1750,
    cap: 330,
    h24: false,
    horaires: semaine('08:00', '22:00', tousLesJours),
    garde: null,
    services: ['ordonnances', 'assurances', 'conseil'],
    assurances: [{ slug: 'mugef-ci', tp: true }, { slug: 'cmu' }, { slug: 'prive-a' }, { slug: 'prive-b' }],
    note: null,
    whatsapp: true,
  },
  {
    id: 'ph_0208',
    nom: 'Pharmacie Riviera Palmeraie',
    adresse: 'Rue de la Palmeraie, Riviera',
    distanceM: 2650,
    cap: 80,
    h24: false,
    horaires: semaine('08:00', '21:00'),
    garde: null,
    services: ['ordonnances', 'conseil'],
    assurances: [{ slug: 'prive-a' }, { slug: 'prive-b' }],
    note: null,
    whatsapp: false,
  },
  {
    id: 'ph_0215',
    nom: 'Pharmacie Saint-Jacques',
    adresse: 'Avenue Saint-Jacques, Cocody',
    distanceM: 3100,
    cap: 200,
    h24: false,
    horaires: semaine('07:30', '20:00'),
    garde: null,
    services: ['ordonnances', 'assurances'],
    assurances: [{ slug: 'cmu' }],
    note: null,
    whatsapp: false,
  },
  {
    id: 'ph_0222',
    nom: 'Pharmacie des Ambassades',
    adresse: 'Rue des Ambassades, Cocody',
    distanceM: 3600,
    cap: 285,
    h24: false,
    horaires: semaine('08:00', '22:00', tousLesJours),
    garde: null,
    services: ['ordonnances', 'conseil'],
    assurances: [{ slug: 'mugef-ci', tp: true }, { slug: 'prive-a' }, { slug: 'prive-b' }],
    note: null,
    whatsapp: true,
  },
];

export const FAVORIS_PAR_DEFAUT = ['ph_0101', 'ph_0155'];
