import { AgencyResponseDto } from './agency.model';
import { PropertyImageResponseDto } from './property-image.model';
import { PropertyType } from './property-type.enum';

/**
 * Représentation d'un bien immobilier renvoyé par l'API.
 */
export interface PropertyResponseDto {
  id: string;
  agency: AgencyResponseDto;
  propertyImages: PropertyImageResponseDto[];
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
  createdAt: string;
  updatedAt: string;
}
