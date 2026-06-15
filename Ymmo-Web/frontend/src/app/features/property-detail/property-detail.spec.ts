import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AgencyStatus } from '../../core/models/agency-status.enum';
import { GlobalResponse } from '../../core/models/global-response.model';
import { PropertyResponseDto } from '../../core/models/property.model';
import { PropertyType } from '../../core/models/property-type.enum';
import { PropertyDetail } from './property-detail';

function envelope<T>(data: T): GlobalResponse<T> {
  return { data, message: null, success: true, timestamp: '01-06-2026 10:00:00' };
}

describe('PropertyDetail', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PropertyDetail],
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

  function createComponent(): ComponentFixture<PropertyDetail> {
    const fixture = TestBed.createComponent(PropertyDetail);
    fixture.detectChanges();
    return fixture;
  }

  it('devrait se créer et afficher le détail du bien', async () => {
    const fixture = createComponent();

    const property: PropertyResponseDto = {
      id: crypto.randomUUID(),
      title: 'Maison de village',
      description: 'Une belle maison.',
      type: PropertyType.HOUSE,
      address: '12 rue des Oliviers',
      city: 'Aix-en-Provence',
      postalCode: '13100',
      price: 495000,
      size: 120,
      roomsCount: 5,
      available: true,
      createdAt: '01-06-2026 10:00:00',
      updatedAt: '01-06-2026 10:00:00',
      propertyImages: [],
      agency: {
        id: crypto.randomUUID(),
        name: 'Agence du Centre',
        description: '',
        email: 'contact@agence.fr',
        address: '1 place de la Mairie',
        city: 'Aix-en-Provence',
        postalCode: '13100',
        phone: '0442000000',
        status: AgencyStatus.OPEN,
        createdAt: '01-06-2026 10:00:00',
        updatedAt: '01-06-2026 10:00:00',
      },
    };

    // Sans navigation effective, l'id de l'URL est vide.
    httpMock.expectOne('http://localhost:8080/api/properties/').flush(envelope(property));
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Maison de village');
  });

  it("devrait afficher un message d'erreur quand le bien est introuvable", async () => {
    const fixture = createComponent();

    httpMock
      .expectOne('http://localhost:8080/api/properties/')
      .error(new ProgressEvent('Erreur réseau simulée'));
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.grid-empty')?.textContent).toContain('Bien introuvable');
  });
});
