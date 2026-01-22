import { Routes } from '@angular/router';
import { roleGuard } from './sys-admin/guards/role.guard';
import { devRoleGuard } from './developer/guards/role.guard';
import {
  CompanyManagementDashboardPage,
  CompanyDetailPage,
  CompanyUsersPage,
  CompanyRegistrationReviewPage,
  AdminAuditLogPage
} from './sys-admin';
import {
  DevDashboardPage,
  ServiceAccountsPage,
  ApiCatalogPage,
  ApiWizardPage,
  ApiEditorPage
} from './developer';
import { DashboardComponent } from './pages/dashboard.component';
import { CompaniesComponent } from './pages/companies.component';
import { UsersComponent } from './pages/users.component';
import { ApisComponent } from './pages/apis.component';
import { MonitoringComponent } from './pages/monitoring.component';
import { ComplianceComponent } from './pages/compliance.component';
import { WebhooksDocsComponent } from './pages/webhooks-docs.component';
import { RolesPermissionsComponent } from './pages/roles-permissions.component';
import { CredentialsKeysComponent } from './pages/credentials-keys.component';
import { UsageAnalyticsComponent } from './pages/usage-analytics.component';
import { PlatformSettingsComponent } from './pages/platform-settings.component';
import { SupportTicketsComponent } from './pages/support-tickets.component';
import { CompanyDirectoryComponent } from './pages/company-directory.component';
import { CompanyDetailsComponent } from './pages/company-details.component';
import { VendorOnboardingPage } from './pages/vendor-onboarding.page';
import { AiAssistantInsightsComponent } from './pages/ai-assistant-insights.component';
import { AiAssistantInsightDetailComponent } from './pages/ai-assistant-insight-detail.component';
import { AiAssistantWorkflowComponent } from './pages/ai-assistant-workflow.component';
import { AiAssistantResolutionComponent } from './pages/ai-assistant-resolution.component';
import { AiAssistantAgentModeComponent } from './pages/ai-assistant-agent-mode.component';
import { AiAssistantAgentSummaryComponent } from './pages/ai-assistant-agent-summary.component';

/**
 * Application routes
 * 
 * Single source of truth for all routing configuration.
 * Routes are organized by feature area for clarity.
 */
export const routes: Routes = [
  // Root route
  { path: '', component: DashboardComponent },
  
  // Main application routes
  { path: 'companies', component: CompaniesComponent },
  { path: 'users', component: UsersComponent },
  { path: 'apis', component: ApisComponent },
  { path: 'monitoring', component: MonitoringComponent },
  { path: 'compliance', component: ComplianceComponent },
  { path: 'docs/webhooks', component: WebhooksDocsComponent },
  { path: 'roles-permissions', component: RolesPermissionsComponent },
  { path: 'credentials-keys', component: CredentialsKeysComponent },
  { path: 'usage-analytics', component: UsageAnalyticsComponent },
  { path: 'platform-settings', component: PlatformSettingsComponent },
  { path: 'support-tickets', component: SupportTicketsComponent },
  
  // Service accounts (legacy route - also available under /dev)
  {
    path: 'service-accounts',
    component: ServiceAccountsPage,
    canActivate: [devRoleGuard]
  },
  
  // Vendor management routes
  {
    path: 'vendors',
    redirectTo: 'vendors/companies',
    pathMatch: 'full'
  },
  {
    path: 'vendors/companies',
    component: CompanyDirectoryComponent
  },
  {
    path: 'vendors/new/onboarding',
    component: VendorOnboardingPage
  },
  {
    path: 'vendors/companies/:id',
    component: CompanyDetailsComponent
  },
  
  // AI Assistant routes
  {
    path: 'ai-assistant',
    children: [
      {
        path: 'insights',
        component: AiAssistantInsightsComponent
      },
      {
        path: 'insights/:id',
        component: AiAssistantInsightDetailComponent
      },
      {
        path: 'workflow/:id',
        component: AiAssistantWorkflowComponent
      },
      {
        path: 'resolution/:id',
        component: AiAssistantResolutionComponent
      },
      {
        path: 'agent/:id',
        component: AiAssistantAgentModeComponent
      },
      {
        path: 'agent-summary/:id',
        component: AiAssistantAgentSummaryComponent
      },
      {
        path: '',
        redirectTo: 'insights',
        pathMatch: 'full'
      }
    ]
  },
  
  // System Admin routes
  {
    path: 'admin',
    canActivate: [roleGuard],
    children: [
      {
        path: '',
        redirectTo: 'companies',
        pathMatch: 'full'
      },
      {
        path: 'companies',
        component: CompanyManagementDashboardPage
      },
      {
        path: 'companies/:id',
        component: CompanyDetailPage
      },
      {
        path: 'companies/:id/users',
        component: CompanyUsersPage
      },
      {
        path: 'registrations',
        component: CompanyRegistrationReviewPage
      },
      {
        path: 'audit',
        component: AdminAuditLogPage
      }
    ]
  },
  
  // Developer routes
  {
    path: 'dev',
    canActivate: [devRoleGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: DevDashboardPage
      },
      {
        path: 'service-accounts',
        component: ServiceAccountsPage
      },
      {
        path: 'apis',
        component: ApiCatalogPage
      },
      {
        path: 'apis/new',
        component: ApiWizardPage
      },
      {
        path: 'apis/:apiId',
        component: ApiEditorPage
      }
    ]
  },
  
  // Wildcard route - must be last
  {
    path: '**',
    redirectTo: ''
  }
];
