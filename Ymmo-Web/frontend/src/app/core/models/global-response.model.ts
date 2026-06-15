/**
 * Enveloppe générique de réponse de l'API Ymmo.
 */
export interface GlobalResponse<T> {
  data: T;
  message: string | null;
  success: boolean;
  timestamp: string;
}
