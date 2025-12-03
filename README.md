# FSR Integration Hub Prototype

An Angular front-end prototype for the FSR Integration Hub, providing a comprehensive interface for managing integrations, APIs, companies, users, and system administration.

## Overview

This is a front-end-only prototype built with Angular 20 and Carbon Components Angular. The application demonstrates a complete integration hub interface with multiple user roles and workspaces:

- **System Administrator Workspace**: Company management, user administration, registration review, and audit logs
- **Developer Workspace**: API management, service accounts, and deployment workflows
- **General Dashboard**: Overview of integrations, connections, and platform metrics

## Features

### System Administration
- Company management with vendor directory
- User management and role assignment
- Registration request review and approval
- Comprehensive audit logging
- Company detail pages with teams and settings

### Developer Tools
- API catalog and management
- Multi-step API creation wizard
- API editor with tabs (Overview, Backends, Routes, Policies, Docs, Deploy, Activity)
- Service account management with API key rotation
- Deployment workflows with preflight checks

### General Features
- Dashboard with metrics and recent activity
- Integration monitoring and analytics
- Compliance and audit tracking
- Webhook documentation
- AI assistant for troubleshooting

## Technology Stack

- **Angular**: 20.3.0
- **Carbon Components Angular**: 5.62.1
- **TypeScript**: 5.9.2
- **RxJS**: 7.8.0
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (install via `npm install -g pnpm`)

### Installation

1. Navigate to the Angular project directory:
   ```bash
   cd integration-hub-ng
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

### Running Locally

Start the development server:

```bash
cd integration-hub-ng
pnpm start
```

The application will be available at `http://localhost:4200/`.

### Building for Production

```bash
cd integration-hub-ng
pnpm build
```

The build artifacts will be stored in the `dist/` directory.

## Mock Data and Assumptions

**Important**: This is a front-end prototype with no backend integration. All data is simulated using in-memory services and mock data.

### Data Storage

- **Developer Workspace**: Data is stored in browser `localStorage` using the `InMemoryDevService`
- **System Admin Workspace**: Data is stored in browser `localStorage` using the `InMemoryAdminApiService`
- **General Pages**: Some components use hardcoded mock data arrays

### Seed Data

On first load, the application seeds with:

- **Service Accounts**: 2 sample service accounts (sandbox-only and sandbox+prod)
- **APIs**: 2 sample APIs (Orders, Invoices) with routes and backends
- **Policy Templates**: 5 policy templates (rate limits, JWT, CORS, cache)
- **Companies**: Sample vendor companies and regular companies
- **Users**: Sample users across different companies
- **Registration Requests**: Pending registration requests for review

### Authentication

Authentication is simulated with hardcoded user roles:

- **System Admin**: `admin@system.com` with `SYSTEM_ADMIN` role
- **Developer**: `developer@internal.com` with `DEVELOPER_INTERNAL` role

Role-based navigation and guards control access to different workspaces.

### JSON Assets

The application includes sample JSON files in `src/assets/`:
- `providers.json`: Integration provider definitions
- `connections.json`: Sample connection data
- `events.json`: Sample event data

### Data Persistence

All data persists in browser `localStorage`. To reset the application:
1. Open browser DevTools
2. Navigate to Application > Local Storage
3. Clear all entries for `localhost:4200`

## Project Structure

```
integration-hub-ng/
├── src/
│   ├── app/
│   │   ├── core/              # Core services (mock API, search, theme)
│   │   ├── developer/         # Developer workspace module
│   │   ├── sys-admin/         # System admin workspace module
│   │   ├── pages/             # General application pages
│   │   └── shared/            # Shared components and utilities
│   └── assets/                # Static assets and JSON data
├── dist/                      # Build output
└── public/                    # Public assets
```

## Development

### Code Generation

Generate new components, services, or modules:

```bash
ng generate component component-name
```

### Testing

Run unit tests:

```bash
pnpm test
```

## Additional Documentation

- `README_developer.md`: Detailed documentation for the Developer workspace
- `README_sys-admin.md`: Detailed documentation for the System Admin workspace
- `DOC_LAYOUT_README.md`: Documentation layout component details

## Notes

- This prototype is for demonstration purposes only
- No real backend API integration exists
- All data is client-side only and stored in localStorage
- Authentication and authorization are simulated
- Some features may be incomplete or placeholder implementations

## License

Private repository - All rights reserved.

