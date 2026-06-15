import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { catchError, map, of, startWith } from 'rxjs';

import { AgencyService } from '../../core/services/agency.service';
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

/** Nombre maximum de biens mis en avant sur l'accueil. */
const FEATURED_LIMIT = 8;

/** Parse une date au format API « dd-MM-yyyy HH:mm:ss » en timestamp. */
function parseApiDate(value: string): number {
  const [datePart, timePart = '00:00:00'] = value.split(' ');
  const [day, month, year] = datePart.split('-').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
}

/**
 * Page d'accueil : hero avec recherche, biens récents, réseau d'agences.
 */
@Component({
  selector: 'app-home',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    SelectModule,
    SkeletonModule,
    Header,
    Footer,
    PropertyCard,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly propertyService = inject(PropertyService);
  private readonly agencyService = inject(AgencyService);
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

  /** Nombre d'agences du réseau — 12 en secours si l'API est indisponible. */
  protected readonly agencyCount = toSignal(
    this.agencyService.getAllAgencies().pipe(
      map((agencies) => agencies.length || 12),
      catchError(() => of(12)),
      startWith(12),
    ),
    { requireSync: true },
  );

  /** Biens mis en avant : disponibles, du plus récent au plus ancien, 8 max. */
  protected readonly featuredProperties = computed(() => {
    const state = this.propertiesState();
    if (state.status !== 'ready') {
      return [];
    }
    return state.properties
      .filter((property) => property.available)
      .sort((a, b) => parseApiDate(b.createdAt) - parseApiDate(a.createdAt))
      .slice(0, FEATURED_LIMIT);
  });

  /** Compteur de biens disponibles affiché dans les statistiques du hero. */
  protected readonly availableCountLabel = computed(() => {
    const state = this.propertiesState();
    if (state.status !== 'ready') {
      return '—';
    }
    const count = state.properties.filter((property) => property.available).length;
    return new Intl.NumberFormat('fr-FR').format(count);
  });

  /** Squelettes affichés pendant le chargement. */
  protected readonly skeletonItems = Array.from({ length: FEATURED_LIMIT }, (_, index) => index);

  // ---- Barre de recherche ----

  protected readonly searchCity = signal('');
  protected readonly searchType = signal<PropertyType | null>(null);
  protected readonly cityFieldFocused = signal(false);

  protected readonly typeOptions: TypeOption[] = [
    { label: 'Tous les biens', value: null },
    ...Object.values(PropertyType).map((type) => ({
      label: propertyTypeLabels[type],
      value: type,
    })),
  ];

  /** Villes suggérées sous le champ « Où » (issues de la maquette). */
  private readonly popularCities = [
    'Aix-en-Provence',
    'Marseille',
    'Cassis',
    'Lourmarin',
    'Le Tholonet',
  ];

  /** Suggestions filtrées par la saisie courante. */
  protected readonly citySuggestions = computed(() => {
    const query = this.searchCity().toLowerCase();
    return this.popularCities.filter((city) => city.toLowerCase().includes(query));
  });

  /** Recherches fréquentes affichées sous la barre (puces). */
  protected readonly frequentSearches = [
    'Maison Aix',
    'T3 Marseille',
    'Terrain Provence',
    'Bureau centre-ville',
    'Maison de village',
  ];

  protected onCityBlur(): void {
    // Petit délai pour laisser le clic sur une suggestion aboutir avant fermeture
    setTimeout(() => this.cityFieldFocused.set(false), 150);
  }

  protected selectCity(city: string): void {
    this.searchCity.set(city);
    this.cityFieldFocused.set(false);
  }

  /** Soumet la recherche : navigue vers /search avec les critères saisis. */
  protected submitSearch(): void {
    const city = this.searchCity().trim();
    const type = this.searchType();
    this.router.navigate(['/search'], {
      queryParams: {
        ...(city ? { city } : {}),
        ...(type ? { type } : {}),
      },
    });
  }

  /** Une puce de recherche fréquente envoie son libellé en requête libre. */
  protected searchFrequent(query: string): void {
    this.router.navigate(['/search'], { queryParams: { q: query } });
  }

  /** Positions des épingles sur la carte stylisée du réseau (% relatifs, cf. maquette). */
  protected readonly mapPins: { x: number; y: number; lg?: boolean; label?: string }[] = [
    { x: 32, y: 38, lg: true, label: 'Aix Centre' },
    { x: 28, y: 30 },
    { x: 38, y: 44 },
    { x: 24, y: 50 },
    { x: 48, y: 62, lg: true, label: 'Marseille' },
    { x: 54, y: 56 },
    { x: 60, y: 68 },
    { x: 72, y: 72, label: 'Cassis' },
    { x: 68, y: 38, label: 'Lourmarin' },
    { x: 18, y: 64 },
    { x: 82, y: 50 },
    { x: 44, y: 22 },
  ];
}
