/** Type de demande client sur un bien. */
export type RequestType = 'INFO' | 'VISITE';

/** Statut d'avancement d'une demande. */
export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'REFUSED' | 'DONE';

/** Demande renvoyée par l'API. */
export interface RequestResponseDto {
  id: string;
  propertyId: string;
  propertyTitle: string;
  userId: string;
  userFullName: string;
  type: RequestType;
  message: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}

/** Création d'une demande (client). */
export interface RequestCreateDto {
  propertyId: string;
  type: RequestType;
  message: string;
}

/** Mise à jour du statut d'une demande (agent/admin). */
export interface RequestStatusUpdateDto {
  status: RequestStatus;
}
