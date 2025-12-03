import { Routes } from '@angular/router';
import { roleGuard } from './sys-admin/guards/role.guard';
import {
  CompanyManagementDashboardPage,
  CompanyDetailPage,
  CompanyUsersPage,
  CompanyRegistrationReviewPage,
  AdminAuditLogPage
} from './sys-admin';

export const routes: Routes = [
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
  }
];
