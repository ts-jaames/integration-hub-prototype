import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  UIShellModule, 
  ButtonModule, 
  GridModule, 
  TableModule, 
  FileUploaderModule,
  IconModule,
  LoadingModule,
  SelectModule,
  InputModule,
  NotificationModule,
  CheckboxModule,
  ModalModule,
  TagModule,
  TabsModule
} from 'carbon-components-angular';

import { AppComponent } from './app.component';
import { DashboardComponent } from './pages/dashboard.component';
import { CompaniesComponent } from './pages/companies.component';
import { UsersComponent } from './pages/users.component';
import { ServiceAccountsComponent } from './pages/service-accounts.component';
import { ApisComponent } from './pages/apis.component';
import { MonitoringComponent } from './pages/monitoring.component';
import { ComplianceComponent } from './pages/compliance.component';
import { LumenIconComponent } from './shared/icons/lumen-icon.component';
import { DocLayoutComponent } from './shared/components/doc-layout/doc-layout.component';
import { DocTocComponent } from './shared/components/doc-toc/doc-toc.component';
import { DocAnchorDirective } from './shared/directives/doc-anchor.directive';
import { WebhooksDocsComponent } from './pages/webhooks-docs.component';
import { RolesPermissionsComponent } from './pages/roles-permissions.component';
import { CredentialsKeysComponent } from './pages/credentials-keys.component';
import { UsageAnalyticsComponent } from './pages/usage-analytics.component';
import { PlatformSettingsComponent } from './pages/platform-settings.component';
import { SupportTicketsComponent } from './pages/support-tickets.component';
import { CompanyDirectoryComponent } from './pages/company-directory.component';
import { OnboardingQueueComponent } from './pages/onboarding-queue.component';
import { CompanyDetailsComponent } from './pages/company-details.component';
import { AiAssistantInsightsComponent } from './pages/ai-assistant-insights.component';
import { AiAssistantInsightDetailComponent } from './pages/ai-assistant-insight-detail.component';
import { AiAssistantWorkflowComponent } from './pages/ai-assistant-workflow.component';
import { AiAssistantResolutionComponent } from './pages/ai-assistant-resolution.component';
import { AiAssistantAgentModeComponent } from './pages/ai-assistant-agent-mode.component';
import { AiAssistantAgentSummaryComponent } from './pages/ai-assistant-agent-summary.component';
import { AgentStatusComponent } from './shared/components/agent-status/agent-status.component';
import { AgentActivityLogComponent } from './shared/components/agent-activity-log/agent-activity-log.component';
import { DataTableComponent } from './shared/components/data-table/data-table.component';
import { AddVendorCompanyDrawerComponent } from './shared/components/add-vendor-company-drawer/add-vendor-company-drawer.component';
import { AiChatDockComponent } from './shared/components/ai-chat-dock/ai-chat-dock.component';
import { AiAssistDrawerComponent } from './shared/components/ai-assist-drawer/ai-assist-drawer.component';
import { roleGuard } from './sys-admin/guards/role.guard';
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
  ApiEditorPage,
  devRoleGuard
} from './developer';
import { SidebarNavComponent } from './shared/nav/sidebar-nav.component';
import { BreadcrumbsComponent } from './shared/nav/breadcrumbs.component';
import { CodeBlockComponent } from './shared/components/code-block/code-block.component';

const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'companies', component: CompaniesComponent },
  { path: 'users', component: UsersComponent },
  { 
    path: 'service-accounts', 
    component: ServiceAccountsPage,
    canActivate: [devRoleGuard]
  },
  { path: 'apis', component: ApisComponent },
  { path: 'monitoring', component: MonitoringComponent },
  { path: 'compliance', component: ComplianceComponent },
  { path: 'docs/webhooks', component: WebhooksDocsComponent },
  { path: 'roles-permissions', component: RolesPermissionsComponent },
  { path: 'credentials-keys', component: CredentialsKeysComponent },
  { path: 'usage-analytics', component: UsageAnalyticsComponent },
  { path: 'platform-settings', component: PlatformSettingsComponent },
  { path: 'support-tickets', component: SupportTicketsComponent },
      { path: 'vendors/companies', component: CompanyDirectoryComponent },
      { path: 'vendors/companies/:id', component: CompanyDetailsComponent },
      { path: 'vendors/onboarding', component: OnboardingQueueComponent },
      { 
        path: 'ai-assistant', 
        children: [
          { path: 'insights', component: AiAssistantInsightsComponent },
          { path: 'insights/:id', component: AiAssistantInsightDetailComponent },
          { path: 'workflow/:id', component: AiAssistantWorkflowComponent },
          { path: 'resolution/:id', component: AiAssistantResolutionComponent },
          { path: 'agent/:id', component: AiAssistantAgentModeComponent },
          { path: 'agent-summary/:id', component: AiAssistantAgentSummaryComponent },
          { path: '', redirectTo: 'insights', pathMatch: 'full' }
        ]
      },
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
  { path: '**', redirectTo: '' },
];

@NgModule({
  declarations: [
    AppComponent, 
    DashboardComponent,
    CompaniesComponent,
    UsersComponent,
    ServiceAccountsComponent,
    ApisComponent,
    MonitoringComponent,
    ComplianceComponent,
    DocLayoutComponent,
    DocTocComponent,
    DocAnchorDirective,
    WebhooksDocsComponent,
    RolesPermissionsComponent,
    CredentialsKeysComponent,
    UsageAnalyticsComponent,
    PlatformSettingsComponent,
    SupportTicketsComponent,
    CompanyDirectoryComponent,
    OnboardingQueueComponent,
    CompanyDetailsComponent,
    AiAssistantInsightsComponent,
    AiAssistantInsightDetailComponent,
    AiAssistantWorkflowComponent,
    AiAssistantResolutionComponent,
    AiAssistantAgentModeComponent,
    AiAssistantAgentSummaryComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    UIShellModule,
    ButtonModule,
    GridModule,
    TableModule,
    FileUploaderModule,
    IconModule,
    LoadingModule,
    SelectModule,
    InputModule,
    TagModule,
  NotificationModule,
  CheckboxModule,
  ModalModule,
  TabsModule,
    LumenIconComponent,
    DataTableComponent,
    // Admin pages (standalone components)
    CompanyManagementDashboardPage,
    CompanyDetailPage,
    CompanyUsersPage,
    CompanyRegistrationReviewPage,
    AdminAuditLogPage,
    // Developer pages (standalone components)
    DevDashboardPage,
    ServiceAccountsPage,
    ApiCatalogPage,
    ApiWizardPage,
    ApiEditorPage,
    SidebarNavComponent,
    BreadcrumbsComponent,
    CodeBlockComponent,
    AddVendorCompanyDrawerComponent,
    AiChatDockComponent,
    AiAssistDrawerComponent,
    AgentStatusComponent,
    AgentActivityLogComponent,
    RouterModule.forRoot(routes, { bindToComponentInputs: true }),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}

