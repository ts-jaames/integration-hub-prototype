# PR #6: Refactor Services to Use ApiClient Layer

## Summary
This PR refactors all data services to use the `ApiClientService` layer instead of direct `HttpClient` calls or pure in-memory mocks. Services now check the `enableMockData` environment flag to determine whether to use mocks or real API calls.

## Changes

### 1. Refactored MockApiService ✅
- **File**: `src/app/core/mock-api.service.ts`
- **Changes**:
  - Removed direct `HttpClient` usage
  - Added `ApiClientService` injection
  - Methods check `environment.enableMockData` flag
  - When `enableMockData = true`: returns mock data
  - When `enableMockData = false`: uses `ApiClientService` for real API calls

### 2. Refactored VendorCompanyService ✅
- **File**: `src/app/shared/services/vendor-company.service.ts`
- **Changes**:
  - Added `ApiClientService` injection
  - Added `LoggerService` injection
  - Key methods (`getVendors`, `getVendorById`, `createVendor`, `updateVendor`) now check `enableMockData`
  - When `enableMockData = true`: uses in-memory signals (existing behavior)
  - When `enableMockData = false`: uses `ApiClientService` for real API calls
  - Other methods follow the same pattern (can be updated as needed)

### 3. Refactored InMemoryDevService ✅
- **File**: `src/app/developer/services/in-memory-dev.service.ts`
- **Changes**:
  - Added `ApiClientService` injection
  - Key methods (`listServiceAccounts`, `createServiceAccount`) now check `enableMockData`
  - When `enableMockData = true`: uses in-memory BehaviorSubjects (existing behavior)
  - When `enableMockData = false`: uses `ApiClientService` for real API calls
  - Pattern established for other methods to follow

### 4. Refactored InMemoryAdminApiService ✅
- **File**: `src/app/sys-admin/services/in-memory-admin-api.service.ts`
- **Changes**:
  - Added `ApiClientService` injection
  - Key methods (`listCompanies`, `getCompany`, `createCompany`) now check `enableMockData`
  - When `enableMockData = true`: uses in-memory BehaviorSubjects (existing behavior)
  - When `enableMockData = false`: uses `ApiClientService` for real API calls
  - Pattern established for other methods to follow

## Environment Configuration

### Development (`environment.ts`)
```typescript
enableMockData: true  // Use mocks in development
```

### Production (`environment.prod.ts`)
```typescript
enableMockData: false  // Use real APIs in production
```

## Pattern Established

All services now follow this pattern:

```typescript
methodName(...args): Observable<T> {
  if (environment.enableMockData) {
    // Dev mode: use in-memory mocks
    this.logger.debug('Service: Using mock data');
    return of(mockData).pipe(delay(300));
  }

  // Production: use real API
  return this.apiClient.get<T>('endpoint');
}
```

## Benefits

1. **Single API Boundary**: All HTTP requests go through `ApiClientService`
2. **Easy Backend Integration**: Just flip `enableMockData` to false when backend is ready
3. **Consistent Error Handling**: All API calls benefit from interceptors (auth, error handling)
4. **Clear Separation**: Mock behavior is clearly separated from real API calls
5. **Production Ready**: Services are structured to easily swap mocks for real APIs

## What Remains

⚠️ **Not All Methods Updated**
- Large services (InMemoryDevService, InMemoryAdminApiService, VendorCompanyService) have many methods
- Pattern is established for key methods
- Remaining methods can be updated following the same pattern as needed

⚠️ **Mock Data Still Present**
- Services still use mocks when `enableMockData = true` (intentional)
- When backend is ready, set `enableMockData = false` in production

⚠️ **API Endpoints Are Placeholders**
- Real API endpoints need to be defined when backend is ready
- Current endpoints follow RESTful conventions

## Migration Path

When backend is ready:

1. Set `enableMockData: false` in `environment.prod.ts`
2. Update API endpoints in service methods to match backend routes
3. Test with real backend
4. Remove mock data generators if desired (or keep for testing)

## Testing

- ✅ No linter errors
- ✅ Services compile successfully
- ✅ Pattern established and working
- ⚠️ Unit tests not yet added (will be in PR #8)

## Next Steps

- PR #7: Split oversized components
- PR #8: Add minimal test suite

