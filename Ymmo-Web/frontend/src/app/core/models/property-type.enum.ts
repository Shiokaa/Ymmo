/**
 * Types de biens immobiliers proposés par les agences Ymmo (aligné sur l'enum backend).
 */
export enum PropertyType {
  HOUSE = 'HOUSE',
  APARTMENT = 'APARTMENT',
  LAND = 'LAND',
  PARKING = 'PARKING',
  BUILDING = 'BUILDING',
  OFFICE = 'OFFICE',
  RETAIL_SPACE = 'RETAIL_SPACE',
  WAREHOUSE = 'WAREHOUSE',
  BUSINESS_ASSETS = 'BUSINESS_ASSETS',
}

/**
 * Libellés français des types de biens, pour l'affichage.
 */
export const propertyTypeLabels: Record<PropertyType, string> = {
  [PropertyType.HOUSE]: 'Maison',
  [PropertyType.APARTMENT]: 'Appartement',
  [PropertyType.LAND]: 'Terrain',
  [PropertyType.PARKING]: 'Parking',
  [PropertyType.BUILDING]: 'Immeuble',
  [PropertyType.OFFICE]: 'Bureau',
  [PropertyType.RETAIL_SPACE]: 'Local commercial',
  [PropertyType.WAREHOUSE]: 'Entrepôt',
  [PropertyType.BUSINESS_ASSETS]: 'Fonds de commerce',
};
