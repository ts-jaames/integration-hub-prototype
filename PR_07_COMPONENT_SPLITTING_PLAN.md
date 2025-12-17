# PR #7: Split Oversized Components - Plan

## Overview
Break down components exceeding 700 lines into smaller, focused components with clear responsibilities.

## Components to Split

### 1. company-details.component.ts (2122 lines)
**Current Structure:**
- Uses child components for: Compliance, Users, API Keys, Activity Log
- Has inline template code for: Profile, Onboarding, Access & Tier, Configuration, Risk & Compliance, Lifecycle

**Extraction Plan:**
- ✅ Already extracted: `VendorComplianceSectionComponent`, `VendorUsersSectionComponent`, `VendorApiKeysSectionComponent`, `VendorActivityLogSectionComponent`
- **To Extract:**
  - `CompanyDetailsProfileTabComponent` - Profile tab content
  - `CompanyDetailsOnboardingTabComponent` - Onboarding tab content  
  - `CompanyDetailsAccessTabComponent` - Access & Tier tab content
  - `CompanyDetailsConfigurationTabComponent` - Configuration tab with subtabs
  - `CompanyDetailsRiskTabComponent` - Risk & Compliance tab content
  - `CompanyDetailsLifecycleTabComponent` - Lifecycle tab content

**Strategy:**
- Extract tab content into standalone components
- Pass company data via `@Input()`
- Emit events via `@Output()` for actions
- Keep main component as orchestrator

### 2. service-accounts.page.ts (2072 lines)
**Current Structure:**
- Main table view
- Create/Edit modals
- Details drawer
- Key management modals

**Extraction Plan:**
- `ServiceAccountCreateModalComponent` - Create service account modal
- `ServiceAccountEditModalComponent` - Edit service account modal
- `ServiceAccountDetailsDrawerComponent` - Details drawer
- `ServiceAccountKeyModalComponent` - Key creation/management modal

**Strategy:**
- Extract modals/drawers into standalone components
- Use `@Input()` for data, `@Output()` for events
- Keep main page as orchestrator

### 3. api-editor.page.ts (699 lines)
**Current Structure:**
- Tabs: Overview, Backends, Routes, Policies, Docs, Deploy, Activity

**Extraction Plan:**
- `ApiEditorBackendsTabComponent` - Backends tab
- `ApiEditorRoutesTabComponent` - Routes tab
- `ApiEditorPoliciesTabComponent` - Policies tab
- Keep Overview, Docs, Deploy, Activity in main component (smaller)

**Strategy:**
- Extract larger tab components
- Pass API data via `@Input()`
- Emit events for updates

## Implementation Order

1. **Start with api-editor.page.ts** (smallest, most straightforward)
2. **Then service-accounts.page.ts** (extract modals/drawers)
3. **Finally company-details.component.ts** (most complex, multiple tabs)

## Benefits

- **Maintainability**: Smaller, focused components are easier to understand
- **Reusability**: Extracted components can be reused
- **Testability**: Smaller components are easier to test
- **Performance**: Smaller components can be optimized independently

## Notes

- Keep existing functionality intact
- Use standalone components for new extractions
- Maintain clear input/output contracts
- Update imports as needed

