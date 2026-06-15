import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GlobalResponse } from '../../core/models/global-response.model';
import { PropertyResponseDto } from '../../core/models/property.model';
import { PropertyType } from '../../core/models/property-type.enum';
import { Search } from './search';

/** Vue partielle de `Search` exposant le filtre de ville (protégé) pour les tests. */
interface SearchWithFilters {
  searchCity: Search['searchCity'];
}

/** Construit un bien minimal pour les scénarios de la page de recherche. */
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

describe('Search', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Search],
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

  function createSearch(): ComponentFixture<Search> {
    const fixture = TestBed.createComponent(Search);
    fixture.detectChanges();
    return fixture;
  }

  function flushProperties(properties: PropertyResponseDto[]): void {
    httpMock.expectOne('http://localhost:8080/api/properties').flush(envelope(properties));
  }

  it('devrait afficher les skeletons pendant le chargement', () => {
    const fixture = createSearch();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('p-skeleton').length).toBeGreaterThan(0);

    flushProperties([]);
  });

  it('devrait afficher les biens disponibles', async () => {
    const fixture = createSearch();

    const biens = [
      buildProperty({ title: 'Appartement Marseille' }),
      buildProperty({ title: 'Maison indisponible', available: false }),
    ];
    flushProperties(biens);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const cards = element.querySelectorAll('app-property-card');
    expect(cards.length).toBe(1);
    expect(element.textContent).not.toContain('Maison indisponible');
  });

  it("devrait afficher le message d'absence de résultat quand la liste est vide", async () => {
    const fixture = createSearch();
    flushProperties([]);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.grid-empty')?.textContent).toContain(
      'Aucun bien ne correspond à votre recherche',
    );
  });

  it("devrait afficher un message d'erreur quand l'API est injoignable", async () => {
    const fixture = createSearch();

    httpMock
      .expectOne('http://localhost:8080/api/properties')
      .error(new ProgressEvent('Erreur réseau simulée'));
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.grid-empty')?.textContent).toContain(
      'Impossible de charger les biens',
    );
  });

  it('devrait filtrer les résultats par ville', async () => {
    const fixture = createSearch();

    const biens = [
      buildProperty({ title: 'Appartement Marseille', city: 'Marseille' }),
      buildProperty({ title: 'Maison Aix', city: 'Aix-en-Provence' }),
    ];
    flushProperties(biens);
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as SearchWithFilters;
    component.searchCity.set('aix');
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const cards = element.querySelectorAll('app-property-card');
    expect(cards.length).toBe(1);
    expect(element.textContent).toContain('Maison Aix');
    expect(element.textContent).not.toContain('Appartement Marseille');
  });
});
