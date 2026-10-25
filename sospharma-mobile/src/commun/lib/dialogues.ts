import { create } from 'zustand';

/**
 * Boîtes de dialogue de l'app, affichées en feuille aux couleurs de la charte
 * (`HoteDialogues` dans `commun/ui`) à la place des alertes natives d'Android.
 * `alerte()` reprend la signature de `Alert.alert` (titre, message, boutons) : un appel
 * se remplace à l'identique. Un seul dialogue à la fois ; un nouvel appel remplace l'ancien.
 */
export type StyleBoutonDialogue = 'default' | 'cancel' | 'destructive';

export type BoutonDialogue = {
  text: string;
  style?: StyleBoutonDialogue;
  onPress?: () => void;
};

export type Dialogue = {
  /** Change à chaque appel : la feuille se rejoue même si le texte est identique. */
  cle: number;
  titre: string;
  message?: string;
  boutons: BoutonDialogue[];
};

type EtatDialogues = {
  /** Dernier dialogue demandé, gardé après la fermeture le temps de son animation. */
  courant: Dialogue | null;
  ouvert: boolean;
  ouvrir: (d: Omit<Dialogue, 'cle'>) => void;
  fermer: () => void;
};

let compteur = 0;

export const useDialogues = create<EtatDialogues>()((set) => ({
  courant: null,
  ouvert: false,
  ouvrir: (d) => set({ courant: { ...d, cle: ++compteur }, ouvert: true }),
  fermer: () => set({ ouvert: false }),
}));

/** Remplace `Alert.alert` : sans bouton, un seul « OK » ferme le dialogue. */
export function alerte(titre: string, message?: string, boutons?: BoutonDialogue[]) {
  useDialogues.getState().ouvrir({ titre, message, boutons: boutons?.length ? boutons : [] });
}
