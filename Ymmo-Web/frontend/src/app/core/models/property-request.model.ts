import { PropertyType } from './property-type.enum';

/**
 * Données de création / mise à jour d'un bien envoyées à l'API.
 */
export interface PropertyRequestDto {
  agencyId: string;
  title: string;
  description: string;
  type: PropertyType;
  address: string;
  city: string;
  postalCode: string;
  price: number;
  size: number;
  roomsCount: number;
  available: boolean;
}
