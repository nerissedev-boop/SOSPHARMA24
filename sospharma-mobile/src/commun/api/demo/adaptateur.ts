/**
 * Adaptateur de démonstration (EXPO_PUBLIC_API_MOCK=1, actif par défaut).
 *
 * Il se branche à la place de `fetch` dans le client : mêmes routes /api/v1/...
 * (specs/architecture.md, « Routes et CRUD »), même enveloppe JSON, mêmes codes
 * d'erreur. Le reste de l'app (client, hooks, cache, réactions aux erreurs) tourne
 * donc exactement comme avec l'API réelle. Toutes les données sont FICTIVES.
 */
import { distanceMetres, marcheMinutes } from '../../lib/geo';
import { stockage } from '../../lib/stockage';
import { heureLocale, isoUtc, localVersUtc } from '../../lib/temps';
import { calculerStatut } from '../../regles/statut';
import type {
  AssurancePharmacie,
  Compte,
  Meta,
  CorpsReleveApi,
  NouvelleProposition,
  Pharmacie,
  PharmacieProche,
  PharmacieResume,
  Proposition,
  ReleveApi,
  StatutReleve,
  TourGarde,
  Zone,
  ZoneDetectee,
} from '../schema';
import type { CodeErreurApi } from '../types';
import {
  ASSURANCES_CI,
  CADRE_ABIDJAN,
  COMMUNES,
  decaler,
  FAVORIS_PAR_DEFAUT,
  FUSEAU_DEMO,
  LOCALITES_NON_COUVERTES,
  PAYS,
  PHARMACIES,
  REFERENCE,
  TELEPHONE_FICTIF,
  VILLES,
  type PharmacieDemo,
} from './donnees';

type Reponse = { status: number; json: () => Promise<unknown> };
type Requete = {
  methode: string;
  chemin: string;
  params: Record<string, string>;
  corps: unknown;
  entetes: Record<string, string>;
};

let compteurRequetes = 0;
/** Latence simulée (ms). Mise à 0 dans les tests. */
let latence = process.env.NODE_ENV === 'test' ? 0 : 250;
/** Horloge de la démo (remplaçable dans les tests). */
let horloge: () => Date = () => new Date();

export function reglerDemo(options: { latence?: number; maintenant?: () => Date }): void {
  if (options.latence !== undefined) latence = options.latence;
  if (options.maintenant) horloge = options.maintenant;
}

const signalementsDuJour: Record<string, number> = {};
let compteurMessages = 0;

function meta(extra: Partial<Meta> = {}): Meta {
  compteurRequetes += 1;
  return {
    request_id: `req_demo_${compteurRequetes.toString(36).padStart(5, '0')}`,
    generated_at: isoUtc(horloge()),
    ...extra,
  };
}

function ok(data: unknown, status = 200, extra: Partial<Meta> = {}): Reponse {
  const corps = { success: true, data, meta: meta(extra) };
  return { status, json: async () => corps };
}

function erreur(status: number, code: CodeErreurApi, message: string, details?: Record<string, unknown>): Reponse {
  const corps = { success: false, error: { code, message, ...(details ? { details } : {}) }, meta: meta() };
  return { status, json: async () => corps };
}

function analyser(url: string, init: RequestInit): Requete {
  const sansBase = url.replace(/^https?:\/\/[^/]+/, '');
  const [cheminComplet = '', requete = ''] = sansBase.split('?');
  const chemin = cheminComplet.replace(/^\/api\/v1/, '');
  const params: Record<string, string> = {};
  for (const morceau of requete.split('&')) {
    if (!morceau) continue;
    const [cle = '', valeur = ''] = morceau.split('=');
    params[decodeURIComponent(cle)] = decodeURIComponent(valeur.replace(/\+/g, ' '));
  }
  let corps: unknown = undefined;
  if (typeof init.body === 'string') {
    try {
      corps = JSON.parse(init.body);
    } catch {
      corps = undefined;
    }
  } else if (init.body) {
    corps = init.body;
  }
  const entetes: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries((init.headers ?? {}) as Record<string, string>)) entetes[cle.toLowerCase()] = valeur;
  return { methode: (init.method ?? 'GET').toUpperCase(), chemin, params, corps, entetes };
}

// ----- Tour de garde : du samedi 08:00 au samedi suivant 08:00, heure locale ------
function tourEnCours(maintenant: Date): { debut: string; fin: string } {
  const local = heureLocale(maintenant, FUSEAU_DEMO);
  let recul = (local.jourSemaine - 6 + 7) % 7;
  if (recul === 0 && local.heures < 8) recul = 7;
  const base = new Date(Date.UTC(local.annee, local.mois - 1, local.jourDuMois - recul));
  const debut = localVersUtc(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), 8, 0, FUSEAU_DEMO);
  const fin = new Date(debut.getTime() + 7 * 24 * 3600 * 1000);
  return { debut: isoUtc(debut), fin: isoUtc(fin) };
}

function position(params: Record<string, string>): { latitude: number; longitude: number } | null {
  const lat = Number(params.lat);
  const lng = Number(params.lng);
  if (!params.lat || !params.lng || Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { latitude: lat, longitude: lng };
}

// ----- Assurances : référentiel, « Mes assurances » de l'appareil (gardées dans MMKV) -----
const CLE_MES_ASSURANCES = 'demo.mesAssurances';

function mesAssurances(): string[] | null {
  const brut = stockage().getString(CLE_MES_ASSURANCES);
  if (!brut) return null;
  try {
    const liste = JSON.parse(brut) as unknown;
    return Array.isArray(liste) ? liste.filter((x): x is string => typeof x === 'string') : null;
  } catch {
    return null;
  }
}

function assurancesDe(p: PharmacieDemo): AssurancePharmacie[] {
  return p.assurances.flatMap((a) => {
    const ref = ASSURANCES_CI.find((x) => x.slug === a.slug);
    return ref ? [{ id: ref.id, slug: ref.slug, nom: ref.nom, type: ref.type, tiers_payant: a.tp === true }] : [];
  });
}

function versResume(p: PharmacieDemo, depuis: { latitude: number; longitude: number } | null): PharmacieResume {
  const maintenant = horloge();
  const tour = tourEnCours(maintenant);
  const coord = decaler(REFERENCE, p.distanceM, p.cap);
  const gardes = p.garde !== null ? [tour] : [];
  const statut = calculerStatut({ h24: p.h24, horaires: p.horaires, gardes }, maintenant, FUSEAU_DEMO);
  const distance = depuis ? distanceMetres(depuis, coord) : null;
  return {
    id: p.id,
    nom: p.nom,
    adresse: p.adresse,
    commune: 'Cocody',
    commune_id: 'abj-cocody',
    ville: 'Abidjan',
    ...coord,
    telephone: TELEPHONE_FICTIF,
    whatsapp: p.whatsapp ? TELEPHONE_FICTIF : null,
    h24: p.h24,
    statut: statut.statut,
    prochaine_ouverture: statut.prochaine_ouverture,
    ferme_a: statut.ferme_a,
    garde:
      p.garde !== null
        ? { ...tour, jusqua: p.garde === '' ? null : p.garde, confirmee_le: tour.debut }
        : null,
    horaires: p.horaires,
    gardes,
    assurances: assurancesDe(p),
    accepte_mes_assurances: (() => {
      const miennes = mesAssurances();
      if (!miennes || miennes.length === 0) return null;
      return p.assurances.some((a) => miennes.includes(a.slug));
    })(),
    distance_m: distance,
    marche_min: distance === null ? null : marcheMinutes(distance),
    // Démo : aucune photo de façade (pastille de statut à la place de la vignette).
    photo_url: null,
  };
}

function versFiche(p: PharmacieDemo, depuis: { latitude: number; longitude: number } | null): Pharmacie {
  return {
    ...versResume(p, depuis),
    pays_code: 'CI',
    services: p.services,
    verifiee_le: tourEnCours(horloge()).debut,
    note: p.note,
  };
}

function trierParDistance(liste: PharmacieResume[]): PharmacieResume[] {
  return [...liste].sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0));
}

function appliquerFiltres(liste: PharmacieResume[], params: Record<string, string>): PharmacieResume[] {
  const statuts = (params['filter[statut]'] ?? '').split(',').filter(Boolean);
  const h24 = params['filter[h24]'] === '1';
  // filter[assurances]=mugef-ci,cmu : pharmacies qui acceptent AU MOINS UNE des assurances.
  const assurances = (params['filter[assurances]'] ?? '').split(',').filter(Boolean);
  return liste.filter((p) => {
    if (statuts.length && !statuts.includes(p.statut)) return false;
    if (h24 && !p.h24) return false;
    if (assurances.length && !assurances.some((a) => p.assurances.some((x) => x.slug === a))) return false;
    return true;
  });
}

function favoris(): string[] {
  const brut = stockage().getString('demo.favoris');
  if (!brut) return FAVORIS_PAR_DEFAUT;
  try {
    const liste = JSON.parse(brut) as unknown;
    return Array.isArray(liste) ? liste.filter((x): x is string => typeof x === 'string') : FAVORIS_PAR_DEFAUT;
  } catch {
    return FAVORIS_PAR_DEFAUT;
  }
}

function enregistrerFavoris(liste: string[]): void {
  stockage().set('demo.favoris', JSON.stringify(liste));
}

function zones(depuis: { latitude: number; longitude: number } | null, q: string): Zone[] {
  const recherche = q.trim().toLocaleLowerCase('fr');
  return COMMUNES.filter((c) => !recherche || c.nom.toLocaleLowerCase('fr').includes(recherche)).map((c) => ({
    id: c.id,
    ville_id: 'abj',
    nom: c.nom,
    type: 'commune' as const,
    latitude: c.latitude,
    longitude: c.longitude,
    nombre_pharmacies: c.pharmacies,
    nombre_gardes: c.gardes,
    distance_m: depuis ? distanceMetres(depuis, c) : null,
  }));
}

// ----- Agents terrain (connexion Sanctum fictive, relevés gardés dans MMKV) -----
const PREFIXE_JETON = 'demo_sanctum_';
const CLE_RELEVES = 'demo.releves';

function compteDemo(email: string): Compte {
  return {
    id: 'cp_0007',
    email,
    prenom: 'Koffi',
    nom: 'Yao',
    role: 'agent_terrain',
    villes: [{ id: 'abj', nom: 'Abidjan' }],
  };
}

function authentifie(r: Requete): boolean {
  return (r.entetes.authorization ?? '').startsWith(`Bearer ${PREFIXE_JETON}`);
}

/** Relevé tel que l'API le renvoie (ReleveResource), avec le corps reçu (null pour l'historique fictif). */
type ReleveStocke = ReleveApi & { corps: CorpsReleveApi | null };

/** Historique fictif de l'agent : 14 validés, 3 en vérification, 1 à corriger (maquette 23). */
function relevesInitiaux(maintenant: Date): ReleveStocke[] {
  const jour = 24 * 3600 * 1000;
  const date = (joursAvant: number, heures = 9) =>
    isoUtc(new Date(maintenant.getTime() - joursAvant * jour - (maintenant.getUTCHours() - heures) * 3600 * 1000));
  const base = (id: string, nom: string, commune: string, type: ReleveApi['type'], statut: StatutReleve, jours: number, commentaire: string | null = null): ReleveStocke => ({
    id,
    identifiant: `demo-${id}`,
    type,
    statut,
    commentaire,
    ville: { id: 'vi_abj', nom: 'Abidjan' },
    position: { lat: 5.36, lng: -3.98 },
    precision_m: 8,
    ajustement_m: 3,
    champs: { nom, quartier: commune },
    photos: [{ type: 'facade' }],
    releve_le: date(jours),
    recu_le: date(jours),
    traite_le: statut === 'envoye' ? null : date(jours),
    corps: null,
  });
  const liste: ReleveStocke[] = [
    base('rl_demo_01', 'Pharmacie Saint-Jean', 'Cocody', 'creation', 'a_corriger', 1, 'La photo de façade est floue : reprenez-la en journée.'),
    base('rl_demo_02', 'Pharmacie du Marché', 'Adjamé', 'mise_a_jour', 'envoye', 1),
    base('rl_demo_03', 'Pharmacie Riviera 3', 'Riviera', 'creation', 'valide', 2),
    base('rl_demo_04', 'Pharmacie des Palmiers', 'Marcory', 'creation', 'envoye', 3),
    base('rl_demo_05', 'Pharmacie Belle Ville', 'Marcory', 'mise_a_jour', 'envoye', 3),
  ];
  for (let i = 0; i < 13; i += 1) {
    liste.push(base(`rl_demo_v${String(i).padStart(2, '0')}`, `[Pharmacie relevée ${i + 1}]`, 'Cocody', i % 3 ? 'creation' : 'mise_a_jour', 'valide', 4 + i));
  }
  return liste;
}

function releves(): ReleveStocke[] {
  const brut = stockage().getString(CLE_RELEVES);
  if (brut) {
    try {
      const liste = JSON.parse(brut) as unknown;
      if (Array.isArray(liste)) return liste as ReleveStocke[];
    } catch {
      // données illisibles : on repart de l'historique fictif
    }
  }
  return relevesInitiaux(horloge());
}

function enregistrerReleves(liste: ReleveStocke[]): void {
  stockage().set(CLE_RELEVES, JSON.stringify(liste));
}

/** Nombre de relevés réellement créés par la démo (tests d'idempotence). */
export function nombreRelevesDemo(): number {
  return releves().filter((r) => r.corps !== null).length;
}

/** Remet à zéro les données d'agent de la démo (tests). */
export function reinitialiserDemoAgent(): void {
  stockage().remove(CLE_RELEVES);
  stockage().remove(CLE_MES_ASSURANCES);
  stockage().remove(CLE_PROPOSITIONS);
}

// ----- Propositions des usagers (sans compte) ------------------------------------------------

const CLE_PROPOSITIONS = 'demo.propositions';
const PROPOSITIONS_PAR_JOUR = 3;

/** Deux propositions déjà en ligne (maquette 29 : « Mes propositions (3), 2 en ligne, 1 en vérification »). */
function propositionsInitiales(maintenant: Date): Proposition[] {
  const jour = 24 * 3600 * 1000;
  const base = (id: string, nom: string, jours: number, pharmacie: string): Proposition => ({
    id,
    identifiant: id,
    statut: 'en_ligne',
    nom,
    ville: { id: 'abj', nom: 'Abidjan' },
    photo_facade_recue: true,
    pharmacie_id: pharmacie,
    motif_refus: null,
    envoyee_le: isoUtc(new Date(maintenant.getTime() - jours * jour)),
    traitee_le: isoUtc(new Date(maintenant.getTime() - (jours - 1) * jour)),
  });
  return [base('rl_demo_p1', 'Pharmacie des Deux-Plateaux', 9, PHARMACIES[4]?.id ?? 'ph_0101'), base('rl_demo_p2', 'Grande Pharmacie', 21, PHARMACIES[1]?.id ?? 'ph_0101')];
}

function propositions(): Proposition[] {
  const brut = stockage().getString(CLE_PROPOSITIONS);
  if (brut) {
    try {
      const liste = JSON.parse(brut) as unknown;
      if (Array.isArray(liste)) return liste as Proposition[];
    } catch {
      // données illisibles : on repart des propositions fictives
    }
  }
  return propositionsInitiales(horloge());
}

function enregistrerPropositions(liste: Proposition[]): void {
  stockage().set(CLE_PROPOSITIONS, JSON.stringify(liste));
}

function validerProposition(c: Partial<NouvelleProposition>): Record<string, string[]> | null {
  const details: Record<string, string[]> = {};
  if (typeof c.identifiant !== 'string' || c.identifiant.length < 8) details.identifiant = ['Identifiant manquant.'];
  if (typeof c.nom !== 'string' || c.nom.trim().length < 2) details.nom = ['Le nom est obligatoire.'];
  if (typeof c.precision_m !== 'number' || c.precision_m > 30) {
    details.precision_m = ['Position trop imprécise (plus de 30 m) : attendez quelques secondes à l’extérieur.'];
  }
  if (c.telephone && !/^\+\d{8,15}$/.test(c.telephone)) {
    details.telephone = ['Le téléphone doit être au format international, par exemple +2250102030405.'];
  }
  const { latitude, longitude, gps_latitude, gps_longitude } = c;
  if ([latitude, longitude, gps_latitude, gps_longitude].some((v) => typeof v !== 'number')) {
    details.latitude = ['Position manquante.'];
  } else if (distanceMetres({ latitude: latitude as number, longitude: longitude as number }, { latitude: gps_latitude as number, longitude: gps_longitude as number }) > 100) {
    details.latitude = ['Le repère est à plus de 100 m de votre position : envoyez la proposition depuis la pharmacie.'];
  }
  return Object.keys(details).length > 0 ? details : null;
}

/** Doublons fictifs autour de l'agent (maquette 25) : 12 m et 41 m de la position envoyée. */
function doublonsAutour(ici: { latitude: number; longitude: number }): PharmacieProche[] {
  const modele = PHARMACIES[0];
  if (!modele) return [];
  const fiches: { id: string; nom: string; adresse: string; distanceM: number; cap: number; verifiee: boolean }[] = [
    { id: 'ph_0301', nom: 'Pharmacie Bel Air', adresse: 'Boulevard Latrille, Cocody Angré', distanceM: 12, cap: 60, verifiee: true },
    { id: 'ph_0302', nom: 'Pharmacie Angré Château', adresse: 'Rue des Jardins, Cocody Angré', distanceM: 41, cap: 200, verifiee: false },
  ];
  return fiches.map((f) => {
    const coord = decaler(ici, f.distanceM, f.cap);
    const resume = versResume({ ...modele, id: f.id, nom: f.nom, adresse: f.adresse, h24: false, garde: null, horaires: modele.horaires, assurances: [{ slug: 'cmu' }, { slug: 'mugef-ci', tp: true }] }, ici);
    return {
      ...resume,
      ...coord,
      commune: 'Cocody Angré',
      distance_m: f.distanceM,
      marche_min: 1,
      verifiee_le: f.verifiee ? '2026-09-02T08:00:00Z' : null,
      photo_url: null,
    };
  });
}

/** Mêmes règles que EnregistrerReleveRequest et ReceptionReleves côté API. */
function validerReleve(c: Partial<CorpsReleveApi>): Record<string, string[]> | null {
  const erreurs: Record<string, string[]> = {};
  if (typeof c.identifiant !== 'string' || c.identifiant.length < 8) erreurs.identifiant = ['Identifiant du relevé manquant.'];
  if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number') erreurs.latitude = ['Position manquante.'];
  if (typeof c.precision_m !== 'number' || c.precision_m > 30) erreurs.precision_m = ['Position trop imprécise (plus de 30 m) : attendez un meilleur signal GPS.'];
  if (!c.champs || typeof c.champs.nom !== 'string' || c.champs.nom.trim().length < 2) erreurs['champs.nom'] = ['Indiquez le nom de la pharmacie.'];
  if (!c.pharmacie && !(c.champs?.adresse ?? '').trim()) erreurs['champs.adresse'] = ['Ce champ est obligatoire pour une nouvelle pharmacie.'];
  const inconnues = (c.champs?.assurances ?? []).filter((a) => !ASSURANCES_CI.some((x) => x.id === a.id)).map((a) => a.id);
  if (inconnues.length) erreurs['champs.assurances'] = [`Assurance inconnue dans ce pays : ${inconnues.join(', ')}.`];
  return Object.keys(erreurs).length ? erreurs : null;
}

function versReleveApi(r: ReleveStocke): ReleveApi {
  const { corps: _corps, ...reste } = r;
  return reste;
}

function router(r: Requete): Reponse {
  const { methode, chemin, params, corps } = r;
  const ici = position(params);
  let m: RegExpMatchArray | null;

  // ---------------- Territoire ----------------
  if (methode === 'GET' && chemin === '/pays') return ok(PAYS);
  if (methode === 'GET' && (m = chemin.match(/^\/pays\/([A-Z]{2})\/villes$/))) {
    return ok(VILLES.filter((v) => v.pays_code === m?.[1]));
  }
  if (methode === 'GET' && (m = chemin.match(/^\/villes\/([\w-]+)\/zones$/))) {
    if (m[1] !== 'abj') return ok([]);
    return ok(zones(ici, params.q ?? ''));
  }
  if (methode === 'GET' && (m = chemin.match(/^\/villes\/([\w-]+)\/compteurs$/))) {
    if (m[1] !== 'abj') return ok([]);
    return ok(
      COMMUNES.map((c) => ({
        zone_id: c.id,
        nom: c.nom,
        latitude: c.latitude,
        longitude: c.longitude,
        nombre_pharmacies: c.pharmacies,
        nombre_gardes: c.gardes,
      })),
    );
  }
  if (methode === 'GET' && chemin === '/zones/depuis-position') {
    if (!ici) return erreur(400, 'BAD_REQUEST', 'Position manquante.');
    const dedans =
      ici.latitude >= CADRE_ABIDJAN.minLat &&
      ici.latitude <= CADRE_ABIDJAN.maxLat &&
      ici.longitude >= CADRE_ABIDJAN.minLng &&
      ici.longitude <= CADRE_ABIDJAN.maxLng;
    if (!dedans) {
      const proche = [...LOCALITES_NON_COUVERTES].sort((a, b) => distanceMetres(ici, a) - distanceMetres(ici, b))[0];
      const ville = proche && distanceMetres(ici, proche) < 60000 ? proche.nom : null;
      return erreur(422, 'ZONE_NOT_COVERED', 'Cette zone n’est pas encore couverte.', { ville });
    }
    const liste = zones(ici, '').sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0));
    const zone = liste[0];
    const ville = VILLES[0];
    if (!zone || !ville) return erreur(500, 'SERVER_ERROR', 'Erreur de la démo.');
    const resultat: ZoneDetectee = { zone, ville, pays_code: 'CI' };
    return ok(resultat);
  }

  // ---------------- Pharmacies ----------------
  if (methode === 'GET' && chemin === '/pharmacies/proches') {
    if (!ici) return erreur(400, 'BAD_REQUEST', 'Position manquante.');
    // Vérification avant une proposition (rayon de 100 m) : mêmes pharmacies fictives qu'à l'étape 25 des agents.
    if (Number(params.rayon) <= 100) {
      const proches = doublonsAutour(ici);
      return ok(proches, 200, { rayon: 100, limite: 5, nombre: proches.length });
    }
    const rayon = Math.min(Number(params.rayon ?? 5000) || 5000, 10000);
    const limite = Math.min(Number(params.limite ?? 20) || 20, 50);
    const liste = trierParDistance(
      appliquerFiltres(
        PHARMACIES.map((p) => versResume(p, ici)),
        params,
      ).filter((p) => (p.distance_m ?? 0) <= rayon),
    ).slice(0, limite);
    return ok(liste, 200, { rayon, limite, nombre: liste.length });
  }
  if (methode === 'GET' && chemin === '/pharmacies/cadre') {
    const [minLng, minLat, maxLng, maxLat] = (params.bbox ?? '').split(',').map(Number);
    if ([minLng, minLat, maxLng, maxLat].some((x) => x === undefined || Number.isNaN(x))) {
      return erreur(400, 'BAD_REQUEST', 'Cadre de carte invalide.');
    }
    const liste = appliquerFiltres(
      PHARMACIES.map((p) => versResume(p, ici)),
      params,
    ).filter(
      (p) =>
        p.longitude !== null &&
        p.latitude !== null &&
        p.longitude >= (minLng as number) &&
        p.longitude <= (maxLng as number) &&
        p.latitude >= (minLat as number) &&
        p.latitude <= (maxLat as number),
    );
    return ok(liste.slice(0, 300), 200, { nombre: Math.min(liste.length, 300), tronque: liste.length > 300 });
  }
  if (methode === 'GET' && chemin === '/pharmacies/recherche') {
    const q = (params.q ?? '').trim().toLocaleLowerCase('fr');
    const liste = trierParDistance(
      PHARMACIES.map((p) => versResume(p, ici)).filter(
        (p) => !q || p.nom.toLocaleLowerCase('fr').includes(q) || p.adresse.toLocaleLowerCase('fr').includes(q),
      ),
    );
    return ok(liste, 200, { rayon: 5000, limite: 20, nombre: liste.length });
  }
  if (methode === 'GET' && (m = chemin.match(/^\/pharmacies\/(ph_\d+)$/))) {
    const p = PHARMACIES.find((x) => x.id === m?.[1]);
    if (!p) return erreur(404, 'NOT_FOUND', 'Cette pharmacie est introuvable.');
    return ok(versFiche(p, ici));
  }

  // Démo : pas de durée Google, l'app garde son estimation.
  if (methode === 'GET' && (m = chemin.match(/^\/pharmacies\/(ph_\d+)\/trajet$/))) {
    return ok({ voiture: null, source: null });
  }

  // ---------------- Gardes ----------------
  if (methode === 'GET' && chemin === '/gardes/en-cours') {
    if (params.ville && params.ville !== 'abj') return erreur(404, 'NOT_FOUND', 'Aucun tour de garde publié pour cette ville.');
    const tour = tourEnCours(horloge());
    const pharmacies = trierParDistance(PHARMACIES.filter((p) => p.garde !== null).map((p) => versResume(p, ici)));
    const resultat: TourGarde = { id: 'tg_demo', ville_id: 'abj', ...tour, confirme_le: tour.debut, pharmacies };
    return ok(resultat);
  }

  // ---------------- Signalements ----------------
  if (methode === 'POST' && (m = chemin.match(/^\/pharmacies\/(ph_\d+)\/signalements$/))) {
    const motif = (corps as { motif?: unknown } | undefined)?.motif;
    if (typeof motif !== 'string' || !motif) {
      return erreur(422, 'VALIDATION_FAILED', 'Certaines informations sont invalides.', {
        motif: ['Choisissez un motif de signalement.'],
      });
    }
    const jour = isoUtc(horloge()).slice(0, 10);
    signalementsDuJour[jour] = (signalementsDuJour[jour] ?? 0) + 1;
    if ((signalementsDuJour[jour] ?? 0) > 5) {
      return erreur(429, 'TOO_MANY_REQUESTS', 'Trop de signalements aujourd’hui. Réessayez demain.');
    }
    return ok({ id: `sg_${Date.now()}`, pharmacie_id: m[1], motif, cree_le: isoUtc(horloge()) }, 201);
  }

  // ---------------- Support ----------------
  if (methode === 'POST' && chemin === '/support/messages') {
    const c = (corps ?? {}) as { sujet?: unknown; message?: unknown };
    if (typeof c.message !== 'string' || c.message.trim().length < 3) {
      return erreur(422, 'VALIDATION_FAILED', 'Certaines informations sont invalides.', {
        message: ['Écrivez votre message.'],
      });
    }
    compteurMessages += 1;
    if (compteurMessages > 5) return erreur(429, 'TOO_MANY_REQUESTS', 'Trop de messages aujourd’hui. Réessayez demain.');
    return ok({ id: `ms_${compteurMessages}`, sujet: c.sujet ?? 'autre', cree_le: isoUtc(horloge()) }, 201);
  }
  if (methode === 'POST' && /^\/support\/messages\/[\w-]+\/capture$/.test(chemin)) {
    return ok({ recu: true }, 201);
  }

  // ---------------- Assurances ----------------
  if (methode === 'GET' && (m = chemin.match(/^\/pays\/([A-Z]{2})\/assurances$/))) {
    return ok(m[1] === 'CI' ? ASSURANCES_CI : []);
  }
  if (methode === 'GET' && chemin === '/appareils/moi/assurances') {
    const miennes = mesAssurances() ?? [];
    return ok(ASSURANCES_CI.filter((a) => miennes.includes(a.slug)));
  }
  if (methode === 'PUT' && chemin === '/appareils/moi/assurances') {
    // Comme l'API : des identifiants du référentiel (as_…). La démo garde les slugs en mémoire.
    const liste = (corps as { assurances?: unknown } | undefined)?.assurances;
    if (!Array.isArray(liste) || liste.some((x) => typeof x !== 'string' || !ASSURANCES_CI.some((a) => a.id === x))) {
      return erreur(422, 'VALIDATION_FAILED', 'Certaines informations sont invalides.', { assurances: ['Assurance inconnue.'] });
    }
    const choisies = ASSURANCES_CI.filter((a) => (liste as string[]).includes(a.id));
    stockage().set(CLE_MES_ASSURANCES, JSON.stringify(choisies.map((a) => a.slug)));
    return ok(choisies);
  }

  // ---------------- Comptes (agents terrain) ----------------
  if (methode === 'POST' && chemin === '/auth/connexion') {
    const c = (corps ?? {}) as { email?: unknown; mot_de_passe?: unknown };
    const details: Record<string, string[]> = {};
    if (typeof c.email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) details.email = ['Indiquez une adresse e-mail valide.'];
    if (typeof c.mot_de_passe !== 'string' || c.mot_de_passe.length < 4) details.mot_de_passe = ['Indiquez votre mot de passe.'];
    if (Object.keys(details).length) return erreur(422, 'VALIDATION_FAILED', 'Certaines informations sont invalides.', details);
    return ok({ jeton: `${PREFIXE_JETON}${Math.random().toString(36).slice(2, 12)}`, compte: compteDemo(c.email as string) });
  }
  if (methode === 'POST' && chemin === '/auth/mot-de-passe/oubli') return ok(null);
  if (chemin.startsWith('/auth/') || chemin.startsWith('/agent/')) {
    if (!authentifie(r)) return erreur(401, 'UNAUTHENTICATED', 'Votre session a expiré. Reconnectez-vous.');
  }
  if (methode === 'POST' && chemin === '/auth/deconnexion') return ok(null);
  if (methode === 'GET' && chemin === '/auth/moi') return ok(compteDemo('k.yao@sospharma24.ci'));

  // ---------------- Relevés ----------------
  if (methode === 'GET' && chemin === '/agent/pharmacies/proches') {
    if (!ici) return erreur(400, 'BAD_REQUEST', 'Position manquante.');
    const liste = doublonsAutour(ici);
    return ok(liste, 200, { rayon: 100, limite: 20, nombre: liste.length });
  }
  if (methode === 'POST' && chemin === '/agent/releves') {
    const c = (corps ?? {}) as Partial<CorpsReleveApi>;
    const details = validerReleve(c);
    if (details) return erreur(422, 'VALIDATION_FAILED', 'Certaines informations sont invalides.', details);
    const liste = releves();
    const existant = liste.find((x) => x.identifiant === c.identifiant);
    // Idempotence : un renvoi avec le même identifiant renvoie le relevé déjà reçu (200, meta.deja_recu).
    if (existant) return ok(versReleveApi(existant), 200, { deja_recu: true });
    const zone = COMMUNES.find((x) => distanceMetres({ latitude: x.latitude, longitude: x.longitude }, { latitude: c.latitude as number, longitude: c.longitude as number }) < 3000);
    const nouveau: ReleveStocke = {
      id: `re_demo_${Math.random().toString(36).slice(2, 10)}`,
      identifiant: c.identifiant as string,
      type: c.pharmacie ? 'mise_a_jour' : 'creation',
      statut: 'envoye',
      commentaire: null,
      ville: { id: 'vi_abj', nom: 'Abidjan' },
      position: { lat: c.latitude as number, lng: c.longitude as number },
      precision_m: c.precision_m as number,
      ajustement_m: c.ajustement_m ?? null,
      champs: { ...(c.champs ?? {}), quartier: zone?.nom ?? null },
      photos: [],
      releve_le: c.releve_le ?? isoUtc(horloge()),
      recu_le: isoUtc(horloge()),
      traite_le: null,
      corps: c as CorpsReleveApi,
    };
    enregistrerReleves([nouveau, ...liste]);
    return ok(versReleveApi(nouveau), 201);
  }
  if (methode === 'POST' && (m = chemin.match(/^\/agent\/releves\/([\w-]+)\/photos$/))) {
    const liste = releves();
    const cible = liste.find((x) => x.id === m?.[1]);
    if (!cible) return erreur(404, 'NOT_FOUND', 'Ce relevé est introuvable.');
    const type = (typeof FormData !== 'undefined' && corps instanceof FormData ? String(corps.get('type') ?? 'facade') : 'facade') as ReleveApi['photos'][number]['type'];
    if (!cible.photos.some((p) => p.type === type)) cible.photos.push({ type });
    enregistrerReleves(liste);
    return ok({ id: `rp_demo_${type}`, type, metadonnees_supprimees: true }, 201);
  }
  if (methode === 'GET' && chemin === '/agent/releves') {
    const statut = params['filter[statut]'];
    const liste = releves()
      .filter((x) => !statut || x.statut === statut)
      .sort((a, b) => b.releve_le.localeCompare(a.releve_le))
      .map(versReleveApi);
    return ok(liste, 200, { next_cursor: null, prev_cursor: null });
  }

  // ---------------- Propositions des usagers ----------------
  if (chemin === '/propositions' || chemin.startsWith('/propositions/')) {
    if (!r.entetes['x-device-token']) return erreur(401, 'UNAUTHENTICATED', 'Appareil non reconnu.');
  }
  if (methode === 'POST' && chemin === '/propositions') {
    const c = (corps ?? {}) as Partial<NouvelleProposition>;
    const details = validerProposition(c);
    if (details) return erreur(422, 'VALIDATION_FAILED', 'Certaines informations sont invalides.', details);
    const liste = propositions();
    const existante = liste.find((x) => x.identifiant === c.identifiant);
    if (existante) return ok(existante, 200, { deja_recu: true });
    const aujourdhui = isoUtc(horloge()).slice(0, 10);
    if (liste.filter((x) => x.envoyee_le.startsWith(aujourdhui)).length >= PROPOSITIONS_PAR_JOUR) {
      return erreur(429, 'TOO_MANY_REQUESTS', `Vous avez atteint la limite de ${PROPOSITIONS_PAR_JOUR} propositions par jour. Merci pour votre aide, réessayez demain.`);
    }
    const nouvelle: Proposition = {
      id: `rl_demo_${Math.random().toString(36).slice(2, 10)}`,
      identifiant: c.identifiant as string,
      statut: 'en_verification',
      nom: (c.nom as string).trim(),
      ville: { id: 'abj', nom: 'Abidjan' },
      photo_facade_recue: false,
      pharmacie_id: null,
      motif_refus: null,
      envoyee_le: isoUtc(horloge()),
      traitee_le: null,
    };
    enregistrerPropositions([nouvelle, ...liste]);
    return ok(nouvelle, 201);
  }
  if (methode === 'POST' && (m = chemin.match(/^\/propositions\/([\w-]+)\/photo$/))) {
    const liste = propositions();
    const cible = liste.find((x) => x.id === m?.[1]);
    if (!cible) return erreur(404, 'NOT_FOUND', 'Cette proposition est introuvable.');
    cible.photo_facade_recue = true;
    enregistrerPropositions(liste);
    return ok({ type: 'facade' }, 201);
  }
  if (methode === 'GET' && chemin === '/propositions') {
    const liste = [...propositions()].sort((a, b) => b.envoyee_le.localeCompare(a.envoyee_le));
    return ok(liste, 200, { next_cursor: null, prev_cursor: null });
  }

  // ---------------- Appareils, notifications, favoris ----------------
  if (methode === 'POST' && chemin === '/appareils') {
    const c = (corps ?? {}) as { ville_suivie?: string };
    return ok(
      { jeton: `dev_demo_${Math.random().toString(36).slice(2, 10)}`, ville_suivie: c.ville_suivie ?? 'abj', commune_defaut: null, notification_garde: true },
      201,
    );
  }
  if (methode === 'PATCH' && chemin === '/appareils/moi') {
    const c = (corps ?? {}) as Record<string, unknown>;
    return ok({
      jeton: 'dev_demo',
      ville_suivie: (c.ville_suivie as string) ?? 'abj',
      commune_defaut: (c.commune_defaut as string) ?? null,
      notification_garde: c.notification_garde !== false,
    });
  }
  if (methode === 'DELETE' && chemin === '/appareils/moi') return ok(null);
  if (methode === 'GET' && chemin === '/appareils/moi/favoris') {
    const ids = favoris();
    return ok(PHARMACIES.filter((p) => ids.includes(p.id)).map((p) => versResume(p, ici)));
  }
  if (methode === 'POST' && chemin === '/appareils/moi/favoris') {
    const id = (corps as { pharmacie_id?: unknown } | undefined)?.pharmacie_id;
    if (typeof id !== 'string' || !PHARMACIES.some((p) => p.id === id)) {
      return erreur(422, 'VALIDATION_FAILED', 'Pharmacie inconnue.', { pharmacie_id: ['Pharmacie inconnue.'] });
    }
    enregistrerFavoris([...new Set([...favoris(), id])]);
    return ok({ pharmacie_id: id }, 201);
  }
  if (methode === 'DELETE' && (m = chemin.match(/^\/appareils\/moi\/favoris\/(ph_\d+)$/))) {
    enregistrerFavoris(favoris().filter((x) => x !== m?.[1]));
    return ok(null);
  }

  return erreur(404, 'NOT_FOUND', 'Route inconnue de l’adaptateur de démonstration.');
}

export async function transportDemo(url: string, init: RequestInit): Promise<Reponse> {
  if (latence > 0) await new Promise((r) => setTimeout(r, latence));
  if (init.signal?.aborted) throw new Error('Requête annulée');
  try {
    return router(analyser(url, init));
  } catch {
    return erreur(500, 'SERVER_ERROR', 'Erreur interne de la démonstration.');
  }
}
