import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  CalendarDays,
  Flag,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  LucideAngularModule,
  LucideIconData,
  Menu,
  Store,
  Users,
  X,
} from 'lucide-angular';
import { libelle, ROLES } from '../noyau/libelles';
import { SessionService } from '../noyau/session.service';

interface Entree {
  lien: string;
  texte: string;
  icone: LucideIconData;
  adminSeulement?: boolean;
  exact?: boolean;
}

/** Mise en page de l'équipe : menu à gauche (repliable sur téléphone) et contenu à droite. */
@Component({
  selector: 'app-coquille',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <div class="flex min-h-full">
      <aside
        class="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-marque-profond text-white transition-transform lg:static lg:translate-x-0"
        [class.-translate-x-full]="!menuOuvert()"
      >
        <div class="flex items-center gap-3 px-5 py-5">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-marque text-lg font-bold">+</div>
          <div>
            <div class="font-semibold leading-tight">SOS Pharma 24</div>
            <div class="text-xs text-white/60">Back-office</div>
          </div>
          <button type="button" class="ml-auto lg:hidden" (click)="menuOuvert.set(false)" aria-label="Fermer le menu">
            <lucide-icon [img]="X" [size]="20" />
          </button>
        </div>
        <nav class="flex-1 space-y-1 px-3">
          @for (e of entrees(); track e.lien) {
            <a
              [routerLink]="e.lien"
              routerLinkActive="bg-white/15 text-white"
              [routerLinkActiveOptions]="{ exact: !!e.exact }"
              (click)="menuOuvert.set(false)"
              class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
            >
              <lucide-icon [img]="e.icone" [size]="18" />
              {{ e.texte }}
            </a>
          }
        </nav>
        <div class="border-t border-white/10 px-5 py-4 text-sm">
          <div class="font-medium">{{ session.compte()?.nom }}</div>
          <div class="text-xs text-white/60">
            {{ role() }}@if (session.compte()?.ville; as v) { · {{ v.nom }} }
          </div>
          <button
            type="button"
            (click)="session.deconnexion()"
            class="mt-3 flex items-center gap-2 text-xs text-white/70 hover:text-white"
          >
            <lucide-icon [img]="LogOut" [size]="14" /> Se déconnecter
          </button>
        </div>
      </aside>

      @if (menuOuvert()) {
        <div class="fixed inset-0 z-20 bg-black/40 lg:hidden" (click)="menuOuvert.set(false)"></div>
      }

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3 lg:hidden">
          <button type="button" (click)="menuOuvert.set(true)" aria-label="Ouvrir le menu">
            <lucide-icon [img]="Menu" [size]="22" />
          </button>
          <span class="font-semibold">SOS Pharma 24</span>
        </header>
        <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class Coquille {
  protected readonly session = inject(SessionService);
  protected readonly menuOuvert = signal(false);
  protected readonly X = X;
  protected readonly Menu = Menu;
  protected readonly LogOut = LogOut;

  private readonly toutes: Entree[] = [
    { lien: '/', texte: 'Tableau de bord', icone: LayoutDashboard, exact: true },
    { lien: '/pharmacies', texte: 'Pharmacies', icone: Store },
    { lien: '/gardes', texte: 'Gardes', icone: CalendarDays },
    { lien: '/signalements', texte: 'Signalements', icone: Flag },
    { lien: '/support', texte: 'Support', icone: LifeBuoy },
    { lien: '/comptes', texte: 'Comptes', icone: Users, adminSeulement: true },
  ];

  protected readonly entrees = computed(() =>
    this.toutes.filter((e) => !e.adminSeulement || this.session.estAdmin()),
  );
  protected readonly role = computed(() => libelle(ROLES, this.session.compte()?.role));
}
