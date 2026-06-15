import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GlobalResponse } from '../../../core/models/global-response.model';
import { StatsOverviewDto } from '../../../core/models/stats.model';
import { AgentDashboard } from './dashboard';

function envelope<T>(data: T): GlobalResponse<T> {
  return { data, message: null, success: true, timestamp: '01-06-2026 10:00:00' };
}

const STATS: StatsOverviewDto = {
  totalProperties: 42,
  availableProperties: 30,
  totalAgencies: 3,
  totalUsers: 50,
  propertiesByType: { HOUSE: 10, APARTMENT: 20 },
  propertiesByCity: { Marseille: 15, Aix: 10 },
  averagePrice: 250000,
};

describe('AgentDashboard', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentDashboard],
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

  it('devrait se créer', () => {
    const fixture = TestBed.createComponent(AgentDashboard);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();

    httpMock
      .expectOne('http://localhost:8080/api/stats/overview')
      .flush(envelope<StatsOverviewDto>(STATS));
  });

  it('affiche les statistiques une fois chargées', () => {
    const fixture = TestBed.createComponent(AgentDashboard);
    fixture.detectChanges();

    httpMock
      .expectOne('http://localhost:8080/api/stats/overview')
      .flush(envelope<StatsOverviewDto>(STATS));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Tableau de bord');
    expect(compiled.textContent).toContain('42');
    expect(compiled.textContent).toContain('Marseille');
  });

  it('affiche un message d’erreur si le chargement échoue', () => {
    const fixture = TestBed.createComponent(AgentDashboard);
    fixture.detectChanges();

    httpMock
      .expectOne('http://localhost:8080/api/stats/overview')
      .flush(null, { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Impossible de charger');
  });
});
