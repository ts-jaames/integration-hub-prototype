import { NavSection } from './nav.types';

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    links: [
      { label: 'Overview', path: '/', icon: 'dashboard' }
    ]
  },
  {
    id: 'vendors',
    label: 'Vendors',
    links: [
      { label: 'Vendor Directory', path: '/vendors/companies', icon: 'building' }
    ]
  },
  {
    id: 'users-access',
    label: 'Users & Access',
    links: [
      { label: 'User Management', path: '/users', icon: 'users' },
      { label: 'Roles & Permissions', path: '/roles-permissions', icon: 'users' }
    ]
  },
  {
    id: 'applications-apis',
    label: 'Applications & APIs',
    links: [
      { label: 'Applications', path: '/applications', icon: 'building' },
      { label: 'API Catalog', path: '/apis', icon: 'api' },
      { label: 'Credentials & Keys', path: '/credentials-keys', icon: 'key' }
    ]
  },
  {
    id: 'monitoring',
    label: 'Monitoring & Analytics',
    links: [
      { label: 'System Monitoring', path: '/monitoring', icon: 'chart' },
      { label: 'Usage Analytics', path: '/usage-analytics', icon: 'chart' }
    ]
  },
  {
    id: 'compliance',
    label: 'Compliance & Audit',
    links: [
      { label: 'Compliance Dashboard', path: '/compliance', icon: 'shield' },
      { label: 'Audit Log', path: '/admin/audit', icon: 'shield' }
    ]
  },
  {
    id: 'ai-assistant',
    label: 'AI Assistant',
    links: [
      { label: 'Insights', path: '/ai-assistant/insights', icon: 'dashboard' }
    ]
  },
  {
    id: 'admin',
    label: 'Platform Administration',
    links: [
      { label: 'Company Management', path: '/admin/companies', icon: 'building' },
      { label: 'Platform Settings', path: '/platform-settings', icon: 'settings' },
      { label: 'Support & Tickets', path: '/support-tickets', icon: 'support' }
    ]
  },
  {
    id: 'service-accounts',
    label: 'Service Accounts',
    links: [
      { label: 'All Accounts', path: '/service-accounts', icon: 'key' }
    ]
  },
  {
    id: 'developer',
    label: 'Developer',
    links: [
      { label: 'Developer Dashboard', path: '/dev/dashboard', icon: 'dashboard' },
      { label: 'API Catalog', path: '/dev/apis', icon: 'api' },
      { label: 'New API', path: '/dev/apis/new', icon: 'plus' },
      { label: 'Service Accounts', path: '/dev/service-accounts', icon: 'key' }
    ]
  }
];

