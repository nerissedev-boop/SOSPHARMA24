export {
  appeler,
  avecMetaOuErreur,
  construireUrl,
  definirJetonAppareil,
  surJetonAppareilRefuse,
  definirTransport,
  donneesOuErreur,
  lireEnveloppe,
  lireJetonAppareil,
  type OptionsAppel,
  type Transport,
} from './client';
export { reactionPour, estErreurHorsConnexion, doitReessayer, type Reaction } from './reactions';
export { useReactionErreur } from './useReactionErreur';
export * from './schema';
export * from './types';
export { reglerDemo, nombreRelevesDemo, reinitialiserDemoAgent } from './demo/adaptateur';
