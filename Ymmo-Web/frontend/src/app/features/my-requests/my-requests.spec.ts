import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GlobalResponse } from '../../core/models/global-response.model';
import { MyRequests } from './my-requests';

function envelope<T>(data: T): GlobalResponse<T> {
  return { data, message: null, success: true, timestamp: '01-06-2026 10:00:00' };
}

describe('MyRequests', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyRequests],
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

  function createMyRequests(): ComponentFixture<MyRequests> {
    const fixture = TestBed.createComponent(MyRequests);
    fixture.detectChanges();
    return fixture;
  }

  it('devrait se créer', () => {
    const fixture = createMyRequests();

    expect(fixture.componentInstance).toBeTruthy();

    httpMock.expectOne('http://localhost:8080/api/requests/me').flush(envelope([]));
  });
});
