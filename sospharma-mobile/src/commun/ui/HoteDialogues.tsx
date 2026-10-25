import { useDialogues, type BoutonDialogue } from '../lib/dialogues';
import { t } from '../lib/i18n';
import { Bouton, type VarianteBouton } from './Bouton';
import { Feuille } from './Feuille';

const VARIANTE: Record<NonNullable<BoutonDialogue['style']>, VarianteBouton> = {
  default: 'principal',
  destructive: 'danger',
  cancel: 'secondaire',
};

/**
 * Affiche le dialogue demandé par `alerte()` dans une feuille de la charte.
 * Monté une fois, à la racine de l'app. L'action principale vient en premier,
 * « Annuler » en dernier ; un dialogue sans bouton n'a qu'un « OK ».
 */
export function HoteDialogues() {
  const courant = useDialogues((e) => e.courant);
  const ouvert = useDialogues((e) => e.ouvert);
  const fermer = useDialogues((e) => e.fermer);
  const boutons: BoutonDialogue[] = courant?.boutons.length ? courant.boutons : [{ text: t('commun.ok') }];
  const annulation = boutons.find((b) => b.style === 'cancel');
  const ordonnes = [...boutons.filter((b) => b.style !== 'cancel'), ...(annulation ? [annulation] : [])];
  // Un seul bouton (information) : il est neutre, la feuille n'impose aucune action.
  const seul = ordonnes.length === 1;
  // Plusieurs choix (« Ouvrir avec ») : seul le premier est en vert plein, les autres en vert clair.
  const premierAction = ordonnes.findIndex((b) => !b.style || b.style === 'default');
  const variante = (b: BoutonDialogue, i: number): VarianteBouton => {
    if (seul && !b.style) return 'secondaire';
    if ((!b.style || b.style === 'default') && i !== premierAction) return 'clair';
    return VARIANTE[b.style ?? 'default'];
  };

  const choisir = (b: BoutonDialogue) => {
    fermer();
    b.onPress?.();
  };

  return (
    <Feuille
      visible={ouvert}
      onFermer={() => (annulation ? choisir(annulation) : fermer())}
      titre={courant?.titre}
      message={courant?.message}
      croix={false}
      testID="dialogue"
      pied={ordonnes.map((b, i) => (
        <Bouton
          key={`${b.text}-${i}`}
          libelle={b.text}
          variante={variante(b, i)}
          typo={variante(b, i) === 'clair' ? 'corpsFort' : undefined}
          icone={b.style === 'cancel' ? 'annuler' : undefined}
          onPress={() => choisir(b)}
          testID={`dialogue-bouton-${i}`}
        />
      ))}
    />
  );
}
