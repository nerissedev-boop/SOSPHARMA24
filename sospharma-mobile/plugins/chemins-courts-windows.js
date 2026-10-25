/**
 * Plugin de configuration Expo : chemins courts pour la compilation C++ sous Windows.
 *
 * Windows limite un chemin à 260 caractères et l'outil ninja du SDK Android ne sait pas
 * dépasser cette limite. En arm64-v8a, la compilation de react-native-gesture-handler
 * (module app) produit des dossiers de plus de 260 caractères et échoue.
 * Le plugin place le dossier de travail CMake du module app à la racine du disque
 * du projet (par exemple D:\cx), ce qui raccourcit chaque chemin d'environ 20 caractères.
 *
 * Il ne fait rien hors de Windows (EAS, macOS, Linux). Dossier modifiable avec
 * la variable d'environnement SOSPHARMA_CMAKE_DOSSIER.
 */
const path = require('path');
const { withAppBuildGradle } = require('expo/config-plugins');

const MARQUEUR = '// sospharma: chemins-courts-windows';

module.exports = function cheminsCourtsWindows(config) {
  if (process.platform !== 'win32') return config;
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.contents.includes(MARQUEUR)) return cfg;
    const dossier = (process.env.SOSPHARMA_CMAKE_DOSSIER || path.join(path.parse(process.cwd()).root, 'cx')).replace(/\\/g, '/');
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /android\s*\{\n/,
      (debut) => `${debut}    ${MARQUEUR}\n    externalNativeBuild { cmake { buildStagingDirectory = file("${dossier}") } }\n`,
    );
    return cfg;
  });
};
