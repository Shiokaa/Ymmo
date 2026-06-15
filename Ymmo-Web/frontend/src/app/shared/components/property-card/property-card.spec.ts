import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FavoritesService } from '../../../core/services/favorites.service';
import { PropertyResponseDto } from '../../../core/models/property.model';
import { PropertyType } from '../../../core/models/property-type.enum';
import { PropertyCard } from './property-card';

/** Construit un bien de test avec valeurs par défaut surchargeables. */
function buildProperty(overrides: Partial<PropertyResponseDto> = {}): PropertyResponseDto {
  return {
    id: '7b0a9a1e-0000-0000-0000-000000000001',
    title: 'Bastide rénovée avec piscine',
    description: '',
    type: PropertyType.HOUSE,
    address: '1 rue Espariat',
    city: 'Aix-en-Provence',
    postalCode: '13100',
    price: 1245000,
    size: 220,
    roomsCount: 7,
    available: true,
    createdAt: '01-06-2026 10:00:00',
    updatedAt: '01-06-2026 10:00:00',
    propertyImages: [],
    agency: null as unknown as PropertyResponseDto['agency'],
    ...overrides,
  };
}

describe('PropertyCard', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PropertyCard],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
  });

  function createCard(property: PropertyResponseDto) {
    const fixture = TestBed.createComponent(PropertyCard);
    fixture.componentRef.setInput('property', property);
    fixture.detectChanges();
    return fixture;
  }

  it('devrait afficher titre, ville, prix formaté et type en français', () => {
    const fixture = createCard(buildProperty());
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.card-title')?.textContent).toContain(
      'Bastide rénovée avec piscine',
    );
    expect(element.querySelector('.card-city')?.textContent).toContain('Aix-en-Provence');
    // Espaces insécables produits par Intl.NumberFormat : on compare sans espaces
    const prix = element.querySelector('.card-price')?.textContent?.replace(/\s/g, '');
    expect(prix).toBe('1245000€');
    expect(element.querySelector('.card-badge')?.textContent).toContain('Maison');
  });

  it("devrait afficher le placeholder quand le bien n'a pas d'image", () => {
    const fixture = createCard(buildProperty({ propertyImages: [] }));
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.card-image img')).toBeNull();
    expect(element.querySelector('.card-image .ph')).not.toBeNull();
  });

  it("devrait afficher l'image de couverture quand elle existe", () => {
    const fixture = createCard(
      buildProperty({
        propertyImages: [
          { id: 'i1', imageUrl: '/img/autre.jpg', description: '', isCover: false },
          { id: 'i2', imageUrl: '/img/couverture.jpg', description: '', isCover: true },
        ],
      }),
    );
    const image = (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>(
      '.card-image img',
    );

    expect(image).not.toBeNull();
    expect(image?.getAttribute('src')).toBe('/img/couverture.jpg');
  });

  it('devrait masquer la ligne « pièces » quand roomsCount vaut 0', () => {
    const fixture = createCard(buildProperty({ type: PropertyType.LAND, roomsCount: 0 }));
    const meta = (fixture.nativeElement as HTMLElement).querySelector('.card-meta');

    expect(meta?.textContent).not.toContain('pièces');
    expect(meta?.textContent).toContain('m²');
  });

  it('devrait ajouter le bien aux favoris au clic sur le cœur', () => {
    const fixture = createCard(buildProperty());
    const element = fixture.nativeElement as HTMLElement;
    const favorites = TestBed.inject(FavoritesService);

    const bouton = element.querySelector<HTMLButtonElement>('.card-fav');
    bouton?.click();
    fixture.detectChanges();

    expect(favorites.has('7b0a9a1e-0000-0000-0000-000000000001')).toBe(true);
    expect(bouton?.classList.contains('active')).toBe(true);
  });
});
