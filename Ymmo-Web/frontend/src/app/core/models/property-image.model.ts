/**
 * Image associée à un bien immobilier.
 */
export interface PropertyImageResponseDto {
  id: string;
  imageUrl: string;
  description: string;
  isCover: boolean;
}
