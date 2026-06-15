import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../api.config';
import { GlobalResponse } from '../models/global-response.model';
import {
  TransactionCreateDto,
  TransactionResponseDto,
  TransactionUpdateDto,
} from '../models/transaction.model';

/**
 * Service des transactions immobilières (suivi des démarches).
 */
@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/transactions`;

  /** Crée une transaction (AGENT/ADMIN). */
  create(dto: TransactionCreateDto): Observable<TransactionResponseDto> {
    return this.http
      .post<GlobalResponse<TransactionResponseDto>>(this.baseUrl, dto)
      .pipe(map((response) => response.data));
  }

  /** Toutes les transactions (AGENT/ADMIN). */
  getAll(): Observable<TransactionResponseDto[]> {
    return this.http
      .get<GlobalResponse<TransactionResponseDto[]>>(this.baseUrl)
      .pipe(map((response) => response.data));
  }

  /** Détail d'une transaction (AGENT/ADMIN). */
  getById(id: string): Observable<TransactionResponseDto> {
    return this.http
      .get<GlobalResponse<TransactionResponseDto>>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  /** Transactions de l'utilisateur courant (client). */
  getMine(): Observable<TransactionResponseDto[]> {
    return this.http
      .get<GlobalResponse<TransactionResponseDto[]>>(`${this.baseUrl}/me`)
      .pipe(map((response) => response.data));
  }

  /** Met à jour une transaction (statut / montant, AGENT/ADMIN). */
  update(id: string, dto: TransactionUpdateDto): Observable<TransactionResponseDto> {
    return this.http
      .put<GlobalResponse<TransactionResponseDto>>(`${this.baseUrl}/${id}`, dto)
      .pipe(map((response) => response.data));
  }
}
