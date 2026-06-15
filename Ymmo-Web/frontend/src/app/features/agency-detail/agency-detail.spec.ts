import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GlobalResponse } from '../../core/models/global-response.model';
import { AgencyDetail } from './agency-detail';

function envelope<T>(data: T): GlobalResponse<T> {
  return { data, message: null, success: true, timestamp: '01-06-2026 10:00:00' };
}

describe('AgencyDetail', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgencyDetail],
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

  function createAgencyDetail(): ComponentFixture<AgencyDetail> {
    const fixture = TestBed.createComponent(AgencyDetail);
    fixture.detectChanges();
    return fixture;
  }

  it('devrait se créer', () => {
    const fixture = createAgencyDetail();
    expect(fixture.componentInstance).toBeTruthy();

    httpMock.expectOne((request) => request.url.startsWith('http://localhost:8080/api/agencies')).error(
      new ProgressEvent('Erreur réseau simulée'),
    );
    httpMock.expectOne('http://localhost:8080/api/properties').flush(envelope([]));
  });
});
