#!/usr/bin/env node
/**
 * Génère des composants react-native-svg à partir du jeu Healthicons (licence MIT,
 * voir LICENSE-healthicons), au format Iconify : icons[nom].body, viewBox 0 0 48 48,
 * fill="currentColor". Chaque composant reçoit `color` et `size` en props.
 *
 * Usage : npm run icones:generer [-- chemin/vers/healthicons-icons.json]
 * Par défaut : ../design/healthicons-icons.json (dépôt des maquettes).
 * Pour ajouter une icône : ajoutez son nom à la liste ICONES puis relancez.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] ?? join(racine, '..', 'design', 'healthicons-icons.json'));
const sortie = join(racine, 'src/commun/ui/icones/healthicons.tsx');

/** Icônes utilisées par les maquettes (les variantes colorées de design/icones/ = prop color). */
const ICONES = [
  'pharmacy',
  'pharmacy-outline',
  'phone',
  'geo-location',
  'geo-location-outline',
  'walking',
  'vespa-motorcycle',
  'home',
  'home-outline',
  'ui-user-profile',
  'ui-user-profile-outline',
  'emergency-post',
  'ambulance',
  'accident-and-emergency',
  'medical-search-outline',
  'prescription-document-outline',
  'insurance-card-outline',
  'medicines-outline',
  'medicine-mortar',
  'hospital-symbol',
  'star-small',
];

const BALISES = { g: 'G', path: 'Path', circle: 'Circle', rect: 'Rect', ellipse: 'Ellipse', polygon: 'Polygon' };

const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const pascal = (s) => s.split('-').map((m) => m[0].toUpperCase() + m.slice(1)).join('');

function versJsx(corps) {
  const utilisees = new Set(['Svg']);
  const jsx = corps.replace(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g, (_, fermeture, balise, attributs, auto) => {
    const nom = BALISES[balise];
    if (!nom) throw new Error(`Balise non gérée : ${balise}`);
    utilisees.add(nom);
    if (fermeture) return `</${nom}>`;
    const attrs = [...attributs.matchAll(/([\w:-]+)="([^"]*)"/g)]
      .map(([, cle, valeur]) => {
        const c = camel(cle);
        if (valeur === 'currentColor') return `${c}={color}`;
        return `${c}="${valeur}"`;
      })
      .join(' ');
    return `<${nom}${attrs ? ` ${attrs}` : ''}${auto ? ' /' : ''}>`;
  });
  return { jsx, utilisees };
}

const json = JSON.parse(readFileSync(source, 'utf8'));
const taille = json.width ?? 48;
const composants = [];
const toutes = new Set(['Svg']);

for (const nom of ICONES) {
  const icone = json.icons[nom];
  if (!icone) throw new Error(`Icône introuvable dans Healthicons : ${nom}`);
  const { jsx, utilisees } = versJsx(icone.body);
  utilisees.forEach((u) => toutes.add(u));
  composants.push({ nom, composant: `Hi${pascal(nom)}`, jsx });
}

const importsSvg = [...toutes].filter((x) => x !== 'Svg').sort();
const fichier = `// Fichier généré par scripts/generer-icones.mjs à partir de Healthicons (MIT, voir LICENSE-healthicons).
// Ne pas modifier à la main : relancez \`npm run icones:generer\`.
import Svg, { ${importsSvg.join(', ')} } from 'react-native-svg';

export type PropsIcone = {
  size?: number;
  color?: string;
  accessibilityLabel?: string;
  testID?: string;
};

function props(p: PropsIcone) {
  return {
    width: p.size ?? 24,
    height: p.size ?? 24,
    viewBox: '0 0 ${taille} ${taille}',
    testID: p.testID,
    accessible: Boolean(p.accessibilityLabel),
    accessibilityLabel: p.accessibilityLabel,
    accessibilityElementsHidden: !p.accessibilityLabel,
    importantForAccessibility: p.accessibilityLabel ? ('yes' as const) : ('no-hide-descendants' as const),
  };
}

${composants
  .map(
    (c) => `/** Healthicons « ${c.nom} ». */
export function ${c.composant}({ color = '#1A1A1A', ...p }: PropsIcone) {
  return (
    <Svg {...props(p)}>
      ${c.jsx}
    </Svg>
  );
}`,
  )
  .join('\n\n')}

export const healthicons = {
${composants.map((c) => `  '${c.nom}': ${c.composant},`).join('\n')}
} as const;

export type NomHealthicon = keyof typeof healthicons;
`;

writeFileSync(sortie, fichier);
console.log(`${composants.length} icônes générées dans ${sortie}`);
