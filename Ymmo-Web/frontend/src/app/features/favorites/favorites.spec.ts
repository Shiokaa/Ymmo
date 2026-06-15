import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FavoritesService } from '../../core/services/favorites.service';
import { GlobalResponse } from '../../core/models/global-response.model';
import { PropertyResponseDto } from '../../core/models/property.model';
import { PropertyType } from '../../core/models/property-type.enum';
import { Favorites } from './favorites';

/** Construit un bien minimal pour les scénarios de la page favoris. */
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

describe('Favorites', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Favorites],
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
    localStorage.clear();
  });

  function createFavorites(): ComponentFixture<Favorites> {
    const fixture = TestBed.createComponent(Favorites);
    fixture.detectChanges();
    return fixture;
  }

  it('devrait se créer', () => {
    const fixture = createFavorites();

    expect(fixture.componentInstance).toBeTruthy();

    httpMock.expectOne('http://localhost:8080/api/properties').flush(envelope([]));
  });

  it("devrait afficher le message d'absence de favoris quand aucun bien n'est sauvegardé", async () => {
    const fixture = createFavorites();

    httpMock
      .expectOne('http://localhost:8080/api/properties')
      .flush(envelope([buildProperty()]));
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.grid-empty')?.textContent).toContain(
      "Vous n'avez pas encore de favoris",
    );
  });

  it('devrait afficher uniquement les biens présents dans les favoris', async () => {
    const favoris = buildProperty({ title: 'Bien favori' });
    const autre = buildProperty({ title: 'Bien non favori' });

    const favorites = TestBed.inject(FavoritesService);
    favorites.toggle(favoris.id);

    const fixture = createFavorites();

    httpMock.expectOne('http://localhost:8080/api/properties').flush(envelope([favoris, autre]));
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const cards = element.querySelectorAll('app-property-card');
    expect(cards.length).toBe(1);
    expect(element.textContent).toContain('Bien favori');
    expect(element.textContent).not.toContain('Bien non favori');
  });

  it("devrait afficher un message d'erreur quand l'API est injoignable", async () => {
    const fixture = createFavorites();

    httpMock
      .expectOne('http://localhost:8080/api/properties')
      .error(new ProgressEvent('Erreur réseau simulée'));
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.grid-empty')?.textContent).toContain(
      'Impossible de charger vos favoris',
    );
  });
});
