import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
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
  TabsModule,
  ToggleModule
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
import { StepCorrectionModalComponent } from './shared/components/step-correction-modal/step-correction-modal.component';
import { VendorLifecycleStepperComponent } from './shared/components/vendor-lifecycle-stepper/vendor-lifecycle-stepper.component';
import { VendorOnboardingWizardComponent } from './shared/components/vendor-onboarding-wizard/vendor-onboarding-wizard.component';
import { VendorSummaryCardComponent } from './shared/components/vendor-summary-card/vendor-summary-card.component';
import { VendorComplianceSectionComponent } from './shared/components/vendor-compliance-section/vendor-compliance-section.component';
import { VendorUsersSectionComponent } from './shared/components/vendor-users-section/vendor-users-section.component';
import { VendorApiKeysSectionComponent } from './shared/components/vendor-api-keys-section/vendor-api-keys-section.component';
import { VendorActivityLogSectionComponent } from './shared/components/vendor-activity-log-section/vendor-activity-log-section.component';
import { DataTableComponent } from './shared/components/data-table/data-table.component';
import { AddVendorCompanyDrawerComponent } from './shared/components/add-vendor-company-drawer/add-vendor-company-drawer.component';
import { AiChatDockComponent } from './shared/components/ai-chat-dock/ai-chat-dock.component';
import { AiAssistDrawerComponent } from './shared/components/ai-assist-drawer/ai-assist-drawer.component';
import { TextInputComponent } from './shared/components/primitives/text-input/text-input.component';
import { SelectComponent } from './shared/components/primitives/select/select.component';
import { IconButtonComponent } from './shared/components/primitives/icon-button/icon-button.component';
import { FilterChipComponent } from './shared/components/primitives/filter-chip/filter-chip.component';
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
import { routes } from './app.routes';

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
    AiAssistantAgentSummaryComponent,
    TextInputComponent,
    SelectComponent,
    IconButtonComponent,
    FilterChipComponent
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
  ToggleModule,
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
    StepCorrectionModalComponent,
    VendorLifecycleStepperComponent,
    VendorOnboardingWizardComponent,
    VendorSummaryCardComponent,
    VendorComplianceSectionComponent,
    VendorUsersSectionComponent,
    VendorApiKeysSectionComponent,
    VendorActivityLogSectionComponent,
    RouterModule.forRoot(routes, { bindToComponentInputs: true }),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}

