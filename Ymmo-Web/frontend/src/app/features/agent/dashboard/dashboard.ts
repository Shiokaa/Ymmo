import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith } from 'rxjs';

import { StatsService } from '../../../core/services/stats.service';
import { StatsOverviewDto } from '../../../core/models/stats.model';
import { PropertyType, propertyTypeLabels } from '../../../core/models/property-type.enum';

/** État de chargement des statistiques. */
type DashboardState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; stats: StatsOverviewDto };

/** Ligne de répartition par type de bien (libellé, compteur, largeur de barre en %). */
interface TypeRow {
  label: string;
  count: number;
  percent: number;
}

/** Ligne de répartition par ville (nom, compteur). */
interface CityRow {
  city: string;
  count: number;
}

/** Nombre de villes affichées dans le top. */
const TOP_CITIES_LIMIT = 6;

/** Formateur de prix FR : « 245 000 € », sans décimales. */
const priceFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/** Formateur de nombres FR : « 1 234 ». */
const numberFormatter = new Intl.NumberFormat('fr-FR');

/**
 * Tableau de bord de l'espace agent : compteurs globaux, répartition des biens
 * par type et par ville, prix moyen.
 */
@Component({
  selector: 'app-agent-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentDashboard {
  private readonly statsService = inject(StatsService);

  /** Chargement des statistiques, avec gestion d'erreur intégrée à l'état. */
  protected readonly state = toSignal(
    this.statsService.getOverview().pipe(
      map((stats): DashboardState => ({ status: 'ready', stats })),
      catchError(() => of<DashboardState>({ status: 'error' })),
      startWith<DashboardState>({ status: 'loading' }),
    ),
    { requireSync: true },
  );

  /** Statistiques courantes, ou `null` hors de l'état « ready ». */
  protected readonly stats = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.stats : null;
  });

  /** Répartition par type de bien, triée par nombre décroissant, avec largeur de barre proportionnelle. */
  protected readonly typeRows = computed<TypeRow[]>(() => {
    const stats = this.stats();
    if (!stats) {
      return [];
    }
    const entries = Object.entries(stats.propertiesByType);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    return entries
      .map(([type, count]) => ({
        label: propertyTypeLabels[type as PropertyType] ?? type,
        count,
        percent: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  });

  /** Top des villes par nombre de biens, triées par nombre décroissant. */
  protected readonly topCities = computed<CityRow[]>(() => {
    const stats = this.stats();
    if (!stats) {
      return [];
    }
    return Object.entries(stats.propertiesByCity)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_CITIES_LIMIT);
  });

  /** Formate un nombre avec séparateur de milliers (« 1 234 »). */
  protected formatNumber(value: number): string {
    return numberFormatter.format(value);
  }

  /** Formate un prix en euros (« 245 000 € »). */
  protected formatPrice(value: number): string {
    return priceFormatter.format(value);
  }

  /** Squelettes affichés pendant le chargement (une carte par compteur). */
  protected readonly skeletonCards = Array.from({ length: 4 }, (_, index) => index);
}
