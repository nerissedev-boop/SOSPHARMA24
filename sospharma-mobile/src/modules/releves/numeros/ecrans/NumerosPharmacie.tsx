import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { estErreurAppel, reactionPour, type TelephonePharmacie } from '@/commun/api';
import { alerte, appeler, jourMois, t, telephoneLocal, useEnLigne, useSessionAgent } from '@/commun/lib';
import { CIBLE_TACTILE, espacements, rayons, useTheme } from '@/commun/theme';
import {
  avecErrorBoundary,
  BandeauHorsConnexion,
  Bouton,
  CaseACocher,
  ChampSaisie,
  Ecran,
  EnTete,
  EtatVide,
  Filtre,
  HiPhone,
  IconeActualiser,
  IconeCoche,
  SqueletteListe,
  Texte,
  useMargeBas,
  useRetour,
} from '@/commun/ui';
import { usePharmacie } from '@/modules/pharmacies';
import { useDeconnexionAgent } from '@/modules/releves/hooks/useSession';
import { usePaysCourant } from '@/modules/territoire';

import { messageErreur, useNumeros } from '../useNumeros';

type PropsLigne = {
  telephone: TelephonePharmacie;
  premiere: boolean;
  /** Hors connexion : on lit, on appelle, on ne modifie pas. */
  modifiable: boolean;
  onWhatsapp: (valeur: boolean) => void;
  onPrincipal: () => void;
  onRetirer: () => void;
};

function LigneNumero({ telephone, premiere, modifiable, onWhatsapp, onPrincipal, onRetirer }: PropsLigne) {
  const { couleurs: c } = useTheme();
  const { pays, fuseau } = usePaysCourant();
  const numero = telephoneLocal(telephone.numero, pays?.indicatif);
  const verifie = telephone.whatsapp_confirme_le;
  const dateVerification = verifie ? t('numeros.verifieLe', { date: jourMois(verifie, fuseau) }) : t('numeros.pasVerifie');
  const id = telephone.id;

  return (
    <View style={styles.ligne} testID={`numero-${id}`}>
      {premiere ? null : <View style={[styles.filet, { backgroundColor: c.separateur }]} />}
      <View style={styles.haut}>
        {/* Appuyer sur le numéro l'appelle : le plus sûr moyen de vérifier qu'il sonne à la pharmacie. */}
        <Pressable
          onPress={() => void appeler(telephone.numero, pays?.indicatif)}
          accessibilityRole="button"
          accessibilityLabel={t('numeros.appelerA11y', { numero })}
          style={({ pressed }) => [styles.numero, { opacity: pressed ? 0.7 : 1 }]}
          testID={`numero-${id}-appeler`}
        >
          <HiPhone size={20} color={c.pastilleActionIcone} />
          <Texte variante="nomGrand" style={styles.chiffres}>
            {numero}
          </Texte>
        </Pressable>
        {telephone.principal ? (
          <View style={styles.principal} testID={`numero-${id}-principal`}>
            <IconeCoche size={16} color={c.vertTexte} strokeWidth={2.6} />
            <Texte variante="petitFort" couleur={c.vertTexte}>
              {t('numeros.principal')}
            </Texte>
          </View>
        ) : modifiable ? (
          <Pressable
            onPress={onPrincipal}
            accessibilityRole="button"
            accessibilityLabel={t('numeros.choisirPrincipalA11y', { numero })}
            style={({ pressed }) => [styles.action, { opacity: pressed ? 0.7 : 1 }]}
            testID={`numero-${id}-choisir-principal`}
          >
            <Texte variante="boutonPetit" couleur={c.vertTexte}>
              {t('numeros.choisirPrincipal')}
            </Texte>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.whatsapp}>
        <Texte variante="petitFort">{t('numeros.whatsapp')}</Texte>
        {modifiable ? (
          // Ni « Oui » ni « Non » tant que personne n'a vérifié : l'agent pose la question sur place.
          <View style={styles.choix} accessibilityRole="radiogroup" accessibilityLabel={t('numeros.whatsappA11y', { numero })}>
            <Filtre
              libelle={t('numeros.oui')}
              selectionne={verifie !== null && telephone.whatsapp}
              onPress={() => onWhatsapp(true)}
              testID={`numero-${id}-whatsapp-oui`}
            />
            <Filtre
              libelle={t('numeros.non')}
              selectionne={verifie !== null && !telephone.whatsapp}
              onPress={() => onWhatsapp(false)}
              testID={`numero-${id}-whatsapp-non`}
            />
          </View>
        ) : (
          <Texte variante="petit">{telephone.whatsapp ? t('numeros.oui') : t('numeros.non')}</Texte>
        )}
      </View>
      <Texte variante="petit" couleur={verifie ? c.texteSecondaire : c.ocreTexte} testID={`numero-${id}-verification`}>
        {dateVerification}
      </Texte>

      {modifiable ? (
        <Pressable
          onPress={onRetirer}
          accessibilityRole="button"
          accessibilityLabel={`${t('numeros.retirer')}, ${numero}`}
          style={({ pressed }) => [styles.action, styles.retirer, { opacity: pressed ? 0.7 : 1 }]}
          testID={`numero-${id}-retirer`}
        >
          <Texte variante="boutonPetit" couleur={c.texteSecondaire}>
            {t('numeros.retirer')}
          </Texte>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Numéros d'une fiche, pour l'agent devant la devanture : il les voit tous, appelle pour vérifier,
 * dit si chacun a WhatsApp, choisit le principal (celui du bouton « Appeler »), ajoute celui qu'il
 * lit et retire un numéro faux. Tout s'applique tout de suite à la fiche, sans étape de validation.
 * Hors connexion, rien ne se modifie : l'espace agent n'a de file d'envoi que pour les relevés.
 */
function NumerosPharmacie() {
  const router = useRouter();
  const retour = useRetour();
  const margeBas = useMargeBas(24);
  const { couleurs: c } = useTheme();
  const { pays, fuseau } = usePaysCourant();
  const enLigne = useEnLigne();
  const deconnecter = useDeconnexionAgent();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { fiche } = usePharmacie(id);
  const numeros = useNumeros(id);
  const [saisie, setSaisie] = useState('');
  const [aWhatsapp, setAWhatsapp] = useState(false);
  const [erreurChamp, setErreurChamp] = useState<string | undefined>(undefined);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  // Jeton refusé : comme le reste de l'espace agent, on efface la session et on revient à la connexion.
  const sessionExpiree = (e: unknown) => {
    if (!estErreurAppel(e) || e.code !== 'UNAUTHENTICATED') return false;
    void deconnecter(false).then(() => router.navigate('/agent/connexion'));
    return true;
  };
  const surErreur = (e: unknown) => {
    if (!sessionExpiree(e)) alerte(t('numeros.nonEnregistre'), messageErreur(e));
  };
  // Arrivée sans session (lien direct, session effacée) : la lecture est désactivée, on renvoie à la connexion
  // plutôt que de laisser le squelette tourner. Le stockage de session est synchrone, pas d'attente d'hydratation.
  const agent = useSessionAgent((e) => e.agent);
  useEffect(() => {
    if (agent === null) router.replace('/agent/connexion');
  }, [agent, router]);

  useEffect(() => {
    if (numeros.error) sessionExpiree(numeros.error);
    // Une seule réaction par erreur de lecture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numeros.error]);

  const retirer = (telephone: TelephonePharmacie) => {
    const numero = telephoneLocal(telephone.numero, pays?.indicatif);
    // Bouton neutre au libellé exact : un numéro faux se retire sans dramatiser, mais pas par mégarde.
    alerte(t('numeros.retirerTitre', { numero }), t('numeros.retirerTexte'), [
      { text: t('commun.annuler'), style: 'cancel' },
      { text: t('numeros.retirer'), onPress: () => numeros.retrait.mutate(telephone, { onError: surErreur }) },
    ]);
  };

  const ajouter = () => {
    const numero = saisie.trim();
    if (!numero) return;
    setConfirmation(null);
    numeros.ajout.mutate(
      { numero, ...(aWhatsapp ? { whatsapp: true } : {}) },
      {
        onSuccess: ({ dejaPresent }) => {
          setSaisie('');
          setAWhatsapp(false);
          setConfirmation(dejaPresent ? t('numeros.dejaPresent') : t('numeros.ajoute'));
        },
        onError: (e) => {
          if (sessionExpiree(e)) return;
          const reaction = reactionPour(e);
          if (reaction.type === 'formulaire') setErreurChamp(reaction.champs.numero ?? reaction.message);
          else alerte(t('numeros.nonEnregistre'), messageErreur(e));
        },
      },
    );
  };

  const liste = numeros.data;
  const refuse = estErreurAppel(numeros.error) && numeros.error.code === 'FORBIDDEN';

  const contenu = () => {
    if (!liste) {
      if (refuse) {
        return <EtatVide titre={t('numeros.refuseTitre')} texte={numeros.error?.message} dessin="aucun" testID="numeros-refuse" />;
      }
      if (!enLigne) return <EtatVide titre={t('numeros.horsConnexionTitre')} texte={t('numeros.horsConnexion')} dessin="aucun" testID="numeros-hors-connexion" />;
      if (numeros.isError) {
        return (
          <EtatVide
            titre={t('numeros.erreurTitre')}
            texte={messageErreur(numeros.error)}
            dessin="aucun"
            suggestions={[{ libelle: t('commun.reessayer'), icone: <IconeActualiser size={20} color={c.vertTexte} />, onPress: () => void numeros.refetch() }]}
            testID="numeros-erreur"
          />
        );
      }
      return <SqueletteListe nombre={2} />;
    }
    if (liste.length === 0) {
      return (
        <Texte variante="texte" couleur={c.texteSecondaire} testID="numeros-aucun">
          {t('numeros.aucun')}
        </Texte>
      );
    }
    return (
      <View style={[styles.surface, { backgroundColor: c.carte }]} testID="liste-numeros">
        {liste.map((telephone, i) => (
          <LigneNumero
            key={telephone.id}
            telephone={telephone}
            premiere={i === 0}
            modifiable={enLigne}
            onWhatsapp={(valeur) => numeros.whatsapp.mutate({ telephone, valeur }, { onError: surErreur })}
            onPrincipal={() => numeros.principal.mutate(telephone, { onError: surErreur })}
            onRetirer={() => retirer(telephone)}
          />
        ))}
      </View>
    );
  };

  return (
    <Ecran testID="ecran-numeros">
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView contentContainerStyle={[styles.contenu, { paddingBottom: margeBas }]} keyboardShouldPersistTaps="handled">
          <EnTete
            titre={t('numeros.titre')}
            onRetour={retour}
            apresTitre={
              fiche ? (
                <Texte variante="petit" couleur={c.texteSecondaire} numberOfLines={2}>
                  {fiche.nom}
                </Texte>
              ) : null
            }
          />
          <BandeauHorsConnexion misAJourLe={numeros.dataUpdatedAt} fuseau={fuseau} />
          {!enLigne && liste ? (
            <Texte variante="petit" couleur={c.texteSecondaire} testID="numeros-lecture-seule">
              {t('numeros.horsConnexion')}
            </Texte>
          ) : null}

          {contenu()}

          {enLigne && liste ? (
            <View style={styles.ajout}>
              <Texte variante="section" titre>
                {t('numeros.ajouterTitre')}
              </Texte>
              <ChampSaisie
                libelle={t('numeros.champ')}
                varianteLibelle="petitFort"
                icone="telephone"
                hauteur={CIBLE_TACTILE}
                placeholder={t('numeros.champExemple')}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                returnKeyType="done"
                value={saisie}
                onChangeText={(valeur) => {
                  setSaisie(valeur);
                  setErreurChamp(undefined);
                  setConfirmation(null);
                }}
                onSubmitEditing={ajouter}
                erreur={erreurChamp}
                testID="champ-nouveau-numero"
              />
              <Pressable onPress={() => setAWhatsapp(!aWhatsapp)} accessible={false} style={styles.caseLigne}>
                <CaseACocher coche={aWhatsapp} onChange={setAWhatsapp} libelle={t('numeros.aWhatsapp')} testID="case-nouveau-whatsapp" />
                <Texte variante="corps" style={styles.flex}>
                  {t('numeros.aWhatsapp')}
                </Texte>
              </Pressable>
              <Bouton
                libelle={t('numeros.ajouter')}
                icone="ajouter"
                onPress={ajouter}
                desactive={saisie.trim() === ''}
                chargement={numeros.ajout.isPending}
                testID="bouton-ajouter-numero"
              />
              {confirmation ? (
                <Texte variante="petit" couleur={c.vertTexte} accessibilityLiveRegion="polite" testID="numero-ajoute">
                  {confirmation}
                </Texte>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenu: { paddingTop: espacements.s, paddingHorizontal: espacements.gouttiere, gap: espacements.m },
  surface: { paddingHorizontal: espacements.m + 2, borderRadius: rayons.surface },
  ligne: { paddingVertical: espacements.m, gap: espacements.xs },
  /** Filet d'1 px : un aplat, pas une bordure (charte). */
  filet: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  haut: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: espacements.s },
  numero: { flexDirection: 'row', alignItems: 'center', gap: espacements.s, minHeight: CIBLE_TACTILE },
  chiffres: { fontVariant: ['tabular-nums'] },
  principal: { flexDirection: 'row', alignItems: 'center', gap: espacements.xs, minHeight: CIBLE_TACTILE },
  action: { minHeight: CIBLE_TACTILE, justifyContent: 'center' },
  retirer: { alignSelf: 'flex-start' },
  whatsapp: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: espacements.m },
  choix: { flexDirection: 'row', gap: espacements.s },
  ajout: { gap: espacements.m, marginTop: espacements.l },
  caseLigne: { flexDirection: 'row', alignItems: 'center', gap: espacements.m, minHeight: CIBLE_TACTILE },
});

export default avecErrorBoundary(NumerosPharmacie, 'NumerosPharmacie');
