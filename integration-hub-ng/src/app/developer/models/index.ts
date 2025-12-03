export type EnvKey = 'sandbox' | 'prod';

export interface ApiKey {
  id: string;
  label: string;
  tokenPreview: string;
  createdAt: string;
  expiresAt?: string;
  status: 'active' | 'revoked';
  env?: EnvKey;
}

export interface ServiceAccount {
  id: string;
  name: string;
  description?: string;
  envs: EnvKey[];
  scopes: string[];
  createdAt: string;
  lastRotatedAt?: string;
  status: 'active' | 'suspended';
  keys: ApiKey[];
  ownerTeam?: string;
}

export interface ApiCall {
  id: string;
  accountId: string;
  timestamp: string;
  api: string;
  method: string;
  status: number;
  latency: number;
}

export interface Backend {
  id: string;
  name: string;
  baseUrl: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface ApiVersion {
  name: string;
  status: 'draft' | 'released' | 'deprecated';
}

export interface Transformation {
  type: 'rewritePath' | 'rewriteHeader' | 'mapJson' | 'liquidTemplate';
  config: any;
}

export interface RouteDef {
  id: string;
  path: string;
  methods: ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')[];
  backendId: string;
  transform?: Transformation;
}

export interface PolicyTemplate {
  id: string;
  name: string;
  description?: string;
  scope: 'global' | 'api' | 'route';
  snippetXml: string;
  defaults?: Record<string, any>;
  tags?: string[];
}

export interface AppliedPolicy {
  id: string;
  templateId: string;
  scope: 'global' | 'api' | 'route';
  routeId?: string;
  params?: Record<string, any>;
  enabled: boolean;
}

export interface ApiDoc {
  format: 'openapi-json' | 'openapi-yaml' | 'markdown';
  content: string;
  generatedAt?: string;
}

export interface ApiUsageMetrics {
  requestsLast7Days: number[];
  errorRate: number;
  avgLatency: number;
  totalRequests: number;
  lastUpdated: string;
}

export interface ApiConsumer {
  id: string;
  name: string;
  type: 'service-account' | 'app' | 'vendor';
  serviceAccountId?: string;
}

export interface ApiEntity {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ownerTeam?: string;
  versions: ApiVersion[];
  currentVersion: string;
  envs: EnvKey[];
  backends: Backend[];
  routes: RouteDef[];
  policies: AppliedPolicy[];
  docs?: ApiDoc[];
  tags?: string[];
  authMethod?: 'api-key' | 'oauth' | 'basic' | 'bearer' | 'none';
  consumers?: ApiConsumer[];
  deprecationNotice?: string;
  deprecatedAt?: string;
  usageMetrics?: ApiUsageMetrics;
  updatedAt: string;
  createdAt: string;
  updatedBy?: string;
  createdBy?: string;
}

export interface ApiAuditLog {
  id: string;
  apiId: string;
  action: 'created' | 'updated' | 'version-changed' | 'deprecated' | 'policy-modified' | 'deployed';
  actor: string;
  timestamp: string;
  details?: string;
  version?: string;
  environment?: EnvKey;
}

export interface Deployment {
  id: string;
  apiId: string;
  version: string;
  env: EnvKey;
  actorUserId: string;
  status: 'queued' | 'success' | 'failed';
  summary: string;
  details?: string;
  createdAt: string;
}

