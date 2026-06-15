import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AgencyStatus } from '../../core/models/agency-status.enum';
import { AgencyResponseDto } from '../../core/models/agency.model';
import { GlobalResponse } from '../../core/models/global-response.model';
import { Agencies } from './agencies';

/** Construit une agence minimale pour les scénarios de test. */
function buildAgency(overrides: Partial<AgencyResponseDto> = {}): AgencyResponseDto {
  return {
    id: crypto.randomUUID(),
    name: 'Ymmo Aix Centre',
    description: 'Une agence de quartier au cœur du centre-ville.',
    email: 'aix@ymmo.fr',
    address: '12 cours Mirabeau',
    city: 'Aix-en-Provence',
    postalCode: '13100',
    phone: '0442000000',
    status: AgencyStatus.OPEN,
    createdAt: '01-06-2026 10:00:00',
    updatedAt: '01-06-2026 10:00:00',
    ...overrides,
  };
}

function envelope<T>(data: T): GlobalResponse<T> {
  return { data, message: null, success: true, timestamp: '01-06-2026 10:00:00' };
}

describe('Agencies', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Agencies],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function createAgencies(): ComponentFixture<Agencies> {
    const fixture = TestBed.createComponent(Agencies);
    fixture.detectChanges();
    return fixture;
  }

  it('devrait se créer', () => {
    const fixture = createAgencies();
    expect(fixture.componentInstance).toBeTruthy();

    httpMock.expectOne('http://localhost:8080/api/agencies').flush(envelope([]));
  });

  it("devrait afficher les agences renvoyées par l'API", async () => {
    const fixture = createAgencies();

    httpMock.expectOne('http://localhost:8080/api/agencies').flush(envelope([buildAgency()]));
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.agency-card').length).toBe(1);
    expect(element.textContent).toContain('Ymmo Aix Centre');
  });

  it("devrait afficher le message d'absence d'agence quand la liste est vide", async () => {
    const fixture = createAgencies();

    httpMock.expectOne('http://localhost:8080/api/agencies').flush(envelope([]));
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.grid-empty')?.textContent).toContain('Aucune agence à afficher');
  });

  it("devrait afficher un message d'erreur quand l'API est injoignable", async () => {
    const fixture = createAgencies();

    httpMock
      .expectOne('http://localhost:8080/api/agencies')
      .error(new ProgressEvent('Erreur réseau simulée'));
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.grid-empty')?.textContent).toContain(
      'Impossible de charger les agences',
    );
  });
});
