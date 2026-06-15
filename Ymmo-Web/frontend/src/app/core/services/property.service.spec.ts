import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { GlobalResponse } from '../models/global-response.model';
import { PropertyResponseDto } from '../models/property.model';
import { PropertyType } from '../models/property-type.enum';
import { PropertyService } from './property.service';

describe('PropertyService', () => {
  let service: PropertyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(PropertyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("devrait extraire les biens de l'enveloppe GlobalResponse", () => {
    const properties = [
      {
        id: '7b0a9a1e-0000-0000-0000-000000000001',
        title: 'Bastide rénovée avec piscine',
        type: PropertyType.HOUSE,
        city: 'Aix-en-Provence',
        postalCode: '13100',
        price: 1245000,
        size: 220,
        roomsCount: 7,
        available: true,
        createdAt: '01-06-2026 10:00:00',
        updatedAt: '01-06-2026 10:00:00',
        propertyImages: [],
      } as unknown as PropertyResponseDto,
    ];
    const enveloppe: GlobalResponse<PropertyResponseDto[]> = {
      data: properties,
      message: null,
      success: true,
      timestamp: '01-06-2026 10:00:00',
    };

    let resultat: PropertyResponseDto[] | undefined;
    service.getAllProperties().subscribe((biens) => (resultat = biens));

    const requete = httpMock.expectOne('http://localhost:8080/api/properties');
    expect(requete.request.method).toBe('GET');
    requete.flush(enveloppe);

    expect(resultat).toEqual(properties);
  });
});
