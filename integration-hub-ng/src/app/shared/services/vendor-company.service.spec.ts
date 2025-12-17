import { TestBed } from '@angular/core/testing';
import { VendorCompanyService } from './vendor-company.service';
import { ApiClientService } from '../../core/services/api-client.service';
import { LoggerService } from '../../core/services/logger.service';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';

describe('VendorCompanyService', () => {
  let service: VendorCompanyService;
  let apiClient: jasmine.SpyObj<ApiClientService>;
  let logger: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    const apiClientSpy = jasmine.createSpyObj('ApiClientService', ['get', 'post', 'patch']);
    const loggerSpy = jasmine.createSpyObj('LoggerService', ['debug', 'info', 'error']);

    TestBed.configureTestingModule({
      providers: [
        VendorCompanyService,
        { provide: ApiClientService, useValue: apiClientSpy },
        { provide: LoggerService, useValue: loggerSpy }
      ]
    });

    service = TestBed.inject(VendorCompanyService);
    apiClient = TestBed.inject(ApiClientService) as jasmine.SpyObj<ApiClientService>;
    logger = TestBed.inject(LoggerService) as jasmine.SpyObj<LoggerService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('when enableMockData is true', () => {
    beforeEach(() => {
      // Ensure we're in mock mode
      Object.assign(environment, { enableMockData: true });
    });

    it('should get vendors from in-memory store', (done) => {
      service.getVendors().subscribe(vendors => {
        expect(Array.isArray(vendors)).toBe(true);
        done();
      });
    });

    it('should create a vendor', (done) => {
      const formData = {
        companyName: 'Test Company',
        primaryContactName: 'John Doe',
        primaryContactEmail: 'john@test.com',
        vendorType: 'vendor',
        isActive: true,
        integrationModes: [],
        targetSystems: [],
        environments: [],
        timeZone: 'UTC'
      };

      service.createVendor(formData).subscribe(vendor => {
        expect(vendor).toBeTruthy();
        expect(vendor.name).toBe('Test Company');
        expect(vendor.status).toBe('Pending');
        done();
      });
    });
  });

  describe('when enableMockData is false', () => {
    beforeEach(() => {
      Object.assign(environment, { enableMockData: false });
    });

    it('should use ApiClientService to get vendors', () => {
      const mockVendors = [{ id: '1', name: 'Test Vendor' }];
      apiClient.get.and.returnValue(of(mockVendors));

      service.getVendors().subscribe();

      expect(apiClient.get).toHaveBeenCalledWith('vendors');
    });

    it('should use ApiClientService to create vendor', () => {
      const mockVendor = { id: '1', name: 'Test Vendor' };
      const formData = {
        companyName: 'Test Company',
        primaryContactName: 'John Doe',
        primaryContactEmail: 'john@test.com',
        vendorType: 'vendor',
        isActive: true,
        integrationModes: [],
        targetSystems: [],
        environments: [],
        timeZone: 'UTC'
      };
      apiClient.post.and.returnValue(of(mockVendor));

      service.createVendor(formData).subscribe();

      expect(apiClient.post).toHaveBeenCalledWith('vendors', formData);
    });
  });
});

