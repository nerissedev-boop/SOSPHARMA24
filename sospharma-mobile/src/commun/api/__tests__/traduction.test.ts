/**
 * Traduction API Laravel -> modèle de l'app, vérifiée sur de VRAIES réponses de l'API locale
 * (reponses-api/*.json, jetons remplacés par « jeton-de-test »).
 */
import { avecTraduction, type ReponseTransport } from '../client';
import type { Appareil, Connexion, Pays, Pharmacie, PharmacieResume, TourGarde, Zone, ZoneDetectee } from '../schema';
import compteurs from './reponses-api/compteurs.json';
import connexion from './reponses-api/connexion.json';
import depuis from './reponses-api/depuis.json';
import fiche from './reponses-api/fiche.json';
import gardes from './reponses-api/gardes.json';
import pays from './reponses-api/pays.json';
import proches from './reponses-api/proches.json';
import appareil from './reponses-api/appareils_post.json';
import zones from './reponses-api/zones.json';
import villes from './reponses-api/villes.json';

const BASE = 'http://api.test/api/v1';

/** Transport factice : renvoie `reponse` et garde la requête réellement envoyée. */
function transportFactice(reponse: unknown, status = 200) {
  const envoye: { url?: string; init?: RequestInit } = {};
  const transport = avecTraduction(async (url, init): Promise<ReponseTransport> => {
    envoye.url = url;
    envoye.init = init;
    return { status, json: async () => reponse };
  });
  return { transport, envoye };
}

async function lire<T>(reponse: unknown, chemin: string, init: RequestInit = { method: 'GET' }) {
  const { transport, envoye } = transportFactice(reponse);
  const json = (await (await transport(`${BASE}${chemin}`, init)).json()) as { data: T };
  return { data: json.data, envoye };
}

describe('traduction des réponses de l’API', () => {
  it('pharmacies proches : position, commune, ville, horaires, fermeture, assurances', async () => {
    const { data } = await lire<PharmacieResume[]>(proches, '/pharmacies/proches?lat=5.355&lng=-3.97');
    const p = data[0] as PharmacieResume;
    expect(p).toEqual(
      expect.objectContaining({
        id: 'ph_test01',
        commune: 'Cocody',
        commune_id: 'zo_cocody',
        ville: 'Abidjan',
        latitude: 5.359,
        longitude: -3.964,
      }),
    );
    expect(Array.isArray(p.horaires) && p.horaires.length > 0).toBe(true);
    expect(p).toHaveProperty('ferme_a');
    expect(Array.isArray(p.gardes)).toBe(true);
    expect(p.assurances[0]).toEqual(expect.objectContaining({ slug: expect.any(String), tiers_payant: expect.any(Boolean) }));
  });

  it('fiche : services, photo, champs de la fiche', async () => {
    const { data } = await lire<Pharmacie>(fiche, '/pharmacies/ph_test01');
    expect(data).toEqual(expect.objectContaining({ id: 'ph_test01', ville: 'Abidjan', services: expect.any(Array), photo_url: null, note: null }));
  });

  it('pays : numéros d’urgence avec icône et description, résumé et support de l’API', async () => {
    const { data } = await lire<Pays[]>(pays, '/pays');
    const ci = data[0] as Pays;
    expect(ci.urgences[0]).toEqual(expect.objectContaining({ code: 'samu', numero: '185', icone: 'ambulance', description: 'Urgence médicale' }));
    expect(ci.resume).toBe('Abidjan ouvert');
    expect(ci.support).toEqual({ whatsapp: null, telephone: null, email: null });
  });

  it('villes : nombre de communes donné par l’API', async () => {
    const { data } = await lire<{ id: string; nombre_communes: number; latitude: number }[]>(villes, '/pays/CI/villes');
    expect(data[0]).toEqual(expect.objectContaining({ id: 'vi_abj', nombre_communes: 13, latitude: 5.345317 }));
  });

  it('communes : centre, compteurs et distance calculée depuis la position demandée', async () => {
    const { data } = await lire<Zone[]>(zones, '/villes/vi_abj/zones?lat=5.355&lng=-3.97');
    const abobo = data.find((z) => z.nom === 'Abobo') as Zone;
    expect(abobo).toEqual(expect.objectContaining({ ville_id: 'vi_abj', nombre_pharmacies: 2, nombre_gardes: 1, latitude: 5.42 }));
    expect(abobo.distance_m).toBeGreaterThan(5000);
  });

  it('commune détectée et compteurs', async () => {
    const { data: d } = await lire<ZoneDetectee>(depuis, '/zones/depuis-position?lat=5.355&lng=-3.97');
    expect(d.zone.nom).toBe('Cocody');
    expect(d.ville.nom).toBe('Abidjan');
    expect(d.pays_code).toBe('CI');
    const { data: c } = await lire<{ zone_id: string; nombre_pharmacies: number }[]>(compteurs, '/villes/vi_abj/compteurs');
    expect(c[0]).toEqual(expect.objectContaining({ zone_id: 'zo_abobo', nombre_pharmacies: 2 }));
  });

  it('tour de garde : ville, dernière confirmation, pharmacies traduites', async () => {
    const { data } = await lire<TourGarde>(gardes, '/gardes/en-cours?ville=vi_abj');
    expect(data).toEqual(expect.objectContaining({ id: 'tg_test_semaine', ville_id: 'vi_abj', confirme_le: '2026-10-23T20:00:00Z' }));
    expect(data.pharmacies[0]).toEqual(expect.objectContaining({ statut: 'garde', garde: expect.objectContaining({ jusqua: null }) }));
  });

  it('enregistrement de l’appareil : corps et jeton', async () => {
    const corps = { identifiant: '7d0c2a8e-1b5f-4c3a-9e2d-6f1a8b9c0d11', jeton_expo: null, ville_suivie: 'vi_abj', plateforme: 'android' };
    const { data, envoye } = await lire<Appareil>(appareil, '/appareils', { method: 'POST', body: JSON.stringify(corps) });
    expect(JSON.parse(envoye.init?.body as string)).toEqual({
      identifiant_anonyme: corps.identifiant,
      jeton_expo: null,
      ville: 'vi_abj',
      plateforme: 'android',
    });
    expect(data).toEqual({ jeton: 'jeton-de-test', ville_suivie: null, commune_defaut: null, notification_garde: true });
  });

  it('connexion de l’agent : password, et prénom tiré du nom', async () => {
    const { data, envoye } = await lire<Connexion>(connexion, '/auth/connexion', {
      method: 'POST',
      body: JSON.stringify({ email: 'agent@test', mot_de_passe: 'secret', appareil: 'mobile' }),
    });
    expect(JSON.parse(envoye.init?.body as string)).toEqual({ email: 'agent@test', password: 'secret', nom_appareil: 'mobile' });
    expect(data.compte).toEqual(expect.objectContaining({ prenom: 'Agent', nom: 'terrain Abidjan (test)', role: 'agent_terrain' }));
  });
});

describe('traduction des requêtes vers l’API', () => {
  it('« Ouvertes » (ouvertes et de garde) : filtre retiré de la requête puis appliqué à la réponse', async () => {
    const { data, envoye } = await lire<PharmacieResume[]>(proches, '/pharmacies/proches?lat=5.355&lng=-3.97&filter[statut]=ouverte,garde');
    expect(envoye.url).not.toContain('filter');
    expect(data.every((p) => p.statut !== 'fermee')).toBe(true);
  });

  it('rayon ramené au maximum de l’API (5 km)', async () => {
    const { envoye } = await lire(proches, '/pharmacies/proches?lat=5.355&lng=-3.97&rayon=10000');
    expect(envoye.url).toContain('rayon=5000');
  });

  it('motif de signalement, sujet du support et favori au vocabulaire de l’API', async () => {
    const corps = async (chemin: string, valeur: object) =>
      JSON.parse((await lire({ success: true, data: {} }, chemin, { method: 'POST', body: JSON.stringify(valeur) })).envoye.init?.body as string);
    expect(await corps('/pharmacies/ph_1/signalements', { motif: 'tel', precisions: null })).toEqual({ motif: 'mauvais_telephone', precisions: null });
    expect(await corps('/support/messages', { sujet: 'idee', message: 'Une idée', contact: null })).toEqual(
      expect.objectContaining({ sujet: 'suggestion' }),
    );
    expect(await corps('/appareils/moi/favoris', { pharmacie_id: 'ph_1' })).toEqual({ pharmacie: 'ph_1' });
  });

  it('laisse passer les erreurs de l’API et les routes déjà au format de l’API', async () => {
    const erreur = { success: false, error: { code: 'VALIDATION_FAILED', message: 'x' }, meta: { request_id: 'r', generated_at: 'g' } };
    const { data } = await lire(erreur, '/pays');
    expect(data).toBeUndefined();
    const { envoye } = await lire({ success: true, data: [] }, '/agent/releves?per_page=50');
    expect(envoye.url).toBe(`${BASE}/agent/releves?per_page=50`);
  });
});
