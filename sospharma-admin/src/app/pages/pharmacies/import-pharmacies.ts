import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ArrowLeft, Download, FileUp, LucideAngularModule, RotateCcw, X } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { ApiService, messageErreur } from '../../noyau/api.service';
import { telephoneLisible } from '../../noyau/libelles';
import { TerritoireService } from '../../noyau/territoire.service';
import { BilanImportPharmacies, LigneImportPharmacie, Reference } from '../../noyau/types';

type Filtre = 'toutes' | 'creer' | 'mettre_a_jour' | 'inchangee' | 'a_regarder';

const ACTIONS: Record<string, { texte: string; classe: string }> = {
  creer: { texte: 'À créer', classe: 'pastille-verte' },
  mettre_a_jour: { texte: 'Mise à jour', classe: 'pastille-verte' },
  inchangee: { texte: 'Déjà à jour', classe: 'pastille-grise' },
  ambigue: { texte: 'Ambiguë', classe: 'pastille-ocre' },
  erreur: { texte: 'Erreur', classe: 'pastille-ocre' },
  retiree: { texte: 'Retirée', classe: 'pastille-grise' },
};

/** Lignes qui seraient écrites dans l'annuaire : celles-là seules peuvent être retirées. */
const APPLICABLES = ['creer', 'mettre_a_jour'];

const METHODES: Record<string, string> = {
  id: 'par identifiant',
  telephone: 'par téléphone',
  nom: 'par nom',
};

const CHAMPS: Record<string, string> = {
  nom: 'nom',
  adresse: 'adresse',
  quartier: 'quartier',
  zone: 'commune',
  telephone: 'téléphone',
  telephones: 'numéros ajoutés',
  whatsapp: 'WhatsApp',
  position: 'position',
  h24: '24 h/24',
  services: 'services',
  assurances: 'assurances',
};

/**
 * Avertissements de NumerosTelephone (numéro recollé, début inhabituel, « 1 » ignoré) et morceaux illisibles.
 * L'API les mêle aux autres messages de la ligne, sans code : on les reconnaît à leur début.
 */
const AVERTISSEMENT_NUMERO =
  /^(Numéro corrigé|Numéro au début inhabituel|Chiffre « 1 » ignoré|Téléphone illisible|WhatsApp illisible)/;

const MODELE =
  'nom;adresse;quartier;commune;telephone;whatsapp;latitude;longitude;h24;services;assurances;id\n' +
  "Pharmacie de l'Étoile;Boulevard Latrille, face à la station;Riviera 2;Cocody;07 07 12 34 56 / 27 22 44 55 66;;5.3601;-3.9612;non;;;\n" +
  'Pharmacie du Marché;;;Adjamé;0505050505;;;;oui;;;\n';

/** Remplir l'annuaire d'une ville depuis un tableur : la pharmacie existe → mise à jour, sinon création. */
@Component({
  selector: 'app-import-pharmacies',
  imports: [FormsModule, RouterLink, LucideAngularModule],
  template: `
    <a
      routerLink="/pharmacies"
      class="inline-flex items-center gap-1 text-sm text-marque hover:underline"
    >
      <lucide-icon [img]="ArrowLeft" [size]="14" /> Pharmacies
    </a>
    <h1 class="mt-2">Importer des pharmacies</h1>
    <p class="mt-1 max-w-3xl text-sm text-texte-2">
      Si la pharmacie existe déjà, sa fiche est mise à jour ; sinon elle est créée. Une pharmacie
      existante est reconnue par la colonne <code>id</code>, puis par son téléphone, puis par son
      nom dans la même commune. Une cellule vide ne remplace rien.
    </p>
    <p class="mt-1 text-sm">
      Vous avez le texte de la liste de l'Ordre (« PHCIE … / M. … - TEL. … ») plutôt qu'un tableur ?
      <a routerLink="/gardes/liste-officielle" class="text-marque hover:underline">Collez-le ici</a
      >.
    </p>
    <p class="mt-1 text-sm">
      Pour une grosse mise à jour&nbsp;:
      <a routerLink="/pharmacies" class="text-marque hover:underline">exportez la liste</a>,
      corrigez-la dans Excel, puis importez-la ici. La colonne <code>id</code> fait reconnaître
      chaque fiche.
    </p>

    <div class="carte mt-5 space-y-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="etiquette" for="ville">Ville</label>
          <select
            id="ville"
            name="ville"
            class="champ"
            [(ngModel)]="ville"
            (ngModelChange)="changerVille()"
          >
            <option value="" disabled>Choisir…</option>
            @for (v of territoire.villes(); track v.id) {
              <option [value]="v.id">{{ v.nom }}</option>
            }
          </select>
        </div>
        <div>
          <span class="etiquette">Fichier CSV</span>
          <label class="bouton-secondaire w-full cursor-pointer">
            <lucide-icon [img]="FileUp" [size]="16" />
            {{ fichier()?.name ?? 'Choisir un fichier…' }}
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              class="hidden"
              (change)="choisir($event)"
            />
          </label>
        </div>
      </div>
      <div class="rounded-lg bg-surface px-4 py-3 text-xs text-texte-2">
        La <strong>ville</strong> se choisit ci-dessus : un fichier par ville. Dans le fichier,
        seule la colonne <strong>nom</strong> est obligatoire. Facultatives : adresse, quartier,
        <strong>commune</strong> (nom tel qu’affiché ci-dessous), telephone (plusieurs numéros
        séparés par « / », le premier est le principal), whatsapp, latitude, longitude, h24
        (oui/non), services et assurances (séparés par « | »), id. Séparateur « ; » ou « , ». Depuis
        Excel : Enregistrer sous › CSV UTF-8.
        <button
          type="button"
          class="ml-1 inline-flex items-center gap-1 text-marque hover:underline"
          (click)="telechargerModele()"
        >
          <lucide-icon [img]="Download" [size]="12" /> Télécharger un modèle
        </button>
      </div>
      @if (ville) {
        <div class="text-sm">
          <div class="etiquette">
            Communes de {{ nomVille() }}, à écrire dans la colonne « commune »
          </div>
          @if (communes().length) {
            <div class="flex flex-wrap gap-1.5">
              @for (c of communes(); track c.id) {
                <button
                  type="button"
                  class="pastille-grise cursor-copy hover:bg-marque-clair"
                  title="Copier le nom"
                  (click)="copier(c.nom)"
                >
                  {{ c.nom }}
                </button>
              }
            </div>
            <p class="mt-1 text-xs text-texte-2">
              Majuscules et accents sans importance. Cellule vide : la commune est déduite de la
              latitude et de la longitude, sinon la pharmacie est rattachée à la ville seule.
              @if (copie()) {
                <span class="text-marque-fonce">« {{ copie() }} » copié.</span>
              }
            </p>
          } @else {
            <p class="text-xs text-texte-2">
              Aucune commune enregistrée pour cette ville : laissez la colonne vide.
            </p>
          }
        </div>
      }
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="bouton-principal"
          [disabled]="!pret() || envoi()"
          (click)="envoyer(true)"
        >
          {{ envoi() ? 'Lecture…' : 'Prévisualiser' }}
        </button>
      </div>
      @if (erreur()) {
        <p class="erreur">{{ erreur() }}</p>
      }
      @if (enregistre()) {
        <p class="succes">{{ enregistre() }}</p>
      }
    </div>

    @if (bilan(); as b) {
      <div class="carte mt-5">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2>
              {{ b.simulation ? 'Aperçu : rien n’est encore enregistré' : 'Import enregistré' }}
            </h2>
            <p class="mt-1 text-sm">
              <span class="text-marque-fonce">{{ b.creees }} à créer</span> ·
              <span class="text-ocre">{{ b.mises_a_jour }} mises à jour</span> ·
              {{ b.inchangees }} déjà à jour ·
              <span [class.text-ocre]="b.ambigues + b.erreurs > 0"
                >{{ b.ambigues + b.erreurs }} à regarder</span
              >
              @if (nombreRetirees()) {
                · {{ nombreRetirees() }} retirées
              }
            </p>
          </div>
          <div class="flex flex-wrap gap-1 text-xs">
            @for (f of filtres; track f.cle) {
              <button
                type="button"
                class="rounded-full border px-3 py-1"
                [class]="
                  filtre() === f.cle
                    ? 'border-marque bg-marque text-white'
                    : 'border-surface bg-surface hover:bg-filet'
                "
                (click)="filtre.set(f.cle)"
              >
                {{ f.texte }}
              </button>
            }
          </div>
        </div>

        <div class="mt-4 overflow-x-auto">
          <table class="tableau">
            <thead>
              <tr>
                <th></th>
                <th>Ligne</th>
                <th>Pharmacie</th>
                <th>Résultat</th>
                <th>Commune</th>
                <th>Adresse</th>
                <th>Numéros</th>
                <th>Autres informations</th>
              </tr>
            </thead>
            <tbody>
              @for (l of visibles(); track l.ligne) {
                @let retiree = estRetiree(l);
                <tr [class.opacity-50]="retiree">
                  <td>
                    @if (b.simulation && applicable(l)) {
                      <button
                        type="button"
                        class="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-surface px-2 py-0.5 text-xs hover:bg-filet"
                        [title]="
                          retiree
                            ? 'Remettre cette ligne dans l’import'
                            : 'Ne pas importer cette ligne'
                        "
                        (click)="basculer(l.ligne)"
                      >
                        <lucide-icon [img]="retiree ? RotateCcw : X" [size]="12" />
                        {{ retiree ? 'Remettre' : 'Retirer' }}
                      </button>
                    }
                  </td>
                  <td class="text-texte-2">{{ l.ligne }}</td>
                  <td class="min-w-48">
                    <div class="font-medium" [class.line-through]="retiree">{{ l.nom }}</div>
                    @if (l.pharmacie) {
                      <div class="text-xs text-texte-2">
                        Fiche :
                        <a
                          [routerLink]="['/pharmacies', l.pharmacie.id]"
                          target="_blank"
                          class="text-marque-fonce hover:underline"
                          >{{ l.pharmacie.nom }}</a
                        >
                        @if (l.methode) {
                          ({{ methode(l.methode) }})
                        }
                      </div>
                    }
                  </td>
                  <td>
                    <span [class]="action(retiree ? 'retiree' : l.action).classe">{{
                      action(retiree ? 'retiree' : l.action).texte
                    }}</span>
                  </td>
                  @for (c of colonnes; track c.valeur) {
                    <td [class]="c.classe">
                      @let v = cellule(l, c.valeur, c.champ);
                      @if (v.ancien !== null) {
                        <div class="text-xs text-texte-2 line-through">{{ v.ancien }}</div>
                      }
                      @if (v.nouveau !== null) {
                        <div [class.text-marque-fonce]="v.change" [class.font-medium]="v.change">
                          {{ v.nouveau }}
                        </div>
                      } @else {
                        <span class="text-texte-2">—</span>
                      }
                    </td>
                  }
                  <td class="whitespace-nowrap tabular-nums">
                    @for (n of numeros(l); track n.numero) {
                      <div [class.font-medium]="n.ajoute" [class.text-marque-fonce]="n.ajoute">
                        {{ n.lisible }}
                        @if (n.ajoute) {
                          <span class="text-xs font-normal"> ajouté</span>
                        }
                      </div>
                    } @empty {
                      <span class="text-texte-2">—</span>
                    }
                  </td>
                  <td class="min-w-48 text-xs">
                    @for (a of autres(l); track a) {
                      <div>{{ a }}</div>
                    }
                    @for (m of l.messages; track $index) {
                      <div [class]="classeMessage(l, m)">{{ m }}</div>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="py-6 text-center text-texte-2">
                    Aucune ligne pour ce filtre.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (b.simulation) {
          <div class="mt-4 flex flex-wrap items-center gap-3 border-t border-filet pt-4">
            <button
              type="button"
              class="bouton-principal"
              [disabled]="envoi() || aEnregistrer().creees + aEnregistrer().misesAJour === 0"
              (click)="envoyer(false)"
            >
              Enregistrer {{ aEnregistrer().creees }} créations et
              {{ aEnregistrer().misesAJour }} mises à jour
            </button>
            @if (retirees().size) {
              <button
                type="button"
                class="text-sm text-marque hover:underline"
                (click)="toutRemettre()"
              >
                Tout remettre
              </button>
            }
            @if (b.ambigues + b.erreurs > 0) {
              <span class="text-sm text-texte-2"
                >Les lignes à regarder seront laissées de côté. Corrigez le fichier et relancez pour
                les reprendre.</span
              >
            }
            @if (retirees().size) {
              <span class="text-sm text-texte-2"
                >Une ligne retirée change parfois le rapprochement des autres : « Prévisualiser » à
                nouveau pour le vérifier.</span
              >
            }
          </div>
        }
      </div>
    }
  `,
})
export class ImportPharmacies implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly territoire = inject(TerritoireService);

  protected ville = '';
  protected readonly fichier = signal<File | null>(null);
  protected readonly bilan = signal<BilanImportPharmacies | null>(null);
  protected readonly filtre = signal<Filtre>('toutes');
  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly enregistre = signal<string | null>(null);
  protected readonly communes = signal<Reference[]>([]);
  protected readonly copie = signal<string | null>(null);
  /** Numéros des lignes retirées de l'import par l'administrateur, dans l'aperçu. */
  protected readonly retirees = signal<ReadonlySet<number>>(new Set());
  protected readonly nombreRetirees = computed(
    () => this.bilan()?.retirees ?? this.retirees().size,
  );

  /** Ce que « Enregistrer » écrira vraiment : les lignes retirées ne comptent plus. */
  protected readonly aEnregistrer = computed(() => {
    const r = this.retirees();
    const lignes = (this.bilan()?.lignes ?? []).filter((l) => !r.has(l.ligne));
    return {
      creees: lignes.filter((l) => l.action === 'creer').length,
      misesAJour: lignes.filter((l) => l.action === 'mettre_a_jour').length,
    };
  });

  protected readonly filtres: { cle: Filtre; texte: string }[] = [
    { cle: 'toutes', texte: 'Toutes' },
    { cle: 'a_regarder', texte: 'À regarder' },
    { cle: 'creer', texte: 'À créer' },
    { cle: 'mettre_a_jour', texte: 'Mises à jour' },
    { cle: 'inchangee', texte: 'Déjà à jour' },
  ];

  protected readonly visibles = computed<LigneImportPharmacie[]>(() => {
    const f = this.filtre();
    const lignes = this.bilan()?.lignes ?? [];
    if (f === 'toutes') return lignes;
    if (f === 'a_regarder')
      return lignes.filter(
        (l) => l.action === 'erreur' || l.action === 'ambigue' || l.messages.length > 0,
      );
    return lignes.filter((l) => l.action === f);
  });

  protected readonly ArrowLeft = ArrowLeft;
  protected readonly FileUp = FileUp;
  protected readonly Download = Download;
  protected readonly X = X;
  protected readonly RotateCcw = RotateCcw;

  protected applicable(l: LigneImportPharmacie): boolean {
    return APPLICABLES.includes(l.action);
  }

  protected estRetiree(l: LigneImportPharmacie): boolean {
    return l.action === 'retiree' || this.retirees().has(l.ligne);
  }

  protected toutRemettre(): void {
    this.retirees.set(new Set());
  }

  protected basculer(ligne: number): void {
    this.retirees.update((avant) => {
      const apres = new Set(avant);
      if (!apres.delete(ligne)) apres.add(ligne);
      return apres;
    });
  }

  ngOnInit(): void {
    void this.territoire.charger().then(() => {
      if (!this.ville && this.territoire.villes().length === 1) {
        this.ville = this.territoire.villes()[0].id;
        void this.changerVille();
      }
    });
  }

  protected nomVille(): string {
    return this.territoire.villes().find((v) => v.id === this.ville)?.nom ?? '';
  }

  /** Communes de la ville choisie (route publique), pour savoir quoi écrire dans la colonne « commune ». */
  protected async changerVille(): Promise<void> {
    this.bilan.set(null);
    this.retirees.set(new Set());
    this.communes.set([]);
    this.copie.set(null);
    if (!this.ville) return;
    try {
      const liste = await firstValueFrom(this.api.get<Reference[]>(`villes/${this.ville}/zones`));
      this.communes.set([...liste].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')));
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }

  protected copier(nom: string): void {
    void navigator.clipboard?.writeText(nom).then(() => this.copie.set(nom));
  }

  protected pret(): boolean {
    return !!this.ville && !!this.fichier();
  }

  protected action(a: string) {
    return ACTIONS[a] ?? { texte: a, classe: 'pastille-grise' };
  }

  protected methode(m: string): string {
    return METHODES[m] ?? m;
  }

  /** Colonnes de l'aperçu : clé dans `valeurs`, et nom du champ dans `changements` / `avant`. */
  protected readonly colonnes = [
    { valeur: 'commune', champ: 'zone', classe: 'whitespace-nowrap' },
    { valeur: 'adresse', champ: 'adresse', classe: 'min-w-64 text-xs' },
  ] as const;

  /** Valeur lue, et pour une mise à jour l'ancienne valeur de la fiche (barrée à l'écran). */
  protected cellule(l: LigneImportPharmacie, valeur: 'commune' | 'adresse', champ: string) {
    const nouveau = l.valeurs?.[valeur] ?? null;
    const change = l.changements.includes(champ);
    const ancien = change && l.avant ? (l.avant[champ] as string | null) : null;
    return { nouveau, ancien, change };
  }

  /**
   * Tous les numéros lus sur la ligne, le premier étant le principal. Une mise à jour ne retire aucun numéro
   * de la fiche : on marque seulement ceux qu'elle n'a pas encore (`avant.telephones`).
   */
  protected numeros(
    l: LigneImportPharmacie,
  ): { numero: string; lisible: string; ajoute: boolean }[] {
    const v = l.valeurs;
    if (!v) return [];
    const lus = v.telephones ?? (v.telephone ? [v.telephone] : []);
    const connus =
      l.action === 'mettre_a_jour' && l.changements.includes('telephones')
        ? ((l.avant?.['telephones'] as string[] | undefined) ?? [])
        : null;
    return lus.map((numero) => ({
      numero,
      lisible: telephoneLisible(numero),
      ajoute: connus !== null && !connus.includes(numero),
    }));
  }

  /** Erreur ou doublon : la ligne est écartée. Numéro corrigé ou douteux : à vérifier avant d'enregistrer. */
  protected classeMessage(l: LigneImportPharmacie, message: string): string {
    if (l.action === 'erreur' || l.action === 'ambigue') return 'font-medium text-ocre';
    return AVERTISSEMENT_NUMERO.test(message) ? 'text-ocre' : 'text-texte-2';
  }

  /** Quartier, WhatsApp, position, 24 h/24, services, assurances : seulement ce que le fichier donne. */
  protected autres(l: LigneImportPharmacie): string[] {
    const v = l.valeurs;
    if (!v) return [];
    const liste: string[] = [];
    if (v.quartier) liste.push(`Quartier : ${v.quartier}`);
    if (v.whatsapp) liste.push(`WhatsApp : ${telephoneLisible(v.whatsapp)}`);
    if (v.position) liste.push(`Position : ${v.position.lat}, ${v.position.lng}`);
    if (v.h24 !== null) liste.push(v.h24 ? 'Ouverte 24 h/24' : 'Pas 24 h/24');
    if (v.services.length) liste.push(`Services : ${v.services.join(', ')}`);
    if (v.assurances.length) liste.push(`Assurances : ${v.assurances.join(', ')}`);
    const autresChangements = l.changements.filter(
      (c) => !['zone', 'adresse', 'telephone'].includes(c),
    );
    if (autresChangements.length) liste.push(`Change aussi : ${this.champs(autresChangements)}`);
    return liste;
  }

  protected champs(liste: string[]): string {
    return liste.map((c) => CHAMPS[c] ?? c).join(', ');
  }

  protected choisir(evenement: Event): void {
    const entree = evenement.target as HTMLInputElement;
    this.fichier.set(entree.files?.[0] ?? null);
    entree.value = '';
    this.bilan.set(null);
    this.retirees.set(new Set());
    this.enregistre.set(null);
  }

  protected telechargerModele(): void {
    const url = URL.createObjectURL(new Blob(['﻿' + MODELE], { type: 'text/csv;charset=utf-8' }));
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = 'modele-pharmacies.csv';
    lien.click();
    URL.revokeObjectURL(url);
  }

  protected async envoyer(simulation: boolean): Promise<void> {
    const fichier = this.fichier();
    if (!fichier || !this.ville) return;
    if (!simulation && !confirm('Enregistrer ces créations et mises à jour dans l’annuaire ?'))
      return;

    const formulaire = new FormData();
    formulaire.append('ville', this.ville);
    formulaire.append('fichier', fichier);
    formulaire.append('simulation', simulation ? '1' : '0');
    for (const n of this.retirees()) formulaire.append('exclure[]', String(n));

    this.envoi.set(true);
    this.erreur.set(null);
    this.enregistre.set(null);
    try {
      const b = await firstValueFrom(
        this.api.post<BilanImportPharmacies>('admin/pharmacies/import', formulaire),
      );
      this.bilan.set(b);
      this.filtre.set(simulation && b.ambigues + b.erreurs > 0 ? 'a_regarder' : 'toutes');
      if (!simulation) {
        this.retirees.set(new Set());
        this.enregistre.set(`${b.creees} pharmacies créées et ${b.mises_a_jour} mises à jour.`);
      }
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.envoi.set(false);
    }
  }
}
