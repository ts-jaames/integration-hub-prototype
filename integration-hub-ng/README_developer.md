# Developer (Internal) Workspace

## Overview

The Developer workspace provides a front-end-only interface for internal developers to manage APIs, service accounts, and deployments. All data is stored in localStorage with in-memory services.

## Routes

- `/dev` - Redirects to `/dev/dashboard`
- `/dev/dashboard` - Developer dashboard with stats and recent activity
- `/dev/service-accounts` - Manage service accounts and API keys
- `/dev/apis` - API catalog
- `/dev/apis/new` - Multi-step API creation wizard
- `/dev/apis/:apiId` - API editor with tabs (Overview, Backends, Routes, Policies, Docs, Deploy, Activity)

## Authentication

The workspace is protected by `devRoleGuard` which checks for `DEVELOPER_INTERNAL` role. The current user is hardcoded in `DevAuthStateService`:

```typescript
{
  id: 'dev-1',
  email: 'developer@internal.com',
  roles: ['DEVELOPER_INTERNAL'],
  teams: ['Platform']
}
```

## Navigation

The developer navigation appears in the sidebar when the role selector is set to "Developer (Internal)". It shows:
- Dashboard
- Service Accounts
- APIs

## Features

### Service Accounts

- Create service accounts with name, description, environments (sandbox/prod), and scopes
- Manage API keys: create, rotate, revoke
- Copy token previews to clipboard
- Suspend accounts

### API Management

**API Wizard (Multi-step):**
1. Overview: Name, slug, owner team, environments
2. Backend: Create first backend
3. Routes: Add routes with path and methods
4. Policies: Apply default policy templates
5. Review: Summary before creation

**API Editor (Tabs):**
- **Overview**: API metadata, quick actions
- **Backends**: Add/edit backends with base URL and timeout
- **Routes**: Manage routes with path, methods, and backend mapping
- **Policies**: Browse templates and apply/manage policies
- **Docs**: Edit OpenAPI (JSON/YAML) and generate Markdown
- **Deploy**: Deploy API versions to environments with preflight checks
- **Activity**: View deployment history

### Documentation

- Save OpenAPI specifications in JSON or YAML format
- Generate Markdown documentation from OpenAPI
- Documentation is stored as `ApiDoc` objects in the API entity

### Deployment

- Select version and environment (sandbox/prod)
- Preflight checklist validates:
  - Backend exists
  - At least one route
  - At least one policy
- Creates `Deployment` record with status and summary
- Shows success toast and navigates to Activity tab

## Data Layer

All data is managed by `InMemoryDevService` with localStorage persistence:

- `serviceAccounts`: ServiceAccount[]
- `apis`: ApiEntity[]
- `policyTemplates`: PolicyTemplate[]
- `deployments`: Deployment[]

### Seed Data

On first load, the service seeds:
- 2 service accounts (sandbox-only and sandbox+prod)
- 2 APIs (Orders, Invoices) with routes and backends
- 5 policy templates (rate limits, JWT, CORS, cache)
- 2 historical deployments

## Styling

- Container utility: `max-width: 1200px; margin: 0 auto; padding: 16px;`
- Border radius: `6px`
- Borders: `1px solid rgba(0, 0, 0, 0.08)`
- Light theme only

## Testing

Minimal unit tests:
- Service accounts: rotate key updates `lastRotatedAt` and adds new active key
- Deploy: creates Deployment with success status

## Architecture

```
src/app/developer/
├── models/           # Domain models (ServiceAccount, ApiEntity, etc.)
├── services/        # InMemoryDevService, DevAuthStateService
├── guards/          # devRoleGuard
├── shared/
│   ├── components/  # RightRailAnchors, ConfirmDialog
│   ├── pipes/       # StatusTagPipe
│   └── directives/  # CopyToClipboardDirective
└── pages/
    ├── dev-dashboard/
    ├── service-accounts/
    ├── api-catalog/
    ├── api-wizard/
    └── api-editor/
```

## Usage

1. Set role selector to "Developer (Internal)"
2. Navigate to `/dev` (redirects to dashboard)
3. Use navigation to access different sections
4. Create APIs via wizard or manage existing ones in editor
5. Manage service accounts and keys
6. Deploy APIs to sandbox or production environments

