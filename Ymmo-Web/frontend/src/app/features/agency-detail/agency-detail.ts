import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { catchError, map, of, startWith } from 'rxjs';

import { AgencyService } from '../../core/services/agency.service';
import { PropertyService } from '../../core/services/property.service';
import { AgencyResponseDto } from '../../core/models/agency.model';
import { AgencyStatus } from '../../core/models/agency-status.enum';
import { PropertyResponseDto } from '../../core/models/property.model';
import { Footer } from '../../layout/footer/footer';
import { Header } from '../../layout/header/header';
import { PropertyCard } from '../../shared/components/property-card/property-card';

/** État de chargement de l'agence. */
type AgencyState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; agency: AgencyResponseDto };

/** État de chargement des biens. */
type PropertiesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; properties: PropertyResponseDto[] };

/** Sévérités de tag PrimeNG utilisées pour les statuts d'agence. */
type TagSeverity = 'success' | 'info' | 'warn' | 'danger';

/** Libellé et sévérité du tag affiché pour chaque statut d'agence. */
const STATUS_TAGS: Record<AgencyStatus, { label: string; severity: TagSeverity }> = {
  [AgencyStatus.OPEN]: { label: 'Ouverte', severity: 'success' },
  [AgencyStatus.PLANNED]: { label: 'Bientôt', severity: 'info' },
  [AgencyStatus.TEMPORILY_CLOSED]: { label: 'Fermée temporairement', severity: 'warn' },
  [AgencyStatus.CLOSED]: { label: 'Fermée', severity: 'danger' },
};

/** Parse une date au format API « dd-MM-yyyy HH:mm:ss » en timestamp. */
function parseApiDate(value: string): number {
  const [datePart, timePart = '00:00:00'] = value.split(' ');
  const [day, month, year] = datePart.split('-').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
}

/**
 * Page de détail d'une agence : informations de contact et biens disponibles.
 */
@Component({
  selector: 'app-agency-detail',
  imports: [RouterLink, TagModule, SkeletonModule, Header, Footer, PropertyCard],
  templateUrl: './agency-detail.html',
  styleUrl: './agency-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgencyDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly agencyService = inject(AgencyService);
  private readonly propertyService = inject(PropertyService);

  /** Identifiant de l'agence affichée, issu de l'URL. */
  private readonly agencyId = this.route.snapshot.paramMap.get('id') ?? '';

  /** Chargement de l'agence, avec gestion d'erreur intégrée à l'état. */
  protected readonly agencyState = toSignal(
    this.agencyService.getAgencyById(this.agencyId).pipe(
      map((agency): AgencyState => ({ status: 'ready', agency })),
      catchError(() => of<AgencyState>({ status: 'error' })),
      startWith<AgencyState>({ status: 'loading' }),
    ),
    { requireSync: true },
  );

  /** Agence chargée (ou null tant que l'état n'est pas « ready ») — narrowing pour le template. */
  protected readonly agency = computed(() => {
    const state = this.agencyState();
    return state.status === 'ready' ? state.agency : null;
  });

  /** Chargement des biens, avec gestion d'erreur intégrée à l'état. */
  protected readonly propertiesState = toSignal(
    this.propertyService.getAllProperties().pipe(
      map((properties): PropertiesState => ({ status: 'ready', properties })),
      catchError(() => of<PropertiesState>({ status: 'error' })),
      startWith<PropertiesState>({ status: 'loading' }),
    ),
    { requireSync: true },
  );

  /** Biens disponibles de l'agence, du plus récent au plus ancien. */
  protected readonly agencyProperties = computed(() => {
    const state = this.propertiesState();
    if (state.status !== 'ready') {
      return [];
    }
    return state.properties
      .filter((property) => property.agency.id === this.agencyId && property.available)
      .sort((a, b) => parseApiDate(b.createdAt) - parseApiDate(a.createdAt));
  });

  /** Squelettes affichés pendant le chargement des biens. */
  protected readonly skeletonItems = Array.from({ length: 3 }, (_, index) => index);

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
