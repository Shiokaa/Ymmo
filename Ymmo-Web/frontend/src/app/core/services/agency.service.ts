import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../api.config';
import { AgencyResponseDto } from '../models/agency.model';
import { GlobalResponse } from '../models/global-response.model';

/**
 * Service d'accès aux agences du réseau Ymmo.
 */
@Injectable({
  providedIn: 'root',
})
export class AgencyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/agencies`;

  /**
   * Récupère la liste des agences.
   */
  getAllAgencies(): Observable<AgencyResponseDto[]> {
    return this.http
      .get<GlobalResponse<AgencyResponseDto[]>>(this.baseUrl)
      .pipe(map((response) => response.data));
  }

  /**
   * Récupère une agence par son identifiant.
   */
  getAgencyById(id: string): Observable<AgencyResponseDto> {
    return this.http
      .get<GlobalResponse<AgencyResponseDto>>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.data));
  }
}
