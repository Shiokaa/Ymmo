import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { GlobalResponse } from '../models/global-response.model';
import { LoginResponse } from '../models/auth.model';
import { UserResponseDto } from '../models/user.model';
import { AuthService } from './auth.service';

const AUTH_STORAGE_KEY = 'ymmo_auth';

describe('AuthService', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  function createService(): AuthService {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  it('devrait appeler /auth/login avec withCredentials et marquer la session comme active', () => {
    const service = createService();
    const enveloppe: GlobalResponse<LoginResponse> = {
      data: { token: 'jwt-fictif', expiresIn: 3600_000 },
      message: null,
      success: true,
      timestamp: '01-06-2026 10:00:00',
    };

    let resultat: LoginResponse | undefined;
    service.login({ email: 'user@ymmo.fr', password: 'motdepasse' }).subscribe((reponse) => {
      resultat = reponse;
    });

    const requete = httpMock.expectOne('http://localhost:8080/api/auth/login');
    expect(requete.request.method).toBe('POST');
    expect(requete.request.withCredentials).toBe(true);
    expect(requete.request.body).toEqual({ email: 'user@ymmo.fr', password: 'motdepasse' });
    requete.flush(enveloppe);

    expect(resultat).toEqual(enveloppe.data);
    expect(service.isAuthenticated()).toBe(true);

    const stored = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)!);
    expect(stored.authenticated).toBe(true);
    expect(stored.expiresAt).toBeGreaterThan(Date.now());

    // Le login déclenche un appel /auth/me en effet de bord pour peupler currentUser.
    httpMock.expectOne('http://localhost:8080/api/auth/me').flush({
      data: null,
      message: null,
      success: true,
      timestamp: '01-06-2026 10:00:00',
    } as GlobalResponse<UserResponseDto | null>);
  });

  it('devrait considérer la session comme inactive si le drapeau local est expiré', () => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ authenticated: true, expiresAt: Date.now() - 1000 }),
    );

    const service = createService();

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('devrait appeler /auth/register avec le bon corps et compléter sans données', () => {
    const service = createService();
    const enveloppe: GlobalResponse<null> = {
      data: null,
      message: null,
      success: true,
      timestamp: '01-06-2026 10:00:00',
    };

    const requeteCorps = {
      firstName: 'Jeanne',
      lastName: 'Dupont',
      email: 'jeanne.dupont@ymmo.fr',
      password: 'motdepasse',
      phone: '0612345678',
    };

    let complete = false;
    service.register(requeteCorps).subscribe({
      complete: () => {
        complete = true;
      },
    });

    const requete = httpMock.expectOne('http://localhost:8080/api/auth/register');
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual(requeteCorps);
    requete.flush(enveloppe);

    expect(complete).toBe(true);
  });

  const utilisateur: UserResponseDto = {
    id: 'a1b2c3d4-0000-0000-0000-000000000000',
    firstName: 'Jeanne',
    lastName: 'Dupont',
    email: 'jeanne.dupont@ymmo.fr',
    phone: '0612345678',
    role: 'USER',
    createdAt: '01-06-2026 10:00:00',
    updatedAt: '01-06-2026 10:00:00',
  };

  it('devrait appeler /auth/me et peupler currentUser et isAuthenticated', () => {
    const service = createService();
    const enveloppe: GlobalResponse<UserResponseDto> = {
      data: utilisateur,
      message: null,
      success: true,
      timestamp: '01-06-2026 10:00:00',
    };

    let resultat: UserResponseDto | undefined;
    service.me().subscribe((reponse) => {
      resultat = reponse;
    });

    const requete = httpMock.expectOne('http://localhost:8080/api/auth/me');
    expect(requete.request.method).toBe('GET');
    requete.flush(enveloppe);

    expect(resultat).toEqual(utilisateur);
    expect(service.currentUser()).toEqual(utilisateur);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('devrait appeler /auth/logout et purger la session locale', () => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ authenticated: true, expiresAt: Date.now() + 3600_000 }),
    );

    const service = createService();
    expect(service.isAuthenticated()).toBe(true);

    let complete = false;
    service.logout().subscribe({
      complete: () => {
        complete = true;
      },
    });

    const requete = httpMock.expectOne('http://localhost:8080/api/auth/logout');
    expect(requete.request.method).toBe('POST');
    requete.flush({ data: null, message: null, success: true, timestamp: '01-06-2026 10:00:00' });

    expect(complete).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('devrait purger la session si loadCurrentUser échoue', () => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ authenticated: true, expiresAt: Date.now() + 3600_000 }),
    );

    const service = createService();
    expect(service.isAuthenticated()).toBe(true);

    service.loadCurrentUser();

    httpMock
      .expectOne('http://localhost:8080/api/auth/me')
      .flush(
        { data: null, message: 'UNAUTHORIZED', success: false, timestamp: '01-06-2026 10:00:00' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });
});
