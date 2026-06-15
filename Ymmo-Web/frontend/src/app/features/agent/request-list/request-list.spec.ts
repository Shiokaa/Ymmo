import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GlobalResponse } from '../../../core/models/global-response.model';
import { RequestResponseDto } from '../../../core/models/request.model';
import { AgentRequestList } from './request-list';

function envelope<T>(data: T): GlobalResponse<T> {
  return { data, message: null, success: true, timestamp: '01-06-2026 10:00:00' };
}

describe('AgentRequestList', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentRequestList],
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

  it('devrait se créer', () => {
    const fixture = TestBed.createComponent(AgentRequestList);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();

    httpMock
      .expectOne('http://localhost:8080/api/requests')
      .flush(envelope<RequestResponseDto[]>([]));
  });
});
