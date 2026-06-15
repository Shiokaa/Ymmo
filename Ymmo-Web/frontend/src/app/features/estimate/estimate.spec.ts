import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Estimate } from './estimate';

/** Vue partielle de `Estimate` exposant son formulaire (protégé) pour les tests. */
interface EstimateWithForm {
  form: Estimate['form'];
  submitted: Estimate['submitted'];
}

describe('Estimate', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Estimate],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();
  });

  it('devrait se créer', () => {
    const fixture = TestBed.createComponent(Estimate);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('devrait avoir un formulaire invalide au départ', () => {
    const fixture = TestBed.createComponent(Estimate);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as EstimateWithForm;

    expect(component.form.invalid).toBe(true);
    expect(component.submitted()).toBe(false);
  });
});
