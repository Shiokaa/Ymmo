/** Statut d'avancement d'une transaction. */
export type TransactionStatus =
  | 'INITIATED'
  | 'OFFER'
  | 'NEGOTIATION'
  | 'COMPROMISE'
  | 'COMPLETED'
  | 'CANCELLED';

/** Transaction renvoyée par l'API. */
export interface TransactionResponseDto {
  id: string;
  propertyId: string;
  propertyTitle: string;
  clientId: string;
  clientFullName: string;
  agentId: string | null;
  agentFullName: string | null;
  status: TransactionStatus;
  amount: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Création d'une transaction (agent/admin). */
export interface TransactionCreateDto {
  propertyId: string;
  clientId: string;
  amount?: number | null;
}

/** Mise à jour d'une transaction (agent/admin). */
export interface TransactionUpdateDto {
  status: TransactionStatus;
  amount?: number | null;
}
