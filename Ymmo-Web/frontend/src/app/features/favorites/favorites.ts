import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { catchError, map, of, startWith } from 'rxjs';

import { FavoritesService } from '../../core/services/favorites.service';
import { PropertyService } from '../../core/services/property.service';
import { PropertyResponseDto } from '../../core/models/property.model';
import { Footer } from '../../layout/footer/footer';
import { Header } from '../../layout/header/header';
import { PropertyCard } from '../../shared/components/property-card/property-card';

/** État de chargement de la liste des biens. */
type PropertiesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; properties: PropertyResponseDto[] };

/** Nombre de squelettes affichés pendant le chargement. */
const SKELETON_COUNT = 3;

/**
 * Page des favoris : biens sauvegardés par l'utilisateur (persistés en localStorage).
 */
@Component({
  selector: 'app-favorites',
  imports: [RouterLink, SkeletonModule, Header, Footer, PropertyCard],
  templateUrl: './favorites.html',
  styleUrl: './favorites.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Favorites {
  private readonly favorites = inject(FavoritesService);
  private readonly propertyService = inject(PropertyService);

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

  /** Biens correspondant aux favoris courants. */
  protected readonly favoriteProperties = computed(() => {
    const state = this.propertiesState();
    if (state.status !== 'ready') {
      return [];
    }

    const ids = this.favorites.favoriteIds();
    return state.properties.filter((property) => ids.includes(property.id));
  });
}
