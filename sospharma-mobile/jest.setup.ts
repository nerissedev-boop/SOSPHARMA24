/* Configuration commune des tests Jest. */

// Animations (Reanimated) : module natif. Son mock officiel (4.7) charge la variante native
// et échoue sous jest-expo ; ce mock minimal couvre ce qu'utilise `commun/ui/animations.ts`.
// Les animations y prennent tout de suite leur valeur finale : les tests voient l'état au repos.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  const valeur = <T,>(v: T) => v;
  const constructeur = () => {
    const b: Record<string, unknown> = {};
    for (const m of ['duration', 'delay', 'reduceMotion', 'springify', 'damping']) b[m] = () => b;
    return b;
  };
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: valeur },
    View,
    createAnimatedComponent: valeur,
    useSharedValue: (initiale: number) => {
      const sv = { value: initiale, get: () => sv.value, set: (v: number) => { sv.value = v; } };
      return sv;
    },
    useAnimatedStyle: (fabrique: () => object) => fabrique(),
    useReducedMotion: () => false,
    cancelAnimation: () => undefined,
    withTiming: valeur,
    withSpring: valeur,
    withRepeat: valeur,
    withSequence: (...valeurs: number[]) => valeurs[valeurs.length - 1],
    withDelay: (_delai: number, v: number) => v,
    interpolate: (x: number, [a, b]: number[], [c, d]: number[]) => c + ((x - a) * (d - c)) / (b - a || 1),
    Easing: { out: valeur, in: valeur, inOut: valeur, quad: valeur, sin: valeur, linear: valeur },
    ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
    FadeInDown: constructeur(),
  };
});

// NetInfo : module natif, remplacé par son mock officiel.
jest.mock('@react-native-community/netinfo', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

// MMKV (Nitro) : pas de module natif sous Jest ; on utilise le stockage en mémoire fourni par MMKV.
jest.mock('react-native-mmkv', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createMockMMKV } = require('react-native-mmkv/lib/createMMKV/createMockMMKV');
  return { createMMKV: createMockMMKV };
});

// Sentry : désactivé dans les tests.
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  wrap: (c: unknown) => c,
}));

// Position : permission accordée (la démo utilise la position simulée de Cocody).
jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  Accuracy: { Balanced: 3, Highest: 5 },
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getLastKnownPositionAsync: jest.fn(async () => null),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 5.36, longitude: -3.98 } })),
  watchPositionAsync: jest.fn(async () => ({ remove: jest.fn() })),
}));

// Trousseau sécurisé (jeton de l'agent) : stockage en mémoire.
jest.mock('expo-secure-store', () => {
  const valeurs = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (cle: string) => valeurs.get(cle) ?? null),
    setItemAsync: jest.fn(async (cle: string, valeur: string) => void valeurs.set(cle, valeur)),
    deleteItemAsync: jest.fn(async (cle: string) => void valeurs.delete(cle)),
  };
});

// Identifiants de relevé : UUID v4 de Node.
jest.mock('expo-crypto', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  randomUUID: () => require('crypto').randomUUID(),
}));

// Réduction des photos : pas de module natif sous Jest.
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
  ImageManipulator: {
    manipulate: jest.fn(() => ({
      resize: jest.fn(),
      renderAsync: jest.fn(async () => ({
        saveAsync: jest.fn(async () => ({ uri: 'file:///cache/reduite.jpg', width: 1600, height: 1200 })),
      })),
    })),
  },
}));
