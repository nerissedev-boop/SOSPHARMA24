/**
 * Outils de test (Jest + React Native Testing Library) : fournisseurs de l'app
 * (cache de requêtes neuf, thème forcé, zone sûre). Jamais importé par l'app.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FournisseurTheme, type NomTheme } from '../../theme/Theme';

const METRIQUES = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export function creerClientTest(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity }, mutations: { retry: false } },
  });
}

export async function rendre(element: ReactElement, options: { theme?: NomTheme; client?: QueryClient } = {}) {
  const client = options.client ?? creerClientTest();
  return {
    client,
    ...(await render(
      <SafeAreaProvider initialMetrics={METRIQUES}>
        <QueryClientProvider client={client}>
          <FournisseurTheme forcer={options.theme ?? 'jour'}>{element}</FournisseurTheme>
        </QueryClientProvider>
      </SafeAreaProvider>,
    )),
  };
}
