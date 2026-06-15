import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { catchError, map, of, startWith } from 'rxjs';

import { AgencyService } from '../../core/services/agency.service';
import { AgencyResponseDto } from '../../core/models/agency.model';
import { AgencyStatus } from '../../core/models/agency-status.enum';
import { Footer } from '../../layout/footer/footer';
import { Header } from '../../layout/header/header';

/** État de chargement de la liste des agences. */
type AgenciesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; agencies: AgencyResponseDto[] };

/** Sévérités de tag PrimeNG utilisées pour les statuts d'agence. */
type TagSeverity = 'success' | 'info' | 'warn' | 'danger';

/** Libellé et sévérité du tag affiché pour chaque statut d'agence. */
const STATUS_TAGS: Record<AgencyStatus, { label: string; severity: TagSeverity }> = {
  [AgencyStatus.OPEN]: { label: 'Ouverte', severity: 'success' },
  [AgencyStatus.PLANNED]: { label: 'Bientôt', severity: 'info' },
  [AgencyStatus.TEMPORILY_CLOSED]: { label: 'Fermée temporairement', severity: 'warn' },
  [AgencyStatus.CLOSED]: { label: 'Fermée', severity: 'danger' },
};

/** Nombre de squelettes affichés pendant le chargement. */
const SKELETON_COUNT = 6;

/** Nombre d'agences affichées par page. */
const PAGE_SIZE = 9;

/**
 * Page « Nos agences » : présente le réseau d'agences Ymmo.
 */
@Component({
  selector: 'app-agencies',
  imports: [ButtonModule, TagModule, SkeletonModule, Header, Footer],
  templateUrl: './agencies.html',
  styleUrl: './agencies.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Agencies {
  private readonly agencyService = inject(AgencyService);

  /** Chargement des agences, avec gestion d'erreur intégrée à l'état. */
  protected readonly agenciesState = toSignal(
    this.agencyService.getAllAgencies().pipe(
      map((agencies): AgenciesState => ({ status: 'ready', agencies })),
      catchError(() => of<AgenciesState>({ status: 'error' })),
      startWith<AgenciesState>({ status: 'loading' }),
    ),
    { requireSync: true },
  );

  /** Squelettes affichés pendant le chargement. */
  protected readonly skeletonItems = Array.from({ length: SKELETON_COUNT }, (_, index) => index);

  /** Agences chargées, vide tant que l'état n'est pas « ready ». */
  protected readonly agencies = computed(() => {
    const state = this.agenciesState();
    return state.status === 'ready' ? state.agencies : [];
  });

  /** Nombre d'agences actuellement affichées (pagination « Charger plus »). */
  protected readonly visibleCount = signal(PAGE_SIZE);

  /** Agences affichées, tronquées à `visibleCount()`. */
  protected readonly visibleAgencies = computed(() => {
    const state = this.agenciesState();
    return state.status === 'ready' ? state.agencies.slice(0, this.visibleCount()) : [];
  });

  /** Affiche une page supplémentaire d'agences. */
  protected showMore(): void {
    this.visibleCount.update((n) => n + PAGE_SIZE);
  }

  /** Initiales (1-2 lettres) déduites du nom de l'agence, pour le monogramme. */
  protected initials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      return '';
    }
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  /** Libellé du tag de statut. */
  protected statusLabel(status: AgencyStatus): string {
    return STATUS_TAGS[status].label;
  }

  /** Sévérité PrimeNG du tag de statut. */
  protected statusSeverity(status: AgencyStatus): TagSeverity {
    return STATUS_TAGS[status].severity;
  }
}
