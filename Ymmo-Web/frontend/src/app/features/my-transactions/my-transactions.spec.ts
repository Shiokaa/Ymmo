import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GlobalResponse } from '../../core/models/global-response.model';
import { MyTransactions } from './my-transactions';

function envelope<T>(data: T): GlobalResponse<T> {
  return { data, message: null, success: true, timestamp: '01-06-2026 10:00:00' };
}

describe('MyTransactions', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyTransactions],
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

  function createMyTransactions(): ComponentFixture<MyTransactions> {
    const fixture = TestBed.createComponent(MyTransactions);
    fixture.detectChanges();
    return fixture;
  }

  it('devrait se créer', () => {
    const fixture = createMyTransactions();

    expect(fixture.componentInstance).toBeTruthy();

    httpMock.expectOne('http://localhost:8080/api/transactions/me').flush(envelope([]));
  });
});
