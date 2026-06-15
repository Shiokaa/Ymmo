import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Contact } from './contact';

describe('Contact', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Contact],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();
  });

  it('devrait se créer', () => {
    const fixture = TestBed.createComponent(Contact);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
