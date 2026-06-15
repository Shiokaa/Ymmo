import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TagModule } from 'primeng/tag';

import { FavoritesService } from '../../../core/services/favorites.service';
import { PropertyResponseDto } from '../../../core/models/property.model';
import { propertyTypeLabels } from '../../../core/models/property-type.enum';

/** Formateur de prix FR : « 245 000 € », sans décimales. */
const priceFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/**
 * Card d'un bien immobilier : image de couverture, type, titre, prix,
 * localisation et caractéristiques principales.
 */
@Component({
  selector: 'app-property-card',
  imports: [RouterLink, TagModule],
  templateUrl: './property-card.html',
  styleUrl: './property-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyCard {
  private readonly favorites = inject(FavoritesService);

  /** Bien à afficher. */
  readonly property = input.required<PropertyResponseDto>();

  /** Position dans la grille — sert à varier la teinte du placeholder. */
  readonly index = input(0);

  /** Indique si le bien fait partie des favoris. */
  protected readonly isFavorite = computed(() => this.favorites.has(this.property().id));

  /** Teinte du placeholder (6 variantes, comme la maquette). */
  protected readonly hue = computed(() => this.index() % 6);

  /** URL de l'image de couverture : isCover prioritaire, sinon première image. */
  protected readonly coverImageUrl = computed(() => {
    const images = this.property().propertyImages ?? [];
    const cover = images.find((image) => image.isCover) ?? images[0];
    return cover?.imageUrl ?? null;
  });

  protected readonly typeLabel = computed(() => propertyTypeLabels[this.property().type]);

  protected readonly formattedPrice = computed(() => priceFormatter.format(this.property().price));

  protected toggleFavorite(event: Event): void {
    // Empêche la navigation vers la fiche du bien quand on clique sur le cœur
    event.preventDefault();
    event.stopPropagation();
    this.favorites.toggle(this.property().id);
  }
}
