#!/usr/bin/env node
/**
 * Détecte la police Vonca (fichier sous licence, fourni par le client) dans assets/fonts/
 * et génère src/commun/theme/polices-vonca.ts.
 *
 * Metro ne sait pas faire un `require` conditionnel sur un fichier absent : ce script
 * écrit les `require` seulement pour les fichiers présents. Il tourne avant `npm start`
 * (script prestart) et peut être lancé à la main : `npm run polices:detecter`.
 *
 * Fichiers reconnus (otf ou ttf) : Vonca-SemiBold, Vonca-Bold, Vonca-ExtraBold.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const graisses = { 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold' };
const lignes = [];

for (const [poids, nom] of Object.entries(graisses)) {
  for (const ext of ['otf', 'ttf']) {
    const relatif = `assets/fonts/Vonca-${nom}.${ext}`;
    if (existsSync(join(racine, relatif))) {
      lignes.push(`  ${poids}: { famille: 'Vonca-${nom}', source: require('../../../${relatif}') },`);
      break;
    }
  }
}

const contenu = `// Fichier généré par scripts/detecter-vonca.mjs. Ne pas modifier à la main.
// Vonca présente : ${lignes.length > 0 ? 'oui' : 'non (repli Urbanist)'}.
${lignes.length > 0 ? '/* eslint-disable @typescript-eslint/no-require-imports */\n' : ''}export const POLICES_VONCA: Partial<Record<600 | 700 | 800, { famille: string; source: number }>> = {
${lignes.join('\n')}
};
`;

writeFileSync(join(racine, 'src/commun/theme/polices-vonca.ts'), contenu);
console.log(`Vonca : ${lignes.length} graisse(s) détectée(s).`);
