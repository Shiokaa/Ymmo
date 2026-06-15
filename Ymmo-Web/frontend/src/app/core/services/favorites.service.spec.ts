import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { FavoritesService } from './favorites.service';

const FAVORITES_STORAGE_KEY = 'ymmo_favorites';

describe('FavoritesService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  function createService(): FavoritesService {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    return TestBed.inject(FavoritesService);
  }

  it('devrait démarrer sans favoris quand le localStorage est vide', () => {
    const service = createService();

    expect(service.favoriteIds()).toEqual([]);
    expect(service.count()).toBe(0);
    expect(service.has('bien-1')).toBe(false);
  });

  it('devrait restaurer les favoris persistés au démarrage', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(['bien-1', 'bien-2']));

    const service = createService();

    expect(service.favoriteIds()).toEqual(['bien-1', 'bien-2']);
    expect(service.has('bien-1')).toBe(true);
    expect(service.count()).toBe(2);
  });

  it('devrait ignorer un contenu illisible et démarrer sans favoris', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, '{invalide');

    const service = createService();

    expect(service.favoriteIds()).toEqual([]);
  });

  it('devrait ajouter un bien aux favoris et persister le résultat', () => {
    const service = createService();

    service.toggle('bien-1');

    expect(service.has('bien-1')).toBe(true);
    expect(service.favoriteIds()).toEqual(['bien-1']);
    expect(JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY)!)).toEqual(['bien-1']);
  });

  it('devrait retirer un bien des favoris et persister le résultat', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(['bien-1', 'bien-2']));
    const service = createService();

    service.toggle('bien-1');

    expect(service.has('bien-1')).toBe(false);
    expect(service.favoriteIds()).toEqual(['bien-2']);
    expect(JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY)!)).toEqual(['bien-2']);
  });
});
