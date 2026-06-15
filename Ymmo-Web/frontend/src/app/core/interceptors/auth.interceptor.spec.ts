import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let httpMock: HttpTestingController;
  let http: HttpClient;
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    http = TestBed.inject(HttpClient);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it("devrait ajouter withCredentials aux requêtes vers l'API Ymmo", () => {
    http.get('http://localhost:8080/api/auth/me').subscribe({ error: () => {} });

    const requete = httpMock.expectOne('http://localhost:8080/api/auth/me');
    expect(requete.request.withCredentials).toBe(true);

    requete.flush(
      { data: null, message: 'UNAUTHORIZED', success: false, timestamp: '' },
      { status: 401, statusText: 'Unauthorized' },
    );
  });

  it('devrait purger la session et rediriger vers /auth/login sur un 401 hors /auth/me et /auth/login', () => {
    const clearSessionSpy = vi.spyOn(authService, 'clearSession');
    const navigateSpy = vi.spyOn(router, 'navigate');

    http.get('http://localhost:8080/api/properties').subscribe({ error: () => {} });

    const requete = httpMock.expectOne('http://localhost:8080/api/properties');
    requete.flush(
      { data: null, message: 'UNAUTHORIZED', success: false, timestamp: '' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(clearSessionSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login']);
  });

  it('ne devrait pas purger la session sur un 401 venant de /auth/me', () => {
    const clearSessionSpy = vi.spyOn(authService, 'clearSession');
    const navigateSpy = vi.spyOn(router, 'navigate');

    http.get('http://localhost:8080/api/auth/me').subscribe({ error: () => {} });

    const requete = httpMock.expectOne('http://localhost:8080/api/auth/me');
    requete.flush(
      { data: null, message: 'UNAUTHORIZED', success: false, timestamp: '' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(clearSessionSpy).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
