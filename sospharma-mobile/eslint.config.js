// Configuration ESLint (format « flat ») : base Expo + règles d'architecture du projet.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const MODULES = ['territoire', 'pharmacies', 'gardes', 'urgence', 'signalements', 'support', 'notifications', 'profil', 'releves'];

/**
 * Sens des dépendances vérifié pour le module Relevés (architecture : il dépend de Territoire
 * et de Pharmacies) ; aucun autre module ne dépend de lui (seules les routes de app/ l'importent).
 */
const DEPENDANCES_AUTORISEES = { releves: ['territoire', 'pharmacies'] };

const MESSAGE_MODULE =
  "Un module n'utilise que la partie publique d'un autre : importez '@/modules/<module>' (son index.ts), jamais ses fichiers internes.";

/** Règles communes : pas de chemins relatifs qui sortent du dossier courant, MapLibre seulement via commun/ui/carte. */
const motifsCommuns = [{ group: ['@/../app/*', '**/app/*'], message: "Le code de src/ n'importe jamais les routes de app/." }];
const motifSortieModule = {
  group: ['../../*'],
  message: "Utilisez l'alias '@/…' : un chemin relatif ne doit pas sortir du module.",
};
const cheminsCommuns = [
  {
    name: '@maplibre/maplibre-react-native',
    message: "La carte passe par '@/commun/ui/carte' (repli web et thème de la charte).",
  },
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*', 'android/*', 'ios/*', 'coverage/*', 'src/commun/api/schema.genere.ts'],
  },
  {
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.json' } },
    },
    rules: {
      // Charte : AUCUNE bordure (séparation par aplats, espacements, ombres légères).
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "Property[key.name=/^border(Top|Bottom|Left|Right|Start|End|Horizontal|Vertical)?Width$/][value.value!=0]",
          message: 'Charte SOS Pharma 24 : aucune bordure. Utilisez un aplat de couleur ou une ombre légère.',
        },
      ],
    },
  },
  // Le dossier commun n'importe aucun module.
  {
    files: ['src/commun/**/*.{ts,tsx}'],
    ignores: ['src/commun/ui/carte/**', 'src/commun/theme/styleCarte.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: cheminsCommuns,
          patterns: [
            ...motifsCommuns,
            { group: ['@/modules', '@/modules/*', '**/modules/*'], message: "« commun » n'importe aucun module." },
          ],
        },
      ],
    },
  },
  {
    files: ['src/commun/ui/carte/**/*.{ts,tsx}', 'src/commun/theme/styleCarte.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [...motifsCommuns, { group: ['@/modules', '@/modules/*'], message: "« commun » n'importe aucun module." }] },
      ],
    },
  },
  // Chaque module : partie publique des autres modules seulement.
  ...MODULES.map((nom) => ({
    files: [`src/modules/${nom}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: cheminsCommuns,
          patterns: [
            ...motifsCommuns,
            motifSortieModule,
            { group: ['@/modules/*/*', `!@/modules/${nom}/*`], message: MESSAGE_MODULE },
            ...(DEPENDANCES_AUTORISEES[nom]
              ? [
                  {
                    group: ['@/modules/*', ...DEPENDANCES_AUTORISEES[nom].map((m) => `!@/modules/${m}`), `!@/modules/${nom}`],
                    message: `Le module ${nom} ne dépend que de : ${DEPENDANCES_AUTORISEES[nom].join(', ')}.`,
                  },
                ]
              : nom === 'releves'
                ? []
                : [{ group: ['@/modules/releves', '@/modules/releves/*'], message: 'Aucun module ne dépend du module Relevés.' }]),
          ],
        },
      ],
    },
  })),
  // Tests : globals Jest.
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', 'jest.setup.ts'],
    languageOptions: { globals: { jest: 'readonly', describe: 'readonly', it: 'readonly', expect: 'readonly', beforeEach: 'readonly', afterEach: 'readonly', beforeAll: 'readonly' } },
  },
]);
