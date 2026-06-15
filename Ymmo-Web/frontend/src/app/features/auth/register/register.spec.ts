import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Register } from './register';

/** Vue partielle de `Register` exposant son formulaire (protégé) pour les tests. */
interface RegisterWithForm {
  form: Register['form'];
}

describe('Register', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('devrait se créer', () => {
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('devrait être invalide et signaler passwordMismatch si les mots de passe diffèrent', () => {
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();

    const form = (fixture.componentInstance as unknown as RegisterWithForm).form;

    form.setValue({
      firstName: 'Jeanne',
      lastName: 'Dupont',
      email: 'jeanne.dupont@ymmo.fr',
      password: 'motdepasse',
      confirmPassword: 'autremotdepasse',
      phone: '0612345678',
    });

    expect(form.invalid).toBe(true);
    expect(form.errors?.['passwordMismatch']).toBe(true);
  });
});
