import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../api.config';
import { GlobalResponse } from '../models/global-response.model';
import {
  UserResponseDto,
  UserUpdatePasswordDto,
  UserUpdateProfilDto,
  UserUpdateRoleDto,
} from '../models/user.model';

/**
 * Service de gestion du compte utilisateur de l'API Ymmo.
 */
@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/users`;

  /** Met à jour les informations de profil de l'utilisateur. */
  updateProfile(id: string, dto: UserUpdateProfilDto): Observable<UserResponseDto> {
    return this.http
      .put<GlobalResponse<UserResponseDto>>(`${this.baseUrl}/profile/${id}`, dto)
      .pipe(map((response) => response.data));
  }

  /** Met à jour le mot de passe de l'utilisateur. */
  updatePassword(id: string, dto: UserUpdatePasswordDto): Observable<void> {
    return this.http
      .put<GlobalResponse<null>>(`${this.baseUrl}/password/${id}`, dto)
      .pipe(map(() => void 0));
  }

  /** Liste de tous les utilisateurs (ADMIN). */
  getAllUsers(): Observable<UserResponseDto[]> {
    return this.http
      .get<GlobalResponse<UserResponseDto[]>>(this.baseUrl)
      .pipe(map((response) => response.data));
  }

  /** Change le rôle d'un utilisateur (ADMIN). */
  updateRole(id: string, dto: UserUpdateRoleDto): Observable<UserResponseDto> {
    return this.http
      .put<GlobalResponse<UserResponseDto>>(`${this.baseUrl}/${id}/role`, dto)
      .pipe(map((response) => response.data));
  }

  /** Supprime un utilisateur (ADMIN). */
  deleteUser(id: string): Observable<void> {
    return this.http.delete<GlobalResponse<null>>(`${this.baseUrl}/${id}`).pipe(map(() => void 0));
  }
}
