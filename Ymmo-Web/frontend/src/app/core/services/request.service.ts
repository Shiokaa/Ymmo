import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../api.config';
import { GlobalResponse } from '../models/global-response.model';
import {
  RequestCreateDto,
  RequestResponseDto,
  RequestStatusUpdateDto,
} from '../models/request.model';

/**
 * Service des demandes de visite / d'information sur les biens.
 */
@Injectable({
  providedIn: 'root',
})
export class RequestService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/requests`;

  /** Crée une demande (client connecté). */
  create(dto: RequestCreateDto): Observable<RequestResponseDto> {
    return this.http
      .post<GlobalResponse<RequestResponseDto>>(this.baseUrl, dto)
      .pipe(map((response) => response.data));
  }

  /** Demandes de l'utilisateur courant. */
  getMine(): Observable<RequestResponseDto[]> {
    return this.http
      .get<GlobalResponse<RequestResponseDto[]>>(`${this.baseUrl}/me`)
      .pipe(map((response) => response.data));
  }

  /** Toutes les demandes (AGENT/ADMIN). */
  getAll(): Observable<RequestResponseDto[]> {
    return this.http
      .get<GlobalResponse<RequestResponseDto[]>>(this.baseUrl)
      .pipe(map((response) => response.data));
  }

  /** Met à jour le statut d'une demande (AGENT/ADMIN). */
  updateStatus(id: string, dto: RequestStatusUpdateDto): Observable<RequestResponseDto> {
    return this.http
      .put<GlobalResponse<RequestResponseDto>>(`${this.baseUrl}/${id}/status`, dto)
      .pipe(map((response) => response.data));
  }
}
