import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { estErreurAppel } from '@/commun/api';
import { alerte, t } from '@/commun/lib';
import { useTheme } from '@/commun/theme';
import {
  avecErrorBoundary,
  Bouton,
  BoutonIcone,
  CaseACocher,
  ChampSaisie,
  Ecran,
  HiGeoLocation,
  IconeBouclier,
  IconeRetour,
  Logo,
  Texte,
  useRetour,
  useMargeBas,
} from '@/commun/ui';

import { demanderReinitialisation } from '../api';
import { RoleNonAdmis, useConnexionAgent } from '../hooks/useSession';

/** Tracés décoratifs de l'en-tête vert (routes et trajet en pointillés, maquette 22). */
function DecorEnTete() {
  return (
    <Svg width={390} height={260} viewBox="0 0 390 260" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d="M-10 70 L410 40 M-10 170 L410 150 M60 -10 L90 270 M250 -10 L270 270" stroke="#FFFFFF" strokeOpacity={0.08} strokeWidth={14} fill="none" />
      <Path d="M150 210 C200 180 240 130 300 110" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={3} strokeDasharray="6 8" fill="none" />
    </Svg>
  );
}

/** 22 Espace agent : connexion (Sanctum). */
function Connexion() {
  const margeBas = useMargeBas(16);
  const router = useRouter();
  const retour = useRetour();
  const insets = useSafeAreaInsets();
  const { couleurs: c } = useTheme();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [resterConnecte, setResterConnecte] = useState(true);
  const connexion = useConnexionAgent();

  const erreurs = (() => {
    const e = connexion.error;
    if (!estErreurAppel(e) || e.code !== 'VALIDATION_FAILED' || !e.details) return {} as Record<string, string | undefined>;
    const lire = (cle: string) => {
      const v = e.details?.[cle];
      return Array.isArray(v) && typeof v[0] === 'string' ? v[0] : undefined;
    };
    return { email: lire('email'), motDePasse: lire('mot_de_passe') };
  })();

  const seConnecter = () => {
    connexion.mutate(
      { email, motDePasse, resterConnecte },
      {
        onSuccess: () => {
          if (router.canDismiss()) router.dismissTo('/releves');
          else router.replace('/releves');
        },
        onError: (e) => {
          if (e instanceof RoleNonAdmis) return alerte(t('agent.titre'), t('agent.roleNonAdmis'));
          if (estErreurAppel(e) && e.code === 'VALIDATION_FAILED') return;
          alerte(t('agent.titre'), estErreurAppel(e) ? e.message : t('erreurs.generique'));
        },
      },
    );
  };

  const oubli = async () => {
    if (!email.includes('@')) return alerte(t('agent.oubli'), t('agent.oubliEmail'));
    const r = await demanderReinitialisation(email);
    alerte(t('agent.oubli'), r.success ? t('agent.oubliEnvoye') : r.error.message);
  };

  return (
    <Ecran hautSur={false} barreClaire testID="ecran-connexion-agent">
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView contentContainerStyle={styles.defilement} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={[styles.entete, { backgroundColor: c.vert, paddingTop: insets.top + 16 }]}>
            <DecorEnTete />
            <View style={styles.ligneHaut}>
              <BoutonIcone accessibilityLabel={t('commun.retour')} onPress={retour} style={styles.retour} testID="bouton-retour">
                <IconeRetour size={22} color={c.blanc} />
              </BoutonIcone>
              <Logo largeur={28} variante="inverse" />
            </View>
            <View style={styles.intro}>
              <View style={styles.textesIntro}>
                <View style={styles.badge}>
                  <Texte variante="libelleFort" couleur={c.blanc}>
                    {t('agent.badge')}
                  </Texte>
                </View>
                <Texte variante="titre" titre couleur={c.blanc} style={styles.titre}>
                  {t('agent.titre')}
                </Texte>
                <Texte variante="texte" couleur={c.blanc} style={styles.sousTitre}>
                  {t('agent.intro')}
                </Texte>
              </View>
              <View style={[styles.rond, { backgroundColor: c.blanc }]}>
                <HiGeoLocation size={42} color={c.vert} />
              </View>
            </View>
          </View>

          <View style={styles.formulaire}>
            <ChampSaisie
              libelle={t('agent.email')}
              icone="email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="username"
              value={email}
              onChangeText={setEmail}
              erreur={erreurs.email}
              testID="champ-email"
            />
            <ChampSaisie
              libelle={t('agent.motDePasse')}
              icone="cadenas"
              motDePasse
              placeholder={t('agent.motDePassePlaceholder')}
              autoComplete="password"
              textContentType="password"
              value={motDePasse}
              onChangeText={setMotDePasse}
              onSubmitEditing={seConnecter}
              erreur={erreurs.motDePasse}
              testID="champ-mot-de-passe"
            />
            <View style={styles.options}>
              <Pressable onPress={() => setResterConnecte((v) => !v)} accessible={false} style={styles.rester}>
                <CaseACocher coche={resterConnecte} onChange={setResterConnecte} libelle={t('agent.resterConnecte')} />
                <Texte variante="texte">{t('agent.resterConnecte')}</Texte>
              </Pressable>
              <Pressable onPress={oubli} accessibilityRole="button" style={styles.oubli}>
                <Texte variante="boutonPetit" couleur={c.vertTexte}>
                  {t('agent.oubli')}
                </Texte>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.pied, { paddingBottom: margeBas }]}>
          <Bouton
            libelle={t('agent.seConnecter')}
            icone="connexion"
            hauteur={56}
            typo="boutonGrand"
            chargement={connexion.isPending}
            onPress={seConnecter}
            testID="bouton-se-connecter"
          />
          <View style={styles.note}>
            <IconeBouclier size={16} color={c.vert} />
            <Texte variante="libelle" couleur={c.texteSecondaire} style={styles.flexTexte}>
              {t('agent.comptes')}{' '}
              <Texte variante="libelleFort" couleur={c.vertTexte} onPress={() => router.push('/contact')} accessibilityRole="link">
                {t('agent.contact')}
              </Texte>
            </Texte>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexTexte: { flex: 1, lineHeight: 18 },
  defilement: { flexGrow: 1 },
  entete: { paddingHorizontal: 20, paddingBottom: 28, overflow: 'hidden' },
  ligneHaut: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  retour: { marginLeft: -8 },
  intro: { marginTop: 22, flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  textesIntro: { flex: 1, gap: 8 },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: 8, paddingVertical: 4 },
  titre: { fontSize: 28, lineHeight: 32 },
  sousTitre: { lineHeight: 21, opacity: 0.95 },
  rond: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  formulaire: { paddingTop: 24, paddingHorizontal: 20, gap: 14 },
  options: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rester: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  oubli: { height: 44, justifyContent: 'center' },
  pied: { paddingTop: 12, paddingHorizontal: 20, gap: 14 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
});

export default avecErrorBoundary(Connexion, 'ConnexionAgent');
