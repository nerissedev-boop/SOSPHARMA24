import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { signalerErreur, t } from '@/commun/lib';

export const CANAL_GARDE = 'tour-garde';

/** Affichage des notifications reçues app ouverte, et canal Android. */
export async function configurerNotifications(): Promise<void> {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL_GARDE, {
        name: t('notifications.canal'),
        // eslint-disable-next-line import/namespace -- réexport de expo-notifications non vu par le plugin import
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#1B8A3E',
      });
    }
  } catch (e) {
    signalerErreur(e, { etape: 'configurerNotifications' });
  }
}

/** Jeton Expo Push si l'autorisation est (ou vient d'être) accordée ; sinon null. */
export async function obtenirJetonExpo(demander: boolean): Promise<{ jeton: string | null; refuse: boolean }> {
  try {
    if (Platform.OS === 'web' || !Device.isDevice) return { jeton: null, refuse: false };
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted' && demander) status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return { jeton: null, refuse: status === 'denied' };
    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) return { jeton: null, refuse: false };
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { jeton: data, refuse: false };
  } catch (e) {
    signalerErreur(e, { etape: 'jetonExpo' });
    return { jeton: null, refuse: false };
  }
}
