import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';

describe('App', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
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

  it('devrait créer la coquille applicative', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();

    httpMock
      .expectOne('http://localhost:8080/api/auth/me')
      .flush(
        { success: false, message: 'UNAUTHORIZED', data: null, timestamp: '' },
        { status: 401, statusText: 'Unauthorized' },
      );
  });

  it('devrait contenir le router-outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();

    httpMock
      .expectOne('http://localhost:8080/api/auth/me')
      .flush(
        { success: false, message: 'UNAUTHORIZED', data: null, timestamp: '' },
        { status: 401, statusText: 'Unauthorized' },
      );
  });
});
