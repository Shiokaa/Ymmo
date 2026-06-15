import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { PropertyService } from '../../../core/services/property.service';
import { PropertyResponseDto } from '../../../core/models/property.model';
import { PropertyType, propertyTypeLabels } from '../../../core/models/property-type.enum';

/** Formateur de prix FR : « 245 000 € », sans décimales. */
const priceFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/**
 * Liste des biens de l'agence connectée, avec accès à l'édition,
 * la suppression et la création d'un nouveau bien.
 */
@Component({
  selector: 'app-agent-property-list',
  imports: [RouterLink, ButtonModule, TableModule, TagModule],
  templateUrl: './property-list.html',
  styleUrl: './property-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentPropertyList {
  private readonly propertyService = inject(PropertyService);

  /** Libellé lisible du type de bien (le contexte de `p-table` est typé `any`). */
  protected typeLabel(type: PropertyType): string {
    return propertyTypeLabels[type];
  }

  /** Biens de l'agence, `null` pendant le chargement initial. */
  protected readonly propertiesSignal = signal<PropertyResponseDto[] | null>(null);

  /** Indique si le chargement des biens a échoué. */
  protected readonly loadError = signal(false);

  constructor() {
    this.load();
  }

  /** Charge (ou recharge) la liste des biens. */
  private load(): void {
    this.propertyService.getAllProperties().subscribe({
      next: (list) => this.propertiesSignal.set(list),
      error: () => this.loadError.set(true),
    });
  }

  /** Formate un prix en euros (« 245 000 € »). */
  protected formatPrice(price: number): string {
    return priceFormatter.format(price);
  }

  /** Supprime un bien après confirmation, puis recharge la liste. */
  protected deleteProperty(property: PropertyResponseDto): void {
    if (!confirm('Supprimer ce bien ?')) {
      return;
    }
    this.propertyService.deleteProperty(property.id).subscribe({
      next: () => this.load(),
    });
  }
}
