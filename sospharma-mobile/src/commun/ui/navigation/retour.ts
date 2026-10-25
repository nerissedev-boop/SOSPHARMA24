import { useRouter } from 'expo-router';
import { useCallback } from 'react';

/** Retour à l'écran précédent, ou à l'accueil si l'écran a été ouvert directement (lien, notification). */
export function useRetour() {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);
}

/** Ferme les modaux de zone et revient à l'accueil (choix de commune validé). */
export function useRevenirAccueil() {
  const router = useRouter();
  return useCallback(() => {
    if (router.canDismiss()) router.dismissTo('/');
    else router.replace('/');
  }, [router]);
}
