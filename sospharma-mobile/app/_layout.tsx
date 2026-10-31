/**
 * Racine de l'app : polices, cache hors connexion (TanStack Query + MMKV), thème jour/nuit,
 * suivi des erreurs (Sentry), enregistrement de l'appareil et navigation (pile + modaux).
 * Les écrans eux-mêmes vivent dans src/modules ; les fichiers de app/ ne font qu'une ligne.
 */
import '@/commun/lib/i18n';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, type ReactNode } from 'react';

import { useReactionErreur } from '@/commun/api';
import {
  appliquerLangue,
  brancherReseauEtPremierPlan,
  creerClientRequetes,
  enveloppeSentry,
  initialiserSentry,
  installerGestionnaireGlobal,
  OPTIONS_PERSISTANCE,
  signalerErreur,
  usePreferences,
} from '@/commun/lib';
import { FournisseurTheme, policesACharger, useTheme } from '@/commun/theme';
import { HoteDialogues, useRetourAuDemarrage } from '@/commun/ui';
import { useEnregistrementAppareil } from '@/modules/notifications';
import { useSynchroniserMesAssurances } from '@/modules/pharmacies';
import { VerificationVisite } from '@/modules/signalements';
import { useEnvoiAutomatique, useVerifierSessionAgent } from '@/modules/releves';
import { usePaysCourant, useSynchroniserZone } from '@/modules/territoire';

initialiserSentry();
installerGestionnaireGlobal();
// Langue choisie dans le Profil (préférences lues de façon synchrone), avant le premier écran.
appliquerLangue(usePreferences.getState().langue);
SplashScreen.preventAutoHideAsync().catch((e: unknown) => signalerErreur(e));

const clientRequetes = creerClientRequetes();

/** Thème jour/nuit réglé sur le fuseau du pays (configuration de l'API). */
function ThemePays({ children }: { children: ReactNode }) {
  const { fuseau } = usePaysCourant();
  return <FournisseurTheme fuseau={fuseau}>{children}</FournisseurTheme>;
}

/**
 * Services de fond : appareil, zone détectée, réaction « zone non couverte »,
 * synchronisation de « Mes assurances », session et file d'envoi des relevés de l'agent.
 */
function Services() {
  const reagir = useReactionErreur();
  const surNonCouverte = useCallback((e: unknown) => void reagir(e), [reagir]);
  useEnregistrementAppareil();
  useSynchroniserZone(surNonCouverte);
  useSynchroniserMesAssurances();
  useVerifierSessionAgent();
  useEnvoiAutomatique();
  useRetourAuDemarrage();
  return null;
}

function Navigation() {
  const { couleurs } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: couleurs.fond } }}>
      <Stack.Screen name="(onglets)" />
      <Stack.Screen name="demarrage" options={{ animation: 'fade' }} />
      <Stack.Screen name="localisation" options={{ animation: 'fade' }} />
      <Stack.Screen name="pharmacie/[id]/index" />
      <Stack.Screen name="pharmacie/[id]/itineraire" />
      <Stack.Screen
        name="pharmacie/[id]/partager"
        options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }}
      />
      <Stack.Screen name="pharmacie/[id]/signaler" />
      <Stack.Screen name="zone/index" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="zone/communes" />
      <Stack.Screen name="zone/pays" />
      <Stack.Screen name="zone/non-couverte" />
      <Stack.Screen name="filtres" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="assurances" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="contact" />
      <Stack.Screen name="agent/connexion" />
      <Stack.Screen name="releve/position" options={{ gestureEnabled: false }} />
      <Stack.Screen name="releve/doublons" />
      <Stack.Screen name="releve/photos" />
      <Stack.Screen name="releve/fiche" />
      <Stack.Screen name="proposer" options={{ gestureEnabled: false }} />
      <Stack.Screen name="proposition/envoyee" options={{ gestureEnabled: false }} />
      <Stack.Screen name="propositions" />
    </Stack>
  );
}

function Racine() {
  const [policesChargees, erreurPolices] = useFonts(policesACharger);

  useEffect(() => brancherReseauEtPremierPlan(), []);

  useEffect(() => {
    if (erreurPolices) signalerErreur(erreurPolices, { etape: 'polices' });
    if (policesChargees || erreurPolices) SplashScreen.hideAsync().catch(() => undefined);
  }, [policesChargees, erreurPolices]);

  if (!policesChargees && !erreurPolices) return null;

  return (
    <PersistQueryClientProvider client={clientRequetes} persistOptions={OPTIONS_PERSISTANCE}>
      <ThemePays>
        <Services />
        <Navigation />
        <HoteDialogues />
        <VerificationVisite />
      </ThemePays>
    </PersistQueryClientProvider>
  );
}

export default enveloppeSentry(Racine);
