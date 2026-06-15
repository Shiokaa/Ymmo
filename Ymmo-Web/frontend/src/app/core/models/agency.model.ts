import { AgencyStatus } from './agency-status.enum';

/**
 * Représentation d'une agence renvoyée par l'API.
 */
export interface AgencyResponseDto {
  id: string;
  name: string;
  description: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  status: AgencyStatus;
  createdAt: string;
  updatedAt: string;
}
