/**
 * Statistiques globales renvoyées par `GET /stats/overview`.
 * `propertiesByType` est indexé par valeur de `PropertyType`, `propertiesByCity` par nom de ville.
 */
export interface StatsOverviewDto {
  totalProperties: number;
  availableProperties: number;
  totalAgencies: number;
  totalUsers: number;
  propertiesByType: Record<string, number>;
  propertiesByCity: Record<string, number>;
  averagePrice: number;
}
