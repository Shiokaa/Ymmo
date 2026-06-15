import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../api.config';
import { GlobalResponse } from '../models/global-response.model';
import { PropertyResponseDto } from '../models/property.model';
import { PropertyImageResponseDto } from '../models/property-image.model';
import { PropertyRequestDto } from '../models/property-request.model';

/**
 * Service d'accès aux biens immobiliers exposés par l'API Ymmo.
 */
@Injectable({
  providedIn: 'root',
})
export class PropertyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/properties`;

  /**
   * Récupère la liste des biens immobiliers.
   */
  getAllProperties(): Observable<PropertyResponseDto[]> {
    return this.http
      .get<GlobalResponse<PropertyResponseDto[]>>(this.baseUrl)
      .pipe(map((response) => response.data));
  }

  /**
   * Récupère le détail d'un bien immobilier par son identifiant.
   */
  getPropertyById(id: string): Observable<PropertyResponseDto> {
    return this.http
      .get<GlobalResponse<PropertyResponseDto>>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  /** Crée un bien (AGENT/ADMIN). */
  createProperty(dto: PropertyRequestDto): Observable<PropertyResponseDto> {
    return this.http
      .post<GlobalResponse<PropertyResponseDto>>(this.baseUrl, dto)
      .pipe(map((response) => response.data));
  }

  /** Met à jour un bien (AGENT/ADMIN). */
  updateProperty(id: string, dto: PropertyRequestDto): Observable<PropertyResponseDto> {
    return this.http
      .put<GlobalResponse<PropertyResponseDto>>(`${this.baseUrl}/${id}`, dto)
      .pipe(map((response) => response.data));
  }

  /** Supprime un bien (AGENT/ADMIN). */
  deleteProperty(id: string): Observable<void> {
    return this.http.delete<GlobalResponse<null>>(`${this.baseUrl}/${id}`).pipe(map(() => void 0));
  }

  /** Ajoute une image à un bien (upload multipart, AGENT/ADMIN). */
  uploadImage(
    propertyId: string,
    file: File,
    description: string,
    isCover: boolean,
  ): Observable<PropertyImageResponseDto> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', description);
    formData.append('isCover', String(isCover));
    return this.http
      .post<
        GlobalResponse<PropertyImageResponseDto>
      >(`${this.baseUrl}/${propertyId}/images`, formData)
      .pipe(map((response) => response.data));
  }

  /** Supprime une image d'un bien (AGENT/ADMIN). */
  deleteImage(propertyId: string, imageId: string): Observable<void> {
    return this.http
      .delete<GlobalResponse<null>>(`${this.baseUrl}/${propertyId}/images/${imageId}`)
      .pipe(map(() => void 0));
  }
}
