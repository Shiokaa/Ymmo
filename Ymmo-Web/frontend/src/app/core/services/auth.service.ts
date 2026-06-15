import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, map, tap } from 'rxjs';

import { API_BASE_URL } from '../api.config';
import { LoginRequest, LoginResponse, RegisterRequest } from '../models/auth.model';
import { GlobalResponse } from '../models/global-response.model';
import { UserResponseDto } from '../models/user.model';

/** Clé localStorage du drapeau de session (non sensible : le JWT reste dans un cookie httpOnly). */
const AUTH_STORAGE_KEY = 'ymmo_auth';

/** Drapeau de session persisté côté client. */
interface StoredAuth {
  authenticated: true;
  expiresAt: number;
}

/**
 * Service d'authentification de l'API Ymmo.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/auth`;

  /** Indique si un utilisateur est connecté (drapeau local non expiré). */
  readonly isAuthenticated = signal<boolean>(this.readStoredAuth());

  /** Utilisateur courant, peuplé par `me()`. */
  readonly currentUser = signal<UserResponseDto | null>(null);

  /**
   * Connecte l'utilisateur : le backend pose un cookie JWT httpOnly et renvoie sa durée de vie.
   */
  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<GlobalResponse<LoginResponse>>(`${this.baseUrl}/login`, req, { withCredentials: true })
      .pipe(
        map((response) => response.data),
        tap((data) => {
          this.persistSession(data.expiresIn);
          this.me().subscribe({ error: () => {} });
        }),
      );
  }

  /** Crée un compte. Le backend ne renvoie pas de token (pas d'auto-login). */
  register(req: RegisterRequest): Observable<void> {
    return this.http
      .post<GlobalResponse<null>>(`${this.baseUrl}/register`, req)
      .pipe(map(() => void 0));
  }

  /** Récupère l'utilisateur courant et met à jour l'état de session. */
  me(): Observable<UserResponseDto> {
    return this.http.get<GlobalResponse<UserResponseDto>>(`${this.baseUrl}/me`).pipe(
      map((response) => response.data),
      tap((user) => {
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      }),
    );
  }

  /** Sonde de réhydratation appelée au démarrage : purge la session si l'utilisateur n'est plus authentifié. */
  loadCurrentUser(): void {
    this.me().subscribe({ error: () => this.clearSession() });
  }

  /** Déconnecte l'utilisateur et purge la session locale, que l'appel réussisse ou non. */
  logout(): Observable<void> {
    return this.http.post<GlobalResponse<null>>(`${this.baseUrl}/logout`, {}).pipe(
      map(() => void 0),
      finalize(() => this.clearSession()),
    );
  }

  /** Purge l'état de session local (drapeau, utilisateur courant, indicateur d'authentification). */
  clearSession(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
  }

  /** Enregistre le drapeau de session local et marque l'utilisateur comme connecté. */
  private persistSession(expiresIn: number): void {
    const stored: StoredAuth = { authenticated: true, expiresAt: Date.now() + expiresIn };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored));
    this.isAuthenticated.set(true);
  }

  /** Lit le drapeau de session local ; le purge et renvoie `false` s'il est absent ou expiré. */
  private readStoredAuth(): boolean {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return false;
    }

    const stored = JSON.parse(raw) as StoredAuth;
    if (stored.expiresAt <= Date.now()) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return false;
    }

    return true;
  }
}
