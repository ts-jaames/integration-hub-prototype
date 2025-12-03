import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';

export interface VendorCompanyFormData {
  companyName: string;
  legalName?: string;
  vendorType: string;
  externalVendorId?: string;
  isActive: boolean;
  integrationModes: string[];
  targetSystems: string[];
  environments: string[];
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactRole?: string;
  technicalContactName?: string;
  technicalContactEmail?: string;
  technicalContactRole?: string;
  billingContactName?: string;
  billingContactEmail?: string;
  timeZone: string;
  supportTier?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VendorCompanyService {
  /**
   * Mock service for saving vendor companies.
   * In a real app, this would make an HTTP POST request.
   */
  saveVendorCompany(data: VendorCompanyFormData): Observable<VendorCompanyFormData & { id: string; createdAt: string }> {
    // Simulate API call with delay
    const result = {
      ...data,
      id: `vendor_${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    return of(result).pipe(
      delay(500) // Simulate network delay
    );
  }
}

