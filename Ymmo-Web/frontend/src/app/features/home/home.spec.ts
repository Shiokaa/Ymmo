import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GlobalResponse } from '../../core/models/global-response.model';
import { PropertyResponseDto } from '../../core/models/property.model';
import { PropertyType } from '../../core/models/property-type.enum';
import { Home } from './home';

/** Construit un bien minimal pour les scénarios de la page d'accueil. */
function buildProperty(overrides: Partial<PropertyResponseDto> = {}): PropertyResponseDto {
  return {
    id: crypto.randomUUID(),
    title: 'Bien de test',
    description: '',
    type: PropertyType.APARTMENT,
    address: '',
    city: 'Marseille',
    postalCode: '13007',
    price: 495000,
    size: 78,
    roomsCount: 3,
    available: true,
    createdAt: '01-06-2026 10:00:00',
    updatedAt: '01-06-2026 10:00:00',
    propertyImages: [],
    agency: null as unknown as PropertyResponseDto['agency'],
    ...overrides,
  };
}

function envelope<T>(data: T): GlobalResponse<T> {
  return { data, message: null, success: true, timestamp: '01-06-2026 10:00:00' };
}

describe('Home', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
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

  function createHome(): ComponentFixture<Home> {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    return fixture;
  }

  /** Répond aux deux requêtes émises au chargement de la page. */
  function flushInitialRequests(properties: PropertyResponseDto[]): void {
    httpMock.expectOne('http://localhost:8080/api/properties').flush(envelope(properties));
    httpMock.expectOne('http://localhost:8080/api/agencies').flush(envelope([]));
  }

  it('devrait afficher les skeletons pendant le chargement', () => {
    const fixture = createHome();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('p-skeleton').length).toBeGreaterThan(0);

    flushInitialRequests([]);
  });

  it('devrait afficher les biens disponibles, du plus récent au plus ancien, 8 max', async () => {
    const fixture = createHome();

    const biens = [
      buildProperty({ title: 'Ancien', createdAt: '01-01-2026 10:00:00' }),
      buildProperty({ title: 'Indisponible', available: false }),
      buildProperty({ title: 'Récent', createdAt: '10-06-2026 10:00:00' }),
      // 8 biens supplémentaires pour vérifier la limite d'affichage
      ...Array.from({ length: 8 }, (_, i) =>
        buildProperty({ title: `Bien ${i}`, createdAt: '05-06-2026 10:00:00' }),
      ),
    ];
    flushInitialRequests(biens);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const cards = element.querySelectorAll('app-property-card');
    expect(cards.length).toBe(8);
    // Le plus récent en premier, l'indisponible absent
    expect(cards[0].textContent).toContain('Récent');
    expect(element.textContent).not.toContain('Indisponible');
  });

  it("devrait afficher le message d'absence de biens quand la liste est vide", async () => {
    const fixture = createHome();
    flushInitialRequests([]);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.grid-empty')?.textContent).toContain(
      'Aucun bien disponible pour le moment',
    );
  });

  it("devrait afficher un message d'erreur quand l'API est injoignable", async () => {
    const fixture = createHome();

    httpMock
      .expectOne('http://localhost:8080/api/properties')
      .error(new ProgressEvent('Erreur réseau simulée'));
    httpMock.expectOne('http://localhost:8080/api/agencies').flush(envelope([]));
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.grid-empty')?.textContent).toContain(
      'Impossible de charger les biens',
    );
  });
});
