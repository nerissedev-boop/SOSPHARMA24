import type { StyleSpecification } from '@maplibre/maplibre-react-native';

import { config } from '../lib/config';
import { jetonsJour, jetonsNuit, type Jetons } from './jetons';

/**
 * Style MapLibre aux couleurs de la charte (jour et nuit).
 *
 * Ordre de priorité :
 * 1. EXPO_PUBLIC_MAP_STYLE_URL (et EXPO_PUBLIC_MAP_STYLE_URL_NUIT) : style complet hébergé
 *    (ex. style MapTiler personnalisé aux couleurs de la charte) ;
 * 2. EXPO_PUBLIC_MAP_TILES_URL : tuiles vectorielles au schéma OpenMapTiles, en adresse {z}/{x}/{y}
 *    ou en fichier TileJSON
 *    (ex. MapTiler, ou un fichier PMTiles servi par o2switch) ; le style est construit ici ;
 * 3. sinon, style local minimal de repli : fond uni de la charte, sans tuiles.
 */
export function styleCarte(nuit: boolean): string | StyleSpecification {
  const url = nuit ? config.styleCarteNuit || config.styleCarteJour : config.styleCarteJour;
  if (url) return url;
  const c = nuit ? jetonsNuit : jetonsJour;
  if (config.tuilesCarte) return styleVectoriel(c, config.tuilesCarte, process.env.EXPO_PUBLIC_MAP_GLYPHS_URL ?? '');
  return styleMinimal(c);
}

export function styleMinimal(c: Jetons): StyleSpecification {
  return {
    version: 8,
    name: 'SOS Pharma 24 (repli)',
    sources: {},
    layers: [{ id: 'fond', type: 'background', paint: { 'background-color': c.carteFond } }],
  };
}

export function styleVectoriel(c: Jetons, tuiles: string, glyphes: string): StyleSpecification {
  const routes = (classes: string[], largeur: number, couleur: string) => ({
    type: 'line' as const,
    source: 'osm',
    'source-layer': 'transportation',
    filter: ['in', ['get', 'class'], ['literal', classes]] as unknown as never,
    layout: { 'line-cap': 'round' as const, 'line-join': 'round' as const },
    paint: {
      'line-color': couleur,
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, largeur / 4, 16, largeur] as unknown as number,
    },
  });
  const style: StyleSpecification = {
    version: 8,
    name: 'SOS Pharma 24',
    sources: {
      // Adresse de tuiles ({z}/{x}/{y}) ou fichier TileJSON (adresse stable d'un fournisseur
      // dont les tuiles sont versionnées, comme OpenFreeMap : https://tiles.openfreemap.org/planet).
      osm: tuiles.includes('{z}')
        ? { type: 'vector', tiles: [tuiles], maxzoom: 14, attribution: '© OpenStreetMap' }
        : { type: 'vector', url: tuiles, attribution: '© OpenMapTiles © OpenStreetMap' },
    },
    layers: [
      { id: 'fond', type: 'background', paint: { 'background-color': c.carteFond } },
      { id: 'parcs', type: 'fill', source: 'osm', 'source-layer': 'park', paint: { 'fill-color': c.carteParc } },
      { id: 'eau', type: 'fill', source: 'osm', 'source-layer': 'water', paint: { 'fill-color': c.carteLagune } },
      { id: 'routes-mineures', ...routes(['minor', 'service', 'tertiary'], 7, c.carteRouteSecondaire) },
      { id: 'routes-principales', ...routes(['motorway', 'trunk', 'primary', 'secondary'], 16, c.carteRoute) },
    ],
  };
  if (glyphes) {
    style.glyphs = glyphes;
    style.layers.push(
      {
        id: 'quartiers',
        type: 'symbol',
        source: 'osm',
        'source-layer': 'place',
        filter: ['in', ['get', 'class'], ['literal', ['suburb', 'neighbourhood', 'city', 'town']]] as unknown as never,
        layout: { 'text-field': ['get', 'name'] as unknown as string, 'text-size': 11, 'text-font': ['Noto Sans Regular'] },
        paint: { 'text-color': c.carteTexte },
      },
      {
        id: 'noms-eau',
        type: 'symbol',
        source: 'osm',
        'source-layer': 'water_name',
        layout: { 'text-field': ['get', 'name'] as unknown as string, 'text-size': 11, 'text-font': ['Noto Sans Italic'] },
        paint: { 'text-color': c.carteTexteEau },
      },
    );
  }
  return style;
}
