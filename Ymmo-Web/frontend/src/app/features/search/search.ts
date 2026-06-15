import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { catchError, map, of, startWith } from 'rxjs';

import { PropertyService } from '../../core/services/property.service';
import { PropertyResponseDto } from '../../core/models/property.model';
import { PropertyType, propertyTypeLabels } from '../../core/models/property-type.enum';
import { Footer } from '../../layout/footer/footer';
import { Header } from '../../layout/header/header';
import { PropertyCard } from '../../shared/components/property-card/property-card';

/** État de chargement de la liste des biens. */
type PropertiesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; properties: PropertyResponseDto[] };

/** Option du sélecteur de type de bien. */
interface TypeOption {
  label: string;
  value: PropertyType | null;
}

/** Ordres de tri proposés pour les résultats. */
type SortOrder = 'recent' | 'price-asc' | 'price-desc';

/** Option du sélecteur de tri. */
interface SortOption {
  label: string;
  value: SortOrder;
}

/** Nombre de squelettes affichés pendant le chargement. */
const SKELETON_COUNT = 6;

/** Nombre de résultats affichés par page. */
const PAGE_SIZE = 12;

/** Parse une date au format API « dd-MM-yyyy HH:mm:ss » en timestamp. */
function parseApiDate(value: string): number {
  const [datePart, timePart = '00:00:00'] = value.split(' ');
  const [day, month, year] = datePart.split('-').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
}

/**
 * Page de recherche : liste des biens disponibles, filtrable par ville, type et mot-clé.
 */
@Component({
  selector: 'app-search',
  imports: [FormsModule, ButtonModule, SelectModule, SkeletonModule, Header, Footer, PropertyCard],
  templateUrl: './search.html',
  styleUrl: './search.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Search {
  private readonly propertyService = inject(PropertyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Chargement des biens, avec gestion d'erreur intégrée à l'état. */
  protected readonly propertiesState = toSignal(
    this.propertyService.getAllProperties().pipe(
      map((properties): PropertiesState => ({ status: 'ready', properties })),
      catchError(() => of<PropertiesState>({ status: 'error' })),
      startWith<PropertiesState>({ status: 'loading' }),
    ),
    { requireSync: true },
  );

  /** Squelettes affichés pendant le chargement. */
  protected readonly skeletonItems = Array.from({ length: SKELETON_COUNT }, (_, index) => index);

  // ---- Filtres ----

  protected readonly searchCity = signal(this.route.snapshot.queryParamMap.get('city') ?? '');
  protected readonly searchType = signal<PropertyType | null>(this.initialSearchType());
  protected readonly searchQuery = signal(this.route.snapshot.queryParamMap.get('q') ?? '');
  protected readonly sortOrder = signal<SortOrder>('recent');

  /** Nombre de résultats actuellement affichés (pagination « Charger plus »). */
  protected readonly visibleCount = signal(PAGE_SIZE);

  protected readonly typeOptions: TypeOption[] = [
    { label: 'Tous les biens', value: null },
    ...Object.values(PropertyType).map((type) => ({
      label: propertyTypeLabels[type],
      value: type,
    })),
  ];

  protected readonly sortOptions: SortOption[] = [
    { label: 'Plus récents', value: 'recent' },
    { label: 'Prix croissant', value: 'price-asc' },
    { label: 'Prix décroissant', value: 'price-desc' },
  ];

  /** Met à jour la ville et synchronise l'URL. */
  protected onCityChange(value: string): void {
    this.searchCity.set(value);
    this.visibleCount.set(PAGE_SIZE);
    this.syncQueryParams();
  }

  /** Met à jour le type et synchronise l'URL. */
  protected onTypeChange(value: PropertyType | null): void {
    this.searchType.set(value);
    this.visibleCount.set(PAGE_SIZE);
    this.syncQueryParams();
  }

  /** Met à jour le mot-clé et synchronise l'URL. */
  protected onQueryChange(value: string): void {
    this.searchQuery.set(value);
    this.visibleCount.set(PAGE_SIZE);
    this.syncQueryParams();
  }

  /** Met à jour l'ordre de tri (ne modifie pas l'URL). */
  protected onSortChange(value: SortOrder): void {
    this.sortOrder.set(value);
    this.visibleCount.set(PAGE_SIZE);
  }

  /** Affiche une page supplémentaire de résultats. */
  protected showMore(): void {
    this.visibleCount.update((n) => n + PAGE_SIZE);
  }

  /** Type initial issu des queryParams, validé contre les valeurs connues de `PropertyType`. */
  private initialSearchType(): PropertyType | null {
    const type = this.route.snapshot.queryParamMap.get('type');
    const values: string[] = Object.values(PropertyType);
    return type && values.includes(type) ? (type as PropertyType) : null;
  }

  /** Reflète les filtres ville/type/mot-clé dans les queryParams, sans recharger la page. */
  private syncQueryParams(): void {
    const city = this.searchCity().trim();
    const type = this.searchType();
    const query = this.searchQuery().trim();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        city: city || null,
        type: type || null,
        q: query || null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Résultats filtrés et triés selon les critères courants. */
  protected readonly results = computed(() => {
    const state = this.propertiesState();
    if (state.status !== 'ready') {
      return [];
    }

    const city = this.searchCity().trim().toLowerCase();
    const type = this.searchType();
    const query = this.searchQuery().trim().toLowerCase();

    const filtered = state.properties.filter((property) => {
      if (!property.available) {
        return false;
      }
      if (city && !property.city.toLowerCase().includes(city)) {
        return false;
      }
      if (type && property.type !== type) {
        return false;
      }
      if (
        query &&
        !`${property.title} ${property.description} ${property.city}`.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });

    const sorted = [...filtered];
    switch (this.sortOrder()) {
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'recent':
      default:
        sorted.sort((a, b) => parseApiDate(b.createdAt) - parseApiDate(a.createdAt));
        break;
    }

    return sorted;
  });

  /** Résultats affichés, tronqués à `visibleCount()`. */
  protected readonly visibleResults = computed(() => this.results().slice(0, this.visibleCount()));
}
