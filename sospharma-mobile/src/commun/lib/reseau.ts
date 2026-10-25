import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

/** Vrai si l'appareil est en ligne (NetInfo, via onlineManager de TanStack Query). */
export function useEnLigne(): boolean {
  return useSyncExternalStore(
    (rappel) => onlineManager.subscribe(rappel),
    () => onlineManager.isOnline(),
    () => true,
  );
}
