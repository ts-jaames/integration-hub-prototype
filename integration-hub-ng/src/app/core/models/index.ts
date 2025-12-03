export interface Provider {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  authTypes: string[];
}

export interface Connection {
  id: string;
  name: string;
  providerId: string;
  providerName: string;
  status: 'active' | 'inactive' | 'error';
  authType: string;
  createdAt: string;
  lastSync: string;
}

export interface Event {
  id: string;
  connectionId: string;
  connectionName: string;
  eventType: string;
  status: 'success' | 'pending' | 'error';
  timestamp: string;
  description: string;
  payload: Record<string, any>;
}

export interface NewConnection {
  providerId: string;
  name: string;
  authType: string;
  apiKey?: string;
}

