import { Redirect } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';

import { useSession } from '../../lib/preferences';
import { BarreOnglets, type CleOnglet } from '../BarreOnglets';

/** Nom des routes de app/(onglets)/ pour chaque onglet. */
const ROUTES: Record<CleOnglet, string> = {
  accueil: 'index',
  carte: 'carte',
  urgence: 'urgence',
  garde: 'garde',
  profil: 'profil',
  releves: 'releves',
};
const CLES = Object.fromEntries(Object.entries(ROUTES).map(([cle, route]) => [route, cle])) as Record<string, CleOnglet>;

function Barre({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const route = state.routes[state.index];
  return (
    <BarreOnglets
      actif={route ? (CLES[route.name] ?? null) : null}
      onSelection={(cle) => {
        const cible = state.routes.find((r) => r.name === ROUTES[cle]);
        if (!cible) return;
        const evenement = emitter.emit({ type: 'tabPress', target: cible.key, canPreventDefault: true });
        if (!evenement.defaultPrevented && route?.key !== cible.key) navigateToTab(cible.key);
      }}
    />
  );
}

/** Navigateur à onglets (app/(onglets)/_layout.tsx). Le splash passe en premier à chaque lancement. */
export default function DispositionOnglets() {
  const demarrageFait = useSession((e) => e.demarrageFait);
  if (!demarrageFait) return <Redirect href="/demarrage" />;
  return (
    <Tabs tabBar={(props) => <Barre {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="carte" />
      <Tabs.Screen name="urgence" />
      <Tabs.Screen name="garde" />
      <Tabs.Screen name="profil" />
      <Tabs.Screen name="releves" />
    </Tabs>
  );
}
