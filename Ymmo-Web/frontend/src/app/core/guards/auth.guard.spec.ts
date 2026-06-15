import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';

import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let httpMock: HttpTestingController;
  let authService: AuthService;

  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/favorites' } as RouterStateSnapshot;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it("devrait autoriser l'accès si l'utilisateur est authentifié", () => {
    authService.isAuthenticated.set(true);

    const resultat = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(resultat).toBe(true);
  });

  it("devrait rediriger vers /auth/login si l'utilisateur n'est pas authentifié", () => {
    authService.isAuthenticated.set(false);

    const resultat = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(resultat).toBeInstanceOf(UrlTree);
    expect((resultat as UrlTree).toString()).toContain('/auth/login');
    expect((resultat as UrlTree).toString()).toContain('returnUrl=%2Ffavorites');
  });
});
