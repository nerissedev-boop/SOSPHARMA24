import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { estErreurAppel } from '@/commun/api';
import { alerte, dateCourte, heure, initiales, t, useSessionAgent } from '@/commun/lib';
import { rayons, useTheme, type Jetons } from '@/commun/theme';
import { avecErrorBoundary, Bouton, Ecran, HiPharmacy, IconeSansReseau, Texte } from '@/commun/ui';
import { usePaysCourant } from '@/modules/territoire';

import { useBrouillonReleve } from '../brouillon';
import { useEnvoyerFile } from '../hooks/useEnvoi';
import { useMesReleves, type LigneReleve } from '../hooks/useMesReleves';
import { useDeconnexionAgent } from '../hooks/useSession';
import type { EtatAffiche } from '../types';

function couleursEtat(etat: EtatAffiche, c: Jetons): { texte: string; fond: string; disque: string } {
  switch (etat) {
    case 'a_envoyer':
      return { texte: c.attenteTexte, fond: c.attenteFond, disque: c.texteTertiaire };
    case 'a_corriger':
      return { texte: c.rougeTexteFort, fond: c.rougeClair, disque: c.rouge };
    case 'valide':
      return { texte: c.vertTexte, fond: c.vertClair, disque: c.vert };
    case 'rejete':
      return { texte: c.texteSecondaire, fond: c.surface, disque: c.texteTertiaire };
    default:
      return { texte: c.texte, fond: c.surface, disque: c.texteTertiaire };
  }
}

/** « aujourd'hui 10:42 », « hier », « lun. 19 oct. » dans le fuseau du pays. */
function quand(iso: string, fuseau: string, maintenant = new Date()): string {
  const jour = (d: Date) => new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau, year: 'numeric', month: 'numeric', day: 'numeric' }).format(d);
  const date = new Date(iso);
  if (jour(date) === jour(maintenant)) return t('releves.aujourdhui', { heure: heure(date, fuseau) });
  if (jour(date) === jour(new Date(maintenant.getTime() - 24 * 3600 * 1000))) return t('releves.hier');
  return dateCourte(iso, fuseau);
}

function Ligne({ ligne, fuseau, onPress }: { ligne: LigneReleve; fuseau: string; onPress: () => void }) {
  const { couleurs: c } = useTheme();
  const couleurs = couleursEtat(ligne.etat, c);
  const meta = [t(`releves.types.${ligne.type}`), ligne.commune, quand(ligne.date, fuseau)].filter(Boolean).join(', ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${ligne.nom}, ${meta}, ${t(`releves.etats.${ligne.etat}`)}`}
      style={styles.ligne}
      testID={`releve-${ligne.id}`}
    >
      <View style={[styles.disque, { backgroundColor: couleurs.disque }]}>
        <HiPharmacy size={24} color={c.blanc} />
      </View>
      <View style={styles.textes}>
        <Texte variante="nom" numberOfLines={1}>
          {ligne.nom}
        </Texte>
        <Texte variante="libelle" couleur={c.texteSecondaire} numberOfLines={1}>
          {meta}
        </Texte>
      </View>
      <View style={[styles.etat, { backgroundColor: couleurs.fond }]}>
        <Texte variante="libelleFort" couleur={couleurs.texte}>
          {t(`releves.etats.${ligne.etat}`)}
        </Texte>
      </View>
    </Pressable>
  );
}

/** 23 Mes relevés (onglet « Relevés » de l'agent connecté). */
function MesReleves() {
  const router = useRouter();
  const { couleurs: c } = useTheme();
  const { fuseau } = usePaysCourant();
  const agent = useSessionAgent((e) => e.agent);
  const marquerActivite = useSessionAgent((e) => e.marquerActivite);
  const releves = useMesReleves();
  const envoyer = useEnvoyerFile();
  const deconnecter = useDeconnexionAgent();
  const demarrer = useBrouillonReleve((e) => e.demarrer);
  const [actualisation, setActualisation] = useState(false);

  const sessionExpiree = estErreurAppel(releves.error) && releves.error.code === 'UNAUTHENTICATED';
  useEffect(() => {
    if (sessionExpiree) void deconnecter(false).then(() => router.navigate('/agent/connexion'));
  }, [sessionExpiree, deconnecter, router]);

  const quitter = () => {
    const sortir = async () => {
      await deconnecter(true);
      router.navigate('/profil');
    };
    if (releves.enAttente === 0) return void sortir();
    alerte(t('releves.quitterTitre'), t('releves.quitterAttente', { count: releves.enAttente }), [
      { text: t('commun.annuler'), style: 'cancel' },
      { text: t('releves.quitter'), style: 'destructive', onPress: () => void sortir() },
    ]);
  };

  const nouveau = () => {
    marquerActivite();
    demarrer(null);
    router.push('/releve/position');
  };

  const ouvrir = (l: LigneReleve) => {
    const details = [t(`releves.etats.${l.etat}`), l.commentaire, l.erreur].filter(Boolean).join('\n\n');
    alerte(l.nom, details);
  };

  const actualiser = async () => {
    setActualisation(true);
    await envoyer();
    await releves.refetch();
    setActualisation(false);
  };

  return (
    <Ecran testID="ecran-releves">
      <ScrollView
        contentContainerStyle={styles.contenu}
        refreshControl={<RefreshControl refreshing={actualisation} onRefresh={actualiser} tintColor={c.vert} />}
      >
        <View style={styles.haut}>
          <View style={styles.agent}>
            <View style={[styles.avatar, { backgroundColor: c.vert }]}>
              <Texte variante="corpsFort" couleur={c.blanc} style={styles.initiales}>
                {initiales(agent?.prenom ?? '', agent?.nom ?? '')}
              </Texte>
            </View>
            <View style={styles.textes}>
              <Texte variante="nom">{[agent?.prenom, agent?.nom].filter(Boolean).join(' ')}</Texte>
              <Texte variante="libelle" couleur={c.texteSecondaire}>
                {t('releves.role', { ville: agent?.ville ?? '' })}
              </Texte>
            </View>
            <Pressable onPress={quitter} accessibilityRole="button" style={styles.quitter} testID="bouton-quitter">
              <Texte variante="petitFort" couleur={c.vertTexte} style={styles.gras}>
                {t('releves.quitter')}
              </Texte>
            </Pressable>
          </View>

          <Texte variante="titreEcran" titre>
            {t('releves.titre')}
          </Texte>

          {releves.enAttente > 0 ? (
            <View style={[styles.bandeau, { backgroundColor: c.attenteFond }]} accessibilityLiveRegion="polite" testID="bandeau-attente">
              <IconeSansReseau size={20} color={c.attenteIcone} />
              <Texte variante="petit" couleur={c.attenteTexte} style={styles.flex}>
                <Texte variante="petitFort" couleur={c.attenteTexte} style={styles.gras}>
                  {t('releves.attente', { count: releves.enAttente })}
                </Texte>{' '}
                {t('releves.attenteSuite')}
              </Texte>
            </View>
          ) : null}

          <View style={styles.compteurs}>
            {(
              [
                ['valides', releves.compteurs.valides, c.surface, c.texte, c.texteSecondaire],
                ['enVerification', releves.compteurs.enVerification, c.surface, c.texte, c.texteSecondaire],
                ['aCorriger', releves.compteurs.aCorriger, c.rougeClair, c.rougeTexteFort, c.rougeTexteFort],
              ] as const
            ).map(([cle, nombre, fond, couleurNombre, couleurLibelle]) => (
              <View key={cle} style={[styles.compteur, { backgroundColor: fond }]} testID={`compteur-${cle}`}>
                <Texte variante="distanceGrande" couleur={couleurNombre} style={styles.nombre}>
                  {String(nombre)}
                </Texte>
                <Texte variante="libelle" couleur={couleurLibelle}>
                  {t(`releves.compteurs.${cle}`)}
                </Texte>
              </View>
            ))}
          </View>

          <Bouton
            libelle={t('releves.nouveau')}
            icone="ajouter"
            tailleIcone={22}
            hauteur={54}
            typo="boutonGrand"
            onPress={nouveau}
            testID="bouton-nouveau-releve"
          />
        </View>

        <View style={styles.liste}>
          <Texte variante="sectionMoyenne" titre style={styles.titreListe}>
            {t('releves.recents')}
          </Texte>
          {releves.lignes.map((l) => (
            <Ligne key={l.id} ligne={l} fuseau={fuseau} onPress={() => ouvrir(l)} />
          ))}
          {releves.lignes.length === 0 && !releves.isPending ? (
            <Texte variante="petit" couleur={c.texteSecondaire} style={styles.vide}>
              {t('releves.aucun')}
            </Texte>
          ) : null}
        </View>
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, lineHeight: 19 },
  contenu: { paddingBottom: 24 },
  haut: { paddingTop: 16, paddingHorizontal: 20, gap: 14 },
  agent: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  initiales: { fontFamily: 'PlusJakartaSans_800ExtraBold' },
  textes: { flex: 1, gap: 1, minWidth: 0 },
  quitter: { height: 44, justifyContent: 'center' },
  gras: { fontFamily: 'PlusJakartaSans_700Bold' },
  bandeau: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: rayons.moyen },
  compteurs: { flexDirection: 'row', gap: 8 },
  compteur: { flex: 1, padding: 12, gap: 2 },
  nombre: { fontSize: 22, lineHeight: 28 },
  liste: { paddingTop: 14, paddingHorizontal: 20 },
  titreListe: { marginBottom: 4 },
  ligne: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12 },
  disque: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  etat: { paddingHorizontal: 8, paddingVertical: 4 },
  vide: { paddingVertical: 8 },
});

export default avecErrorBoundary(MesReleves, 'MesReleves');
