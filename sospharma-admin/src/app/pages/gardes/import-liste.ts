import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ArrowLeft, FileUp, LucideAngularModule, Search } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { ApiService, messageErreur } from '../../noyau/api.service';
import { ALERTES_RAPPROCHEMENT, ETATS_TOUR_IMPORT, STATUTS_RAPPROCHEMENT, libelle } from '../../noyau/libelles';
import { ActionListe, AnalyseListe, BilanImport, EntreeAnalysee, Pharmacie } from '../../noyau/types';

/** Ligne de relecture : l'entrée analysée et la décision de l'équipe. */
interface Ligne {
  entree: EntreeAnalysee;
  action: ActionListe;
  /** Fiche à rattacher : celle trouvée par l'API, ou une autre choisie à la main. */
  pharmacie: { id: string; nom: string } | null;
  recherche: string;
  resultats: Pharmacie[];
  ouverte: boolean;
}

type Filtre = 'toutes' | 'a_relire' | 'trouvee' | 'a_verifier' | 'inconnue';

/**
 * Liste de garde officielle (PDF de l'Ordre passé à l'OCR) :
 * 1. coller le texte, 2. relire le rapprochement avec l'annuaire, 3. simuler puis importer en brouillons.
 */
@Component({
  selector: 'app-import-liste',
  imports: [FormsModule, RouterLink, DatePipe, DecimalPipe, LucideAngularModule],
  template: `
    <a routerLink="/gardes" class="inline-flex items-center gap-1 text-sm text-marque hover:underline">
      <lucide-icon [img]="ArrowLeft" [size]="14" /> Tours de garde
    </a>
    <h1 class="mt-2">Liste de garde officielle</h1>
    <p class="mt-1 max-w-3xl text-sm text-texte-2">
      Collez le texte de la liste (copié du PDF ou sorti de l'OCR). L'API la découpe, la rapproche de l'annuaire,
      puis crée un tour en brouillon par ville. Rien n'est publié : chaque tour se contrôle et se publie ensuite.
      Sans dates (export de l'annuaire), il remplit seulement l'annuaire.
    </p>

    <!-- Étape 1 : le texte -->
    <div class="carte mt-5 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2>1. Texte de la liste</h2>
        <label class="bouton-secondaire cursor-pointer py-1.5 text-xs">
          <lucide-icon [img]="FileUp" [size]="14" /> Ouvrir un fichier .txt
          <input type="file" accept=".txt,text/plain" class="hidden" (change)="lireFichier($event)" />
        </label>
      </div>
      <textarea name="texte" rows="10" class="champ font-mono text-xs" [(ngModel)]="texte"
        placeholder="TOUR DE GARDE DU SAMEDI 1er AU VENDREDI 7 NOVEMBRE 2026…"></textarea>
      <div class="flex items-center gap-3">
        <button type="button" class="bouton-principal" [disabled]="envoi() || texte.trim().length < 20" (click)="analyser()">
          {{ envoi() && !lignes().length ? 'Analyse…' : 'Analyser' }}
        </button>
        <span class="text-xs text-texte-2">{{ texte.length | number }} caractères</span>
      </div>
      @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
    </div>

    @if (lignes().length > 0) {
      <!-- Étape 2 : relecture -->
      <div class="carte mt-5">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2>2. Relecture</h2>
            <p class="mt-1 text-sm text-texte-2">
              {{ lignes().length }} pharmacies lues ·
              <span class="text-marque-fonce">{{ compte('trouvee') }} trouvées</span> ·
              <span class="text-ocre">{{ compte('a_verifier') }} à vérifier</span> ·
              <span>{{ compte('inconnue') }} inconnues</span>
            </p>
          </div>
          <div class="flex flex-wrap gap-1 text-xs">
            @for (f of filtres; track f.cle) {
              <button type="button" class="rounded-full border px-3 py-1"
                [class]="filtre() === f.cle ? 'border-marque bg-marque text-white' : 'border-surface bg-surface hover:bg-filet'"
                (click)="filtre.set(f.cle)">{{ f.texte }}</button>
            }
          </div>
        </div>

        <div class="mt-4 overflow-x-auto">
          <table class="tableau">
            <thead>
              <tr><th>#</th><th>Sur la liste</th><th>Rapprochement</th><th>Décision</th></tr>
            </thead>
            <tbody>
              @for (l of visibles(); track l.entree.rang) {
                <tr [class.bg-ocre-clair]="l.entree.statut === 'a_verifier' && l.action === 'ignorer'">
                  <td class="text-texte-2">{{ l.entree.rang + 1 }}</td>
                  <td class="min-w-60">
                    <div class="font-medium">{{ l.entree.liste.nom }}</div>
                    <div class="text-xs text-texte-2">
                      {{ l.entree.liste.section }}
                      @if (l.entree.liste.pharmacien) { · {{ l.entree.liste.pharmacien }} }
                    </div>
                    @if (l.entree.liste.repere) { <div class="text-xs text-texte-2">{{ l.entree.liste.repere }}</div> }
                    @if (l.entree.liste.telephones.length) { <div class="text-xs">{{ l.entree.liste.telephones.join(' · ') }}</div> }
                  </td>
                  <td class="min-w-56">
                    <span [class]="classeStatut(l.entree.statut)">{{ statut(l.entree.statut) }}</span>
                    @if (l.entree.pharmacie) {
                      <div class="mt-1 text-xs">
                        <a [routerLink]="['/pharmacies', l.entree.pharmacie.id]" target="_blank" class="text-marque-fonce hover:underline">{{ l.entree.pharmacie.nom }}</a>
                        @if (l.entree.pharmacie.telephone) { · {{ l.entree.pharmacie.telephone }} }
                      </div>
                    }
                    @for (a of l.entree.alertes; track a) {
                      <div class="mt-1 text-xs text-ocre">{{ alerte(a) }}</div>
                    }
                  </td>
                  <td class="min-w-64">
                    <select class="champ py-1.5" [name]="'action' + l.entree.rang" [(ngModel)]="l.action" (ngModelChange)="majBilan()">
                      <option value="rattacher" [disabled]="!l.pharmacie">Rattacher à la fiche</option>
                      <option value="creer" [disabled]="l.entree.alertes.includes('ville_inconnue')">Créer une fiche (position à confirmer)</option>
                      <option value="ignorer">Ignorer</option>
                    </select>
                    @if (l.pharmacie && l.action === 'rattacher') {
                      <div class="mt-1 text-xs text-marque-fonce">→ {{ l.pharmacie.nom }}</div>
                    }
                    <button type="button" class="mt-1 text-xs text-marque hover:underline" (click)="l.ouverte = !l.ouverte">
                      {{ l.ouverte ? 'Fermer' : 'Choisir une autre fiche' }}
                    </button>
                    @if (l.ouverte) {
                      <div class="mt-1 flex gap-1">
                        <input class="champ py-1 text-xs" [name]="'q' + l.entree.rang" [(ngModel)]="l.recherche" placeholder="Nom de la fiche" (keydown.enter)="chercher(l); $event.preventDefault()" />
                        <button type="button" class="bouton-secondaire px-2 py-1" (click)="chercher(l)" aria-label="Chercher">
                          <lucide-icon [img]="Search" [size]="14" />
                        </button>
                      </div>
                      @for (p of l.resultats; track p.id) {
                        <button type="button" class="mt-1 block w-full rounded px-2 py-1 text-left text-xs hover:bg-marque-clair" (click)="choisir(l, p)">
                          {{ p.nom }} <span class="text-texte-2">· {{ p.ville?.nom }} {{ p.zone?.nom ?? '' }} {{ p.telephone ?? '' }}</span>
                        </button>
                      }
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="4" class="py-6 text-center text-texte-2">Aucune ligne pour ce filtre.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Étape 3 : import -->
      <div class="carte mt-5 space-y-4">
        <h2>3. Import</h2>
        <label class="flex items-start gap-2 text-sm">
          <input type="checkbox" name="annuaire" class="mt-0.5 h-4 w-4 accent-marque" [(ngModel)]="annuaireSeulement" (ngModelChange)="majBilan()" />
          <span>
            <strong>Remplir l'annuaire seulement</strong>, sans tour de garde : les pharmacies inconnues sont créées,
            les fiches trouvées reçoivent le téléphone ou l'adresse qui leur manquent.
          </span>
        </label>
        @if (!annuaireSeulement) {
          <div class="grid max-w-lg gap-3 sm:grid-cols-2">
            <div>
              <label class="etiquette" for="pj">Premier jour</label>
              <input id="pj" name="pj" type="date" class="champ" [(ngModel)]="premierJour" (ngModelChange)="majBilan()" />
            </div>
            <div>
              <label class="etiquette" for="dj">Dernier jour</label>
              <input id="dj" name="dj" type="date" class="champ" [(ngModel)]="dernierJour" (ngModelChange)="majBilan()" />
            </div>
          </div>
          <p class="text-xs text-texte-2">Lus dans l'en-tête de la liste. Corrigez-les si l'OCR s'est trompé.</p>
        }
        <p class="text-sm">
          {{ decompte().rattacher }} rattachées · {{ decompte().creer }} fiches à créer · {{ decompte().ignorer }} ignorées
        </p>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="bouton-secondaire" [disabled]="envoi()" (click)="importer(true)">Simuler</button>
          <button type="button" class="bouton-principal" [disabled]="envoi()" (click)="importer(false)">
            {{ annuaireSeulement ? "Enregistrer dans l'annuaire" : 'Importer en brouillons' }}
          </button>
        </div>
        @if (erreurImport()) { <p class="erreur">{{ erreurImport() }}</p> }

        @if (bilan(); as b) {
          <div [class]="simulation() ? 'rounded-lg bg-surface p-4' : 'succes p-4'">
            <div class="font-medium">
              {{ simulation() ? 'Simulation : rien n’a été enregistré.' : 'Import terminé.' }}
              @if (b.premier_jour && b.dernier_jour) {
                Du {{ b.premier_jour | date: 'd MMMM' }} au {{ b.dernier_jour | date: 'd MMMM y' }}.
              } @else {
                Annuaire seulement, aucun tour de garde.
              }
            </div>
            <ul class="mt-2 space-y-1 text-sm">
              @for (t of b.tours; track t.ville) {
                <li>
                  {{ t.ville }} : {{ t.gardes }} pharmacies · {{ etatTour(t.etat) }}
                  @if (t.tour && !simulation()) {
                    · <a [routerLink]="['/gardes', t.tour]" class="text-marque-fonce underline">ouvrir le tour</a>
                  }
                </li>
              }
              <li>{{ b.fiches_creees }} fiches créées · {{ b.telephones_completes }} téléphones complétés · {{ b.adresses_completees }} adresses complétées</li>
            </ul>
            @if (b.ignorees.length) {
              <details class="mt-2 text-sm">
                <summary class="cursor-pointer">{{ b.ignorees.length }} lignes ignorées</summary>
                <ul class="mt-1 list-disc pl-5 text-texte-2">
                  @for (i of b.ignorees; track i.rang) { <li>{{ i.nom }} : {{ i.raison }}</li> }
                </ul>
              </details>
            }
          </div>
        }
      </div>
    }
  `,
})
export class ImportListe {
  private readonly api = inject(ApiService);

  protected texte = '';
  protected premierJour = '';
  protected dernierJour = '';
  /** Coché d'office quand le texte n'a pas d'en-tête de dates (export de l'annuaire de l'Ordre). */
  protected annuaireSeulement = false;
  protected readonly lignes = signal<Ligne[]>([]);
  protected readonly filtre = signal<Filtre>('a_relire');
  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly erreurImport = signal<string | null>(null);
  protected readonly bilan = signal<BilanImport | null>(null);
  protected readonly simulation = signal(true);
  /** Incrémenté à chaque changement de décision pour recalculer le décompte. */
  private readonly version = signal(0);

  protected readonly filtres: { cle: Filtre; texte: string }[] = [
    { cle: 'a_relire', texte: 'À relire' },
    { cle: 'a_verifier', texte: 'À vérifier' },
    { cle: 'inconnue', texte: 'Inconnues' },
    { cle: 'trouvee', texte: 'Trouvées' },
    { cle: 'toutes', texte: 'Toutes' },
  ];

  protected readonly visibles = computed(() => {
    const f = this.filtre();
    return this.lignes().filter((l) => {
      if (f === 'toutes') return true;
      if (f === 'a_relire') return l.entree.statut !== 'trouvee' || l.entree.alertes.length > 0;
      return l.entree.statut === f;
    });
  });

  protected readonly decompte = computed(() => {
    this.version();
    const d = { rattacher: 0, creer: 0, ignorer: 0 };
    for (const l of this.lignes()) d[l.action]++;
    return d;
  });

  protected readonly ArrowLeft = ArrowLeft;
  protected readonly FileUp = FileUp;
  protected readonly Search = Search;

  protected compte(statut: string): number {
    return this.lignes().filter((l) => l.entree.statut === statut).length;
  }

  protected statut(s: string): string {
    return libelle(STATUTS_RAPPROCHEMENT, s);
  }

  protected alerte(a: string): string {
    return libelle(ALERTES_RAPPROCHEMENT, a);
  }

  protected etatTour(e: string): string {
    return libelle(ETATS_TOUR_IMPORT, e);
  }

  protected classeStatut(s: string): string {
    return s === 'trouvee' ? 'pastille-verte' : s === 'a_verifier' ? 'pastille-ocre' : 'pastille-grise';
  }

  protected lireFichier(evenement: Event): void {
    const fichier = (evenement.target as HTMLInputElement).files?.[0];
    if (!fichier) return;
    void fichier.text().then((t) => (this.texte = t));
  }

  protected majBilan(): void {
    this.version.update((v) => v + 1);
    this.bilan.set(null);
  }

  protected async analyser(): Promise<void> {
    this.envoi.set(true);
    this.erreur.set(null);
    this.bilan.set(null);
    try {
      const a = await firstValueFrom(this.api.post<AnalyseListe>('admin/listes-garde/analyse', { texte: this.texte }));
      this.premierJour = a.premier_jour ?? '';
      this.dernierJour = a.dernier_jour ?? '';
      this.annuaireSeulement = !a.premier_jour || !a.dernier_jour;
      this.lignes.set(
        a.pharmacies.map((entree) => ({
          entree,
          action: entree.action_proposee,
          pharmacie: entree.pharmacie ? { id: entree.pharmacie.id, nom: entree.pharmacie.nom } : null,
          recherche: entree.liste.nom,
          resultats: [],
          ouverte: false,
        })),
      );
      this.filtre.set('a_relire');
    } catch (e) {
      this.erreur.set(messageErreur(e));
    } finally {
      this.envoi.set(false);
    }
  }

  protected async chercher(l: Ligne): Promise<void> {
    const q = l.recherche.trim();
    if (q.length < 2) return;
    try {
      const r = await firstValueFrom(this.api.page<Pharmacie>('admin/pharmacies', { q, 'filter[actif]': 1, per_page: 8 }));
      l.resultats = r.donnees;
      this.lignes.update((liste) => [...liste]);
    } catch (e) {
      this.erreur.set(messageErreur(e));
    }
  }

  protected choisir(l: Ligne, p: Pharmacie): void {
    l.pharmacie = { id: p.id, nom: p.nom };
    l.action = 'rattacher';
    l.ouverte = false;
    l.resultats = [];
    this.lignes.update((liste) => [...liste]);
    this.majBilan();
  }

  protected async importer(simulation: boolean): Promise<void> {
    if (!simulation && !confirm('Créer les tours en brouillon et les fiches nouvelles ?')) return;
    this.envoi.set(true);
    this.erreurImport.set(null);
    try {
      const corps = {
        texte: this.texte,
        simulation,
        ...(this.annuaireSeulement
          ? { annuaire_seulement: true }
          : this.premierJour && this.dernierJour
            ? { premier_jour: this.premierJour, dernier_jour: this.dernierJour }
            : {}),
        decisions: this.lignes().map((l) => ({
          rang: l.entree.rang,
          action: l.action,
          ...(l.action === 'rattacher' && l.pharmacie ? { pharmacie: l.pharmacie.id } : {}),
        })),
      };
      this.bilan.set(await firstValueFrom(this.api.post<BilanImport>('admin/listes-garde/import', corps)));
      this.simulation.set(simulation);
    } catch (e) {
      this.erreurImport.set(messageErreur(e));
    } finally {
      this.envoi.set(false);
    }
  }
}
