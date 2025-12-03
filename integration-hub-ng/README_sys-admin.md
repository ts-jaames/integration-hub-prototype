# System Administration Feature Module

## Overview

The `sys-admin` feature module provides a complete front-end-only system administration interface for managing companies, users, registrations, and audit logs. Built with Angular 18, TypeScript, and Carbon Components Angular.

## Architecture

### Structure

```
src/app/sys-admin/
├── models/              # TypeScript interfaces and types
├── services/            # Data services (InMemoryAdminApi, AuthState)
├── guards/             # Route guards (roleGuard)
├── shared/             # Shared components, pipes, utilities
│   ├── components/
│   └── pipes/
└── pages/              # Feature pages
    ├── company-management-dashboard/
    ├── company-detail/
    ├── company-users/
    ├── company-registration-review/
    └── admin-audit-log/
```

### Routes

- `/admin` → Redirects to `/admin/companies`
- `/admin/companies` → Company management dashboard
- `/admin/companies/:id` → Company detail page
- `/admin/companies/:id/users` → Company users management
- `/admin/registrations` → Registration request review
- `/admin/audit` → Audit log viewer

All routes are protected by `roleGuard` requiring `SYSTEM_ADMIN` role.

## Getting Started

### Prerequisites

- Angular 18+
- Carbon Components Angular
- RxJS

### Running the Application

```bash
# Start the dev server
pnpm start

# Navigate to /admin
# Default user is hardcoded as SYSTEM_ADMIN
```

### Default User

The `AuthStateService` provides a hardcoded system administrator:
- Email: `admin@system.com`
- Roles: `['SYSTEM_ADMIN']`

## Features

### 1. Company Management Dashboard

**Location:** `/admin/companies`

**Features:**
- List all companies with filters (status, vendor, search)
- Create new companies via modal
- Bulk actions (suspend, delete)
- Row actions (view, suspend, delete)
- Empty states

**Key Components:**
- `CompanyManagementDashboardPage`
- Uses `InMemoryAdminApiService` for data
- Carbon data table with compact density

### 2. Company Detail Page

**Location:** `/admin/companies/:id`

**Features:**
- Overview tab: Company metadata, status, quick actions
- Teams tab: Team management
- Settings tab: Edit metadata, vendor flag

**Key Components:**
- `CompanyDetailPage`
- Tab navigation (custom implementation)
- Right rail anchor navigation

### 3. Company Users Page

**Location:** `/admin/companies/:id/users`

**Features:**
- List users for a company
- Invite new users
- Assign roles
- Suspend/deactivate users
- Search and filter

**Key Components:**
- `CompanyUsersPage`
- Role assignment modal
- Invitation flow

### 4. Registration Review Page

**Location:** `/admin/registrations`

**Features:**
- List pending registration requests
- Approve/reject requests
- On approve: Creates company, sends invitation, logs audit events

**Key Components:**
- `CompanyRegistrationReviewPage`
- Approval/rejection workflow

### 5. Audit Log Page

**Location:** `/admin/audit`

**Features:**
- View all audit events
- Filter by action, target, date range
- Expandable details

**Key Components:**
- `AdminAuditLogPage`
- Event filtering

## Data Layer

### InMemoryAdminApiService

Provides in-memory CRUD operations with localStorage persistence:

**Company Operations:**
- `listCompanies(filter?)` - List with optional filters
- `getCompany(id)` - Get single company
- `createCompany(payload)` - Create new company
- `updateCompany(id, patch)` - Update company
- `suspendCompany(id)` - Toggle suspend status
- `deleteCompany(id)` - Delete company

**User Operations:**
- `listUsers(companyId?)` - List users, optionally filtered by company
- `inviteUser(companyId, email, role)` - Create invitation
- `assignRoles(userId, roles)` - Update user roles
- `suspendUser(userId)` - Suspend user
- `deactivateUser(userId)` - Deactivate user

**Registration Operations:**
- `listRegistrationRequests(status?)` - List requests
- `approveRegistration(id)` - Approve and create company
- `rejectRegistration(id, reason?)` - Reject request

**Audit Operations:**
- `listAuditEvents(query?)` - List with filters
- Automatic logging on all mutations

### Seed Data

The service seeds with:
- 2 companies (1 vendor, 1 regular)
- 4 users across companies
- 1 pending registration request

## Shared Components

### StatusTagComponent

Renders Carbon Tag with appropriate color for status:
- Company: active (green), suspended (red), deleted (gray), pending (blue)
- User: active (green), suspended (red), invited (blue), deactivated (gray)

### ConfirmDialogComponent

Reusable confirmation dialog:
- Title, message, confirm label
- Optional danger styling
- Optional text confirmation (type company name to confirm delete)

### RightRailAnchorsComponent

Anchor navigation for long pages:
- Sticky on desktop (>992px)
- Collapsible on mobile
- Auto-highlights active section

### TableEmptyStateComponent

Consistent empty state:
- Icon slot
- Title, description
- Optional primary action button

### RoleTagPipe

Formats role keys for display:
- `SYSTEM_ADMIN` → "System Admin"
- `COMPANY_OWNER` → "Company Owner"
- etc.

## Domain Models

### Company
```typescript
{
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'deleted' | 'pending';
  createdAt: string;
  updatedAt: string;
  metadata?: { address?, website?, notes? };
  teams: Team[];
  vendor?: boolean;
}
```

### User
```typescript
{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'active' | 'suspended' | 'invited' | 'deactivated';
  companyId: string;
  roles: RoleKey[];
  createdAt: string;
  lastLoginAt?: string;
}
```

### RegistrationRequest
```typescript
{
  id: string;
  companyName: string;
  submittedByEmail: string;
  submittedAt: string;
  notes?: string;
  status: 'new' | 'approved' | 'rejected';
  decisionBy?: string;
  decisionAt?: string;
  rejectionReason?: string;
}
```

### RoleKey
```typescript
'SYSTEM_ADMIN' | 'COMPANY_OWNER' | 'COMPANY_MANAGER' | 
'DEVELOPER' | 'ANALYST' | 'SUPPORT' | 'VIEWER'
```

## Styling

### Design System

- **Border radius:** `--radius-300: 6px`
- **Borders:** `1px solid rgba(0,0,0,0.08)`
- **Container:** `max-width: 1200px`, centered
- **Spacing:** Generous white space, consistent padding

### Light Theme Only

All components use CSS variables:
- `--linear-bg`: `#FAF9F6` (off-white)
- `--linear-text-primary`: `#262626` (dark gray)
- `--linear-text-secondary`: `#6B6B6B` (medium gray)
- `--linear-accent`: `#3B82F6` (blue)

## Extending Roles

To add new roles:

1. **Update RoleKey type** in `models/index.ts`:
```typescript
export type RoleKey = 
  | 'SYSTEM_ADMIN'
  | 'YOUR_NEW_ROLE'
  // ...
```

2. **Update RoleTagPipe** in `shared/pipes/role-tag.pipe.ts`:
```typescript
private roleLabels: Record<RoleKey, string> = {
  // ...
  YOUR_NEW_ROLE: 'Your New Role Label'
};
```

3. **Update availableRoles** in components that assign roles (e.g., `CompanyUsersPage`)

## Testing

### Unit Tests

Minimal unit tests included for:
- `InMemoryAdminApiService` - Registration approve/reject flow
- `CompanyRegistrationReviewPage` - Approval success path

### Manual Testing Checklist

- [ ] Navigate to `/admin` → redirects to `/admin/companies`
- [ ] View companies list with filters
- [ ] Create new company via modal
- [ ] Approve registration request → company created, invitation sent
- [ ] View company detail → tabs work
- [ ] Invite user → invitation created
- [ ] Assign roles → roles updated
- [ ] View audit log → events displayed

## Performance Considerations

- Uses Angular signals for reactive state
- Computed signals for derived data
- Debounced search inputs (300ms)
- OnPush change detection where applicable
- Optimistic updates with error handling

## Accessibility

- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management in modals
- WCAG AA color contrast
- Screen reader friendly

## Future Enhancements

- Real backend integration
- Pagination for large datasets
- Export functionality
- Advanced filtering
- Bulk import
- Email notifications
- Role-based UI restrictions

## Troubleshooting

### Routes not working

Ensure `app.routes.ts` includes the admin routes and `roleGuard` is properly imported.

### Data not persisting

Check browser localStorage - data persists there. Clear localStorage to reset seed data.

### Components not rendering

Verify all Carbon modules are imported in component imports array.

### Theme not applying

Ensure CSS variables are set in `ThemeService` and components use `var(--linear-*)` instead of hardcoded colors.

