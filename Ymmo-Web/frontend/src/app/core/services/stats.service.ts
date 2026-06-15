import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../api.config';
import { GlobalResponse } from '../models/global-response.model';
import { StatsOverviewDto } from '../models/stats.model';

/**
 * Service d'accès aux statistiques (réservé AGENT/ADMIN côté API).
 */
@Injectable({
  providedIn: 'root',
})
export class StatsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/stats`;

  /** Vue d'ensemble : compteurs, répartitions par type/ville, prix moyen. */
  getOverview(): Observable<StatsOverviewDto> {
    return this.http
      .get<GlobalResponse<StatsOverviewDto>>(`${this.baseUrl}/overview`)
      .pipe(map((response) => response.data));
  }
}
