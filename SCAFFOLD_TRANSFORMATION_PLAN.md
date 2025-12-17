# Scaffold Transformation Plan

## Overview
Transform prototype into clean development scaffold ready for backend integration, without disrupting existing flows or design.

## PR Sequence

### PR #1: Foundational Infrastructure
**Goal**: Create core infrastructure services and configuration

**Changes**:
- Create `LoggerService` (replaces console.log/error)
- Create `GlobalErrorHandler` 
- Create `ApiClient` service (HttpClient wrapper)
- Add `environment.ts` and `environment.prod.ts`
- Update `app.config.ts` to provide HttpClient and error handler

**Files Changed**:
- `src/app/core/services/logger.service.ts` (new)
- `src/app/core/services/global-error-handler.ts` (new)
- `src/app/core/services/api-client.service.ts` (new)
- `src/environments/environment.ts` (new)
- `src/environments/environment.prod.ts` (new)
- `src/app/app.config.ts` (update)

**What Improves**:
- Centralized logging infrastructure
- Global error handling
- API client abstraction layer
- Environment-based configuration

**What Remains**:
- Services still use mocks (will be refactored in PR #6)
- Console.log still present (will be replaced in PR #4)

---

### PR #2: HTTP Interceptors
**Goal**: Add HTTP interceptors for auth and error handling

**Changes**:
- Create `AuthInterceptor` (stub for token injection)
- Create `ErrorInterceptor` (normalizes HTTP errors)
- Register interceptors in `app.config.ts`

**Files Changed**:
- `src/app/core/interceptors/auth.interceptor.ts` (new)
- `src/app/core/interceptors/error.interceptor.ts` (new)
- `src/app/app.config.ts` (update)

**What Improves**:
- Centralized HTTP error handling
- Auth token injection infrastructure (ready for real auth)
- Consistent error responses

**What Remains**:
- Auth token is stubbed (will be real in future)
- Services not yet using ApiClient

---

### PR #3: Routing Standardization
**Goal**: Remove duplicate routes, standardize on standalone approach

**Changes**:
- Consolidate all routes into `app.routes.ts`
- Remove routes from `app.module.ts`
- Ensure all route components are standalone
- Update `app.config.ts` to use consolidated routes

**Files Changed**:
- `src/app/app.routes.ts` (update - consolidate all routes)
- `src/app/app.module.ts` (update - remove routes array)
- `src/app/app.config.ts` (verify routes)

**What Improves**:
- Single source of truth for routes
- No duplicate route definitions
- Clearer routing structure

**What Remains**:
- Some components may still be module-based (will migrate gradually)

---

### PR #4: Replace Console Logging
**Goal**: Replace all console.log/error with LoggerService

**Changes**:
- Replace all `console.log` with `LoggerService.info()`
- Replace all `console.error` with `LoggerService.error()`
- Replace all `console.warn` with `LoggerService.warn()`
- Update imports across all files

**Files Changed**:
- All files with console.log/error/warn (98+ instances)
- Update imports in affected files

**What Improves**:
- Consistent logging throughout app
- Logging can be controlled/enhanced centrally
- Better debugging capabilities

**What Remains**:
- LoggerService implementation is basic (can be enhanced later)

---

### PR #5: Isolate Dev Auth & Remove Critical localStorage
**Goal**: Move dev-only auth behind feature flag, remove localStorage for critical data

**Changes**:
- Create `DevAuthProvider` service behind feature flag
- Move hardcoded users to dev-only provider
- Remove localStorage usage for auth/roles (keep only UI prefs)
- Add feature flag configuration in environment

**Files Changed**:
- `src/app/core/services/dev-auth-provider.service.ts` (new)
- `src/app/core/role.service.ts` (refactor)
- `src/app/sys-admin/services/auth-state.service.ts` (refactor)
- `src/app/developer/services/auth-state.service.ts` (refactor)
- `src/environments/environment.ts` (add feature flags)
- Remove localStorage usage from critical services

**What Improves**:
- Clear separation of dev vs production auth
- No localStorage for security-critical data
- Feature flag controls dev-only features

**What Remains**:
- Real auth not implemented (intentional - for future)
- Some UI preferences may still use localStorage (acceptable)

---

### PR #6: Refactor Services to Use ApiClient
**Goal**: Replace direct mock calls with ApiClient layer

**Changes**:
- Refactor `MockApiService` to use ApiClient
- Refactor `InMemoryDevService` to use ApiClient (with mock adapter)
- Refactor `InMemoryAdminApiService` to use ApiClient (with mock adapter)
- Refactor `VendorCompanyService` to use ApiClient
- Create mock adapters that can be swapped for real APIs later

**Files Changed**:
- `src/app/core/services/mock-api.service.ts` (refactor)
- `src/app/developer/services/in-memory-dev.service.ts` (refactor)
- `src/app/sys-admin/services/in-memory-admin-api.service.ts` (refactor)
- `src/app/shared/services/vendor-company.service.ts` (refactor)
- `src/app/core/services/api-client.service.ts` (enhance with mock adapter support)

**What Improves**:
- All services go through ApiClient layer
- Easy to swap mocks for real APIs
- Consistent API interface

**What Remains**:
- Still using mocks (but now through proper abstraction)
- Real API endpoints not implemented (intentional)

---

### PR #7: Split Oversized Components
**Goal**: Break down components >700 lines into smaller, focused components

**Status**: ⏸️ **Deferred** - Pattern documented for Angular developers to handle

**Analysis Completed**:
- Identified oversized components:
  - `company-details.component.ts` (2122 lines)
  - `service-accounts.page.ts` (2072 lines)
  - `api-editor.page.ts` (699 lines)
- Created extraction plan in `PR_07_COMPONENT_SPLITTING_PLAN.md`
- Established pattern for component extraction

**Files Created**:
- `PR_07_COMPONENT_SPLITTING_PLAN.md` - Detailed extraction plan
- `PR_07_COMPONENT_SPLITTING_SUMMARY.md` - Summary and approach

**What Remains**:
- Component splitting to be handled by Angular developers taking over
- Pattern is documented and ready for implementation

---

### PR #8: Minimal Test Suite
**Goal**: Add basic test coverage for critical paths

**Status**: ✅ **Completed**

**Changes**:
- ✅ Test: App bootstraps successfully (`app.spec.ts`)
- ✅ Test: Navigation to key routes works (`navigation.spec.ts`)
- ✅ Test: One core flow (vendor creation) works (`vendor-company.service.spec.ts`)
- ✅ Test: LoggerService works (`logger.service.spec.ts`)
- ✅ Test: ApiClientService works (`api-client.service.spec.ts`)

**Files Changed**:
- `src/app/app.spec.ts` (enhanced)
- `src/app/core/services/logger.service.spec.ts` (new)
- `src/app/core/services/api-client.service.spec.ts` (new)
- `src/app/core/navigation.spec.ts` (new)
- `src/app/shared/services/vendor-company.service.spec.ts` (new)

**What Improves**:
- ✅ Basic test coverage for critical paths
- ✅ Confidence in application boot
- ✅ Foundation for future tests
- ✅ Test patterns established

**What Remains**:
- ⚠️ Not comprehensive coverage (intentional - minimal "spine")
- ⚠️ More tests can be added incrementally by Angular developers

---

## Summary

**Total PRs**: 8
**Estimated Timeline**: 2-3 weeks (1 PR every 2-3 days)

**Key Principles**:
- Incremental changes
- No breaking changes to UI/UX
- Easy to review
- Ready for backend integration
- Maintains prototype functionality

