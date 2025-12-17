import { Injectable, signal, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, delay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiClientService } from '../../core/services/api-client.service';
import { LoggerService } from '../../core/services/logger.service';
import {
  ServiceAccount,
  ApiKey,
  ApiEntity,
  PolicyTemplate,
  Deployment,
  Backend,
  RouteDef,
  AppliedPolicy,
  ApiDoc,
  EnvKey
} from '../models';

// Removed STORAGE_KEYS - in-memory services should not persist to localStorage
// Data is only kept in memory and resets on page refresh

@Injectable({
  providedIn: 'root'
})
export class InMemoryDevService {
  // In-memory only - no localStorage persistence
  // Data resets on page refresh (as expected for mock services)
  private serviceAccountsSubject = new BehaviorSubject<ServiceAccount[]>(this.getSeedServiceAccounts());
  private apisSubject = new BehaviorSubject<ApiEntity[]>(this.getSeedApis());
  private policyTemplatesSubject = new BehaviorSubject<PolicyTemplate[]>(this.getSeedPolicyTemplates());
  private deploymentsSubject = new BehaviorSubject<Deployment[]>(this.getSeedDeployments());

  serviceAccounts$ = this.serviceAccountsSubject.asObservable();
  apis$ = this.apisSubject.asObservable();
  policyTemplates$ = this.policyTemplatesSubject.asObservable();
  deployments$ = this.deploymentsSubject.asObservable();

  private apiClient = inject(ApiClientService);
  private logger = inject(LoggerService);

  constructor() {
    // No localStorage persistence - data is in-memory only
    // Data resets on page refresh (as expected for mock services)
  }

  // Service Account methods
  listServiceAccounts(): Observable<ServiceAccount[]> {
    if (environment.enableMockData) {
      // Dev mode: use in-memory mocks
      this.logger.debug('InMemoryDevService: Returning mock service accounts');
      return of([...this.serviceAccountsSubject.value]).pipe(delay(200));
    }

    // Production: use real API
    return this.apiClient.get<ServiceAccount[]>('service-accounts');
  }

  createServiceAccount(payload: Partial<ServiceAccount>): Observable<ServiceAccount> {
    if (environment.enableMockData) {
      // Dev mode: use in-memory mocks
      this.logger.debug('InMemoryDevService: Creating mock service account');
      const account: ServiceAccount = {
        id: `sa-${Date.now()}`,
        name: payload.name!,
        description: payload.description,
        envs: payload.envs || [],
        scopes: payload.scopes || [],
        createdAt: new Date().toISOString(),
        status: 'active',
        keys: []
      };
      const accounts = [...this.serviceAccountsSubject.value, account];
      this.serviceAccountsSubject.next(accounts);
      return of(account).pipe(delay(300));
    }

    // Production: use real API
    return this.apiClient.post<ServiceAccount>('service-accounts', payload);
  }

  updateServiceAccount(id: string, patch: Partial<ServiceAccount>): Observable<ServiceAccount> {
    const accounts = [...this.serviceAccountsSubject.value];
    const index = accounts.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Service account not found');
    
    accounts[index] = { ...accounts[index], ...patch };
    this.serviceAccountsSubject.next(accounts);
    return of(accounts[index]).pipe(delay(300));
  }

  suspendServiceAccount(id: string): Observable<ServiceAccount> {
    return this.updateServiceAccount(id, { status: 'suspended' });
  }

  createKey(accountId: string, label: string, env?: EnvKey, expiresAt?: string, scopes?: string[]): Observable<ApiKey> {
    const accounts = [...this.serviceAccountsSubject.value];
    const account = accounts.find(a => a.id === accountId);
    if (!account) throw new Error('Service account not found');

    const key: ApiKey = {
      id: `key-${Date.now()}`,
      label,
      tokenPreview: `xxxx-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      expiresAt,
      status: 'active',
      env
    };

    account.keys.push(key);
    this.serviceAccountsSubject.next(accounts);
    return of(key).pipe(delay(300));
  }

  rotateKey(accountId: string, keyId: string): Observable<ApiKey> {
    const accounts = [...this.serviceAccountsSubject.value];
    const account = accounts.find(a => a.id === accountId);
    if (!account) throw new Error('Service account not found');

    const keyIndex = account.keys.findIndex(k => k.id === keyId);
    if (keyIndex === -1) throw new Error('Key not found');

    account.keys[keyIndex].status = 'revoked';
    account.lastRotatedAt = new Date().toISOString();

    const newKey: ApiKey = {
      id: `key-${Date.now()}`,
      label: account.keys[keyIndex].label,
      tokenPreview: `xxxx…${Math.random().toString(36).substr(-4)}`,
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    account.keys.push(newKey);
    this.serviceAccountsSubject.next(accounts);
    return of(newKey).pipe(delay(300));
  }

  revokeKey(accountId: string, keyId: string, reason?: string): Observable<void> {
    const accounts = [...this.serviceAccountsSubject.value];
    const account = accounts.find(a => a.id === accountId);
    if (!account) throw new Error('Service account not found');

    const key = account.keys.find(k => k.id === keyId);
    if (!key) throw new Error('Key not found');

    key.status = 'revoked';
    this.serviceAccountsSubject.next(accounts);
    return of(undefined).pipe(delay(300));
  }

  getAvailableScopes(): Observable<string[]> {
    // Return list of available API scopes
    return of([
      'orders:read',
      'orders:write',
      'invoices:read',
      'invoices:write',
      'customers:read',
      'customers:write',
      'products:read',
      'products:write',
      'payments:read',
      'payments:write',
      'webhooks:read',
      'webhooks:write',
      'analytics:read'
    ]).pipe(delay(100));
  }

  updateAccountScopes(accountId: string, scopes: string[]): Observable<ServiceAccount> {
    const accounts = [...this.serviceAccountsSubject.value];
    const account = accounts.find(a => a.id === accountId);
    if (!account) throw new Error('Service account not found');

    account.scopes = scopes;
    this.serviceAccountsSubject.next(accounts);
    return of(account).pipe(delay(300));
  }

  listRecentCallsByAccount(accountId: string): Observable<any[]> {
    // Mock recent API calls for the account
    const mockCalls = [
      {
        id: 'call-1',
        accountId,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        api: 'Orders API',
        method: 'GET',
        status: 200,
        latency: 45
      },
      {
        id: 'call-2',
        accountId,
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        api: 'Orders API',
        method: 'POST',
        status: 201,
        latency: 120
      },
      {
        id: 'call-3',
        accountId,
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        api: 'Invoices API',
        method: 'GET',
        status: 200,
        latency: 38
      }
    ];
    return of(mockCalls).pipe(delay(200));
  }

  // API methods
  listApis(): Observable<ApiEntity[]> {
    return of([...this.apisSubject.value]).pipe(delay(200));
  }

  getApi(id: string): Observable<ApiEntity | null> {
    const api = this.apisSubject.value.find(a => a.id === id);
    return of(api || null).pipe(delay(100));
  }

  createApi(payload: Partial<ApiEntity>): Observable<ApiEntity> {
    const api: ApiEntity = {
      id: `api-${Date.now()}`,
      name: payload.name!,
      slug: payload.slug!,
      ownerTeam: payload.ownerTeam,
      versions: payload.versions || [{ name: 'v1', status: 'draft' }],
      currentVersion: payload.currentVersion || 'v1',
      envs: payload.envs || [],
      backends: payload.backends || [],
      routes: payload.routes || [],
      policies: payload.policies || [],
      docs: payload.docs,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const apis = [...this.apisSubject.value, api];
    this.apisSubject.next(apis);
    return of(api).pipe(delay(300));
  }

  updateApi(id: string, patch: Partial<ApiEntity>): Observable<ApiEntity> {
    const apis = [...this.apisSubject.value];
    const index = apis.findIndex(a => a.id === id);
    if (index === -1) throw new Error('API not found');

    apis[index] = { ...apis[index], ...patch, updatedAt: new Date().toISOString() };
    this.apisSubject.next(apis);
    return of(apis[index]).pipe(delay(300));
  }

  // Backend methods
  addBackend(apiId: string, payload: Partial<Backend>): Observable<Backend> {
    const apis = [...this.apisSubject.value];
    const api = apis.find(a => a.id === apiId);
    if (!api) throw new Error('API not found');

    const backend: Backend = {
      id: `backend-${Date.now()}`,
      name: payload.name!,
      baseUrl: payload.baseUrl!,
      timeoutMs: payload.timeoutMs,
      headers: payload.headers
    };

    api.backends.push(backend);
    api.updatedAt = new Date().toISOString();
    this.apisSubject.next(apis);
    return of(backend).pipe(delay(300));
  }

  updateBackend(apiId: string, backendId: string, patch: Partial<Backend>): Observable<Backend> {
    const apis = [...this.apisSubject.value];
    const api = apis.find(a => a.id === apiId);
    if (!api) throw new Error('API not found');

    const backendIndex = api.backends.findIndex(b => b.id === backendId);
    if (backendIndex === -1) throw new Error('Backend not found');

    api.backends[backendIndex] = { ...api.backends[backendIndex], ...patch };
    api.updatedAt = new Date().toISOString();
    this.apisSubject.next(apis);
    return of(api.backends[backendIndex]).pipe(delay(300));
  }

  // Route methods
  addRoute(apiId: string, route: RouteDef): Observable<RouteDef> {
    const apis = [...this.apisSubject.value];
    const api = apis.find(a => a.id === apiId);
    if (!api) throw new Error('API not found');

    api.routes.push(route);
    api.updatedAt = new Date().toISOString();
    this.apisSubject.next(apis);
    return of(route).pipe(delay(300));
  }

  updateRoute(apiId: string, routeId: string, patch: Partial<RouteDef>): Observable<RouteDef> {
    const apis = [...this.apisSubject.value];
    const api = apis.find(a => a.id === apiId);
    if (!api) throw new Error('API not found');

    const routeIndex = api.routes.findIndex(r => r.id === routeId);
    if (routeIndex === -1) throw new Error('Route not found');

    api.routes[routeIndex] = { ...api.routes[routeIndex], ...patch };
    api.updatedAt = new Date().toISOString();
    this.apisSubject.next(apis);
    return of(api.routes[routeIndex]).pipe(delay(300));
  }

  removeRoute(apiId: string, routeId: string): Observable<void> {
    const apis = [...this.apisSubject.value];
    const api = apis.find(a => a.id === apiId);
    if (!api) throw new Error('API not found');

    api.routes = api.routes.filter(r => r.id !== routeId);
    api.updatedAt = new Date().toISOString();
    this.apisSubject.next(apis);
    return of(undefined).pipe(delay(300));
  }

  // Policy methods
  listPolicyTemplates(tags?: string[]): Observable<PolicyTemplate[]> {
    let templates = [...this.policyTemplatesSubject.value];
    if (tags && tags.length > 0) {
      templates = templates.filter(t => t.tags?.some(tag => tags.includes(tag)));
    }
    return of(templates).pipe(delay(200));
  }

  applyPolicy(apiId: string, applied: AppliedPolicy): Observable<AppliedPolicy> {
    const apis = [...this.apisSubject.value];
    const api = apis.find(a => a.id === apiId);
    if (!api) throw new Error('API not found');

    api.policies.push(applied);
    api.updatedAt = new Date().toISOString();
    this.apisSubject.next(apis);
    return of(applied).pipe(delay(300));
  }

  togglePolicy(apiId: string, appliedId: string, enabled: boolean): Observable<AppliedPolicy> {
    const apis = [...this.apisSubject.value];
    const api = apis.find(a => a.id === apiId);
    if (!api) throw new Error('API not found');

    const policy = api.policies.find(p => p.id === appliedId);
    if (!policy) throw new Error('Policy not found');

    policy.enabled = enabled;
    api.updatedAt = new Date().toISOString();
    this.apisSubject.next(apis);
    return of(policy).pipe(delay(300));
  }

  removePolicy(apiId: string, appliedId: string): Observable<void> {
    const apis = [...this.apisSubject.value];
    const api = apis.find(a => a.id === apiId);
    if (!api) throw new Error('API not found');

    api.policies = api.policies.filter(p => p.id !== appliedId);
    api.updatedAt = new Date().toISOString();
    this.apisSubject.next(apis);
    return of(undefined).pipe(delay(300));
  }

  // Docs methods
  saveOpenApi(apiId: string, content: string, format: 'openapi-json' | 'openapi-yaml'): Observable<ApiDoc> {
    const apis = [...this.apisSubject.value];
    const api = apis.find(a => a.id === apiId);
    if (!api) throw new Error('API not found');

    const doc: ApiDoc = {
      format,
      content,
      generatedAt: new Date().toISOString()
    };

    if (!api.docs) api.docs = [];
    api.docs = api.docs.filter(d => d.format !== 'openapi-json' && d.format !== 'openapi-yaml');
    api.docs.push(doc);
    api.updatedAt = new Date().toISOString();
    this.apisSubject.next(apis);
    return of(doc).pipe(delay(300));
  }

  generateMarkdownFromOpenAPI(apiId: string): Observable<ApiDoc> {
    const apis = [...this.apisSubject.value];
    const api = apis.find(a => a.id === apiId);
    if (!api) throw new Error('API not found');

    const openApiDoc = api.docs?.find(d => d.format === 'openapi-json' || d.format === 'openapi-yaml');
    if (!openApiDoc) throw new Error('OpenAPI doc not found');

    // Mock markdown generation
    const markdown = `# ${api.name} API Documentation

## Endpoints

${api.routes.map(r => `### ${r.methods.join(', ')} ${r.path}`).join('\n')}

*Generated from OpenAPI specification*
`;

    const doc: ApiDoc = {
      format: 'markdown',
      content: markdown,
      generatedAt: new Date().toISOString()
    };

    if (!api.docs) api.docs = [];
    api.docs = api.docs.filter(d => d.format !== 'markdown');
    api.docs.push(doc);
    api.updatedAt = new Date().toISOString();
    this.apisSubject.next(apis);
    return of(doc).pipe(delay(300));
  }

  // Deploy method
  deployApi(apiId: string, payload: { version: string; env: EnvKey }): Observable<Deployment> {
    const apis = [...this.apisSubject.value];
    const api = apis.find(a => a.id === apiId);
    if (!api) throw new Error('API not found');

    const deployment: Deployment = {
      id: `deploy-${Date.now()}`,
      apiId,
      version: payload.version,
      env: payload.env,
      actorUserId: 'dev-1',
      status: 'success',
      summary: `Successfully deployed ${api.name} ${payload.version} to ${payload.env}`,
      details: `Deployed ${api.routes.length} routes with ${api.policies.length} policies`,
      createdAt: new Date().toISOString()
    };

    const deployments = [...this.deploymentsSubject.value, deployment];
    this.deploymentsSubject.next(deployments);
    return of(deployment).pipe(delay(500));
  }

  getDeploymentsForApi(apiId: string): Observable<Deployment[]> {
    const deployments = this.deploymentsSubject.value.filter(d => d.apiId === apiId);
    return of(deployments).pipe(delay(200));
  }

  // Removed localStorage helpers - in-memory services should not persist data
  // This ensures mock data doesn't leak into production and resets on page refresh

  // Seed data
  private getSeedServiceAccounts(): ServiceAccount[] {
    return [
      {
        id: 'sa-1',
        name: 'api-client-prod',
        description: 'Acme Corp',
        envs: ['prod'],
        scopes: ['orders:read', 'orders:write'],
        createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        status: 'active',
        keys: [
          {
            id: 'key-1',
            label: 'Primary Key',
            tokenPreview: 'xxxx…a1b2',
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            status: 'active'
          }
        ]
      },
      {
        id: 'sa-2',
        name: 'webhook-service',
        description: 'TechStart Inc',
        envs: ['sandbox', 'prod'],
        scopes: ['webhooks:read'],
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        status: 'active',
        keys: [
          {
            id: 'key-2',
            label: 'Sandbox Key',
            tokenPreview: 'xxxx…c3d4',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            status: 'active'
          }
        ]
      }
    ];
  }

  private getSeedApis(): ApiEntity[] {
    return [
      {
        id: 'api-1',
        name: 'Orders API',
        slug: 'orders',
        ownerTeam: 'Platform',
        versions: [{ name: 'v1', status: 'draft' }],
        currentVersion: 'v1',
        envs: ['sandbox', 'prod'],
        backends: [
          {
            id: 'backend-1',
            name: 'Orders Backend',
            baseUrl: 'https://api.example.com/orders',
            timeoutMs: 5000
          }
        ],
        routes: [
          {
            id: 'route-1',
            path: '/orders',
            methods: ['GET', 'POST'],
            backendId: 'backend-1'
          },
          {
            id: 'route-2',
            path: '/orders/{id}',
            methods: ['GET', 'PUT', 'DELETE'],
            backendId: 'backend-1'
          }
        ],
        policies: [
          {
            id: 'policy-1',
            templateId: 'template-1',
            scope: 'api',
            enabled: true
          }
        ],
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'api-2',
        name: 'Invoices API',
        slug: 'invoices',
        ownerTeam: 'Platform',
        versions: [{ name: 'v1', status: 'draft' }],
        currentVersion: 'v1',
        envs: ['sandbox'],
        backends: [
          {
            id: 'backend-2',
            name: 'Invoices Backend',
            baseUrl: 'https://api.example.com/invoices',
            timeoutMs: 5000
          }
        ],
        routes: [
          {
            id: 'route-3',
            path: '/invoices',
            methods: ['GET', 'POST'],
            backendId: 'backend-2'
          }
        ],
        policies: [],
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    ];
  }

  private getSeedPolicyTemplates(): PolicyTemplate[] {
    return [
      {
        id: 'template-1',
        name: 'Rate Limit (Sandbox)',
        description: 'Rate limit for sandbox environment',
        scope: 'api',
        snippetXml: '<rate-limit>1000/hour</rate-limit>',
        defaults: { limit: 1000, period: 'hour' },
        tags: ['rate-limit', 'sandbox']
      },
      {
        id: 'template-2',
        name: 'Rate Limit (Production)',
        description: 'Rate limit for production environment',
        scope: 'api',
        snippetXml: '<rate-limit>10000/hour</rate-limit>',
        defaults: { limit: 10000, period: 'hour' },
        tags: ['rate-limit', 'prod']
      },
      {
        id: 'template-3',
        name: 'JWT Validate',
        description: 'Validate JWT tokens',
        scope: 'api',
        snippetXml: '<jwt-validate>...</jwt-validate>',
        tags: ['auth', 'jwt']
      },
      {
        id: 'template-4',
        name: 'CORS',
        description: 'CORS policy',
        scope: 'global',
        snippetXml: '<cors>...</cors>',
        tags: ['cors']
      },
      {
        id: 'template-5',
        name: 'Cache',
        description: 'Response caching',
        scope: 'route',
        snippetXml: '<cache>...</cache>',
        tags: ['cache']
      }
    ];
  }

  private getSeedDeployments(): Deployment[] {
    return [
      {
        id: 'deploy-1',
        apiId: 'api-1',
        version: 'v1',
        env: 'sandbox',
        actorUserId: 'dev-1',
        status: 'success',
        summary: 'Successfully deployed Orders API v1 to sandbox',
        details: 'Deployed 2 routes with 1 policy',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
      },
      {
        id: 'deploy-2',
        apiId: 'api-1',
        version: 'v1',
        env: 'prod',
        actorUserId: 'dev-1',
        status: 'success',
        summary: 'Successfully deployed Orders API v1 to production',
        details: 'Deployed 2 routes with 1 policy',
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
      }
    ];
  }
}

