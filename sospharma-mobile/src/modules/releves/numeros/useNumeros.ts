import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { donneesOuErreur, estErreurAppel, ErreurAppel, reactionPour, type TelephonePharmacie } from '@/commun/api';
import { t, useSessionAgent } from '@/commun/lib';
import { clesPharmacies } from '@/modules/pharmacies';

import { ajouterNumero, clesNumeros, lireNumeros, modifierNumero, retirerNumero } from './api';

/**
 * Message à montrer pour une erreur d'action : celui de l'API quand elle a répondu (en français,
 * affiché tel quel), sinon celui de l'app (réseau coupé, réponse illisible).
 */
export function messageErreur(e: unknown): string {
  if (estErreurAppel(e) && e.status !== null) return e.message;
  const reaction = reactionPour(e);
  return 'message' in reaction ? reaction.message : t('erreurs.generique');
}

/** Le premier de la liste est le principal ; les rangs suivent l'ordre. */
function ranger(liste: TelephonePharmacie[]): TelephonePharmacie[] {
  return liste.map((t, i) => ({ ...t, rang: i + 1, principal: i === 0 }));
}

/**
 * Numéros d'une fiche pour l'agent sur place. WhatsApp, principal et retrait s'affichent tout de suite
 * (mise à jour optimiste) et reviennent en arrière si l'API refuse ; la fiche publique et les listes
 * sont relues ensuite, puisque le numéro principal est celui du bouton « Appeler ».
 */
export function useNumeros(pharmacieId: string) {
  const client = useQueryClient();
  const agent = useSessionAgent((e) => e.agent);
  const cle = clesNumeros.pharmacie(pharmacieId);

  const requete = useQuery({
    queryKey: cle,
    queryFn: async () => donneesOuErreur(await lireNumeros(pharmacieId)),
    enabled: agent !== null && pharmacieId.length > 0,
  });

  const optimiste = (changer: (liste: TelephonePharmacie[]) => TelephonePharmacie[]) => async () => {
    await client.cancelQueries({ queryKey: cle });
    const avant = client.getQueryData<TelephonePharmacie[]>(cle);
    if (avant) client.setQueryData(cle, ranger(changer(avant)));
    return { avant };
  };
  const revenir = (_e: unknown, _v: unknown, contexte: { avant?: TelephonePharmacie[] } | undefined) => {
    if (contexte?.avant) client.setQueryData(cle, contexte.avant);
  };
  const relire = () => Promise.all([client.invalidateQueries({ queryKey: cle }), client.invalidateQueries({ queryKey: clesPharmacies.tout })]);

  const whatsapp = useMutation({
    mutationFn: async ({ telephone, valeur }: { telephone: TelephonePharmacie; valeur: boolean }) =>
      donneesOuErreur(await modifierNumero(pharmacieId, telephone.id, { whatsapp: valeur })),
    onMutate: ({ telephone, valeur }) =>
      optimiste((liste) =>
        liste.map((t) => (t.id === telephone.id ? { ...t, whatsapp: valeur, whatsapp_confirme_le: new Date().toISOString() } : t)),
      )(),
    onError: revenir,
    onSettled: relire,
  });

  const principal = useMutation({
    mutationFn: async (telephone: TelephonePharmacie) => donneesOuErreur(await modifierNumero(pharmacieId, telephone.id, { principal: true })),
    // Le numéro choisi passe en tête, les autres gardent leur ordre (comme l'API).
    onMutate: (telephone) => optimiste((liste) => [...liste.filter((t) => t.id === telephone.id), ...liste.filter((t) => t.id !== telephone.id)])(),
    onError: revenir,
    onSettled: relire,
  });

  const retrait = useMutation({
    mutationFn: async (telephone: TelephonePharmacie) => {
      const r = await retirerNumero(pharmacieId, telephone.id);
      // Déjà retiré (second envoi, autre agent) : c'est le résultat voulu.
      if (!r.success && r.error.code === 'NOT_FOUND') return null;
      return donneesOuErreur(r);
    },
    onMutate: (telephone) => optimiste((liste) => liste.filter((t) => t.id !== telephone.id))(),
    onError: revenir,
    onSettled: relire,
  });

  // Pas d'ajout optimiste : c'est l'API qui lit le numéro tapé et peut le refuser.
  const ajout = useMutation({
    mutationFn: async (corps: { numero: string; whatsapp?: boolean }) => {
      const r = await ajouterNumero(pharmacieId, corps);
      if (!r.success) throw new ErreurAppel(r.error, r.meta, r.status);
      return { telephone: r.data, dejaPresent: r.meta.deja_present === true };
    },
    onSuccess: ({ telephone }) =>
      client.setQueryData<TelephonePharmacie[]>(cle, (liste) =>
        liste ? (liste.some((t) => t.id === telephone.id) ? liste.map((t) => (t.id === telephone.id ? telephone : t)) : [...liste, telephone]) : [telephone],
      ),
    onSettled: relire,
  });

  return { ...requete, whatsapp, principal, retrait, ajout };
}
