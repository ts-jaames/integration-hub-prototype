import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiClientService } from './api-client.service';
import { LoggerService } from './logger.service';
import { environment } from '../../../environments/environment';

describe('ApiClientService', () => {
  let service: ApiClientService;
  let httpMock: HttpTestingController;
  let logger: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    const loggerSpy = jasmine.createSpyObj('LoggerService', ['debug', 'error']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ApiClientService,
        { provide: LoggerService, useValue: loggerSpy }
      ]
    });

    service = TestBed.inject(ApiClientService);
    httpMock = TestBed.inject(HttpTestingController);
    logger = TestBed.inject(LoggerService) as jasmine.SpyObj<LoggerService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have correct baseUrl from environment', () => {
    expect(service.baseUrl).toBe(environment.apiUrl);
  });

  it('should make GET request', () => {
    const mockData = { id: '1', name: 'Test' };

    service.get<{ id: string; name: string }>('test').subscribe(data => {
      expect(data).toEqual(mockData);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/test`);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
    
    expect(logger.debug).toHaveBeenCalled();
  });

  it('should make POST request', () => {
    const mockData = { id: '1', name: 'Test' };
    const postData = { name: 'Test' };

    service.post<{ id: string; name: string }>('test', postData).subscribe(data => {
      expect(data).toEqual(mockData);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/test`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(postData);
    req.flush(mockData);
    
    expect(logger.debug).toHaveBeenCalled();
  });

  it('should make PUT request', () => {
    const mockData = { id: '1', name: 'Updated' };
    const putData = { name: 'Updated' };

    service.put<{ id: string; name: string }>('test/1', putData).subscribe(data => {
      expect(data).toEqual(mockData);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/test/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(putData);
    req.flush(mockData);
  });

  it('should make PATCH request', () => {
    const mockData = { id: '1', name: 'Patched' };
    const patchData = { name: 'Patched' };

    service.patch<{ id: string; name: string }>('test/1', patchData).subscribe(data => {
      expect(data).toEqual(mockData);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/test/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(patchData);
    req.flush(mockData);
  });

  it('should make DELETE request', () => {
    service.delete('test/1').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/test/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should handle HTTP errors', () => {
    service.get('test').subscribe({
      next: () => fail('should have failed'),
      error: (error) => {
        expect(error).toBeTruthy();
        expect(logger.error).toHaveBeenCalled();
      }
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/test`);
    req.error(new ErrorEvent('Network error'), { status: 500 });
  });

  it('should build URL correctly with leading slash', () => {
    service.get('/test').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/test`);
    expect(req.request.url).toBe(`${environment.apiUrl}/test`);
    req.flush({});
  });

  it('should build URL correctly without leading slash', () => {
    service.get('test').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/test`);
    expect(req.request.url).toBe(`${environment.apiUrl}/test`);
    req.flush({});
  });
});

