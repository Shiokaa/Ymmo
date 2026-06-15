import { Injectable, computed, signal } from '@angular/core';

/** Clé localStorage de la liste des biens favoris (tableau d'identifiants). */
const FAVORITES_STORAGE_KEY = 'ymmo_favorites';

/**
 * Service de gestion des biens favoris, persistés côté client (localStorage).
 */
@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  /** Identifiants des biens favoris. */
  private readonly ids = signal<string[]>(this.readStored());

  /** Identifiants des biens favoris, en lecture seule. */
  readonly favoriteIds = this.ids.asReadonly();

  /** Nombre de biens favoris. */
  readonly count = computed(() => this.ids().length);

  /** Indique si le bien donné fait partie des favoris. */
  has(id: string): boolean {
    return this.ids().includes(id);
  }

  /** Ajoute ou retire le bien des favoris et persiste le résultat. */
  toggle(id: string): void {
    const current = this.ids();
    const next = current.includes(id)
      ? current.filter((favoriteId) => favoriteId !== id)
      : [...current, id];

    this.ids.set(next);
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
  }

  /** Lit la liste des favoris en localStorage (tableau vide si absent ou illisible). */
  private readStored(): string[] {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const stored = JSON.parse(raw);
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  }
}
