import { Component, type ComponentType, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '../lib/i18n';
import { signalerErreur } from '../lib/sentry';
import { useTheme } from '../theme/Theme';
import { Bouton } from './Bouton';
import { Texte } from './Texte';

type Props = { children: ReactNode; nom?: string };
type Etat = { erreur: Error | null; cle: number };

function Repli({ onReessayer }: { onReessayer: () => void }) {
  const { couleurs: c } = useTheme();
  return (
    <View style={[styles.repli, { backgroundColor: c.fond }]} testID="ecran-erreur">
      <Texte variante="titre" aligne="center" titre>
        {t('erreurs.ecranTitre')}
      </Texte>
      <Texte variante="corps" couleur={c.texteSecondaire} aligne="center">
        {t('erreurs.ecranTexte')}
      </Texte>
      <Bouton libelle={t('commun.reessayer')} icone="actualiser" onPress={onReessayer} style={styles.bouton} />
    </View>
  );
}

/**
 * Error Boundary d'écran : un plantage d'affichage montre « Un problème est survenu »
 * avec un bouton pour réessayer, et l'erreur part dans Sentry.
 */
export class ErrorBoundaryEcran extends Component<Props, Etat> {
  state: Etat = { erreur: null, cle: 0 };

  static getDerivedStateFromError(erreur: Error): Partial<Etat> {
    return { erreur };
  }

  componentDidCatch(erreur: Error, info: ErrorInfo): void {
    signalerErreur(erreur, { ecran: this.props.nom, pile: info.componentStack });
  }

  private reessayer = () => this.setState((e) => ({ erreur: null, cle: e.cle + 1 }));

  render() {
    if (this.state.erreur) return <Repli onReessayer={this.reessayer} />;
    return <View style={styles.plein} key={this.state.cle}>{this.props.children}</View>;
  }
}

/** Enveloppe un écran de module dans son Error Boundary. */
export function avecErrorBoundary<P extends object>(Ecran: ComponentType<P>, nom: string): ComponentType<P> {
  function EcranProtege(props: P) {
    return (
      <ErrorBoundaryEcran nom={nom}>
        <Ecran {...props} />
      </ErrorBoundaryEcran>
    );
  }
  EcranProtege.displayName = `Protege(${nom})`;
  return EcranProtege;
}

const styles = StyleSheet.create({
  plein: { flex: 1 },
  repli: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  bouton: { alignSelf: 'stretch', marginTop: 8 },
});
