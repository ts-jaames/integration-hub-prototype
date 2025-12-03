import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable, of, delay } from 'rxjs';

export interface Insight {
  id: string;
  type: 'credential_expiration' | 'security_risk' | 'performance_degradation' | 'compliance_issue' | 'integration_failure';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  detectedAt: string;
  resolvedAt?: string;
  status: 'active' | 'resolved';
  affectedEntities: string[];
  businessImpact: {
    description: string;
    affectedUsers: number;
    estimatedDowntime?: string;
    financialImpact?: string;
  };
  riskAnalysis: {
    likelihood: 'high' | 'medium' | 'low';
    impact: 'high' | 'medium' | 'low';
    riskScore: number;
    factors: string[];
  };
  recommendedActions: string[];
  workflowType?: 'credential_expiration' | 'security_review' | 'performance_optimization';
  metadata?: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  component: 'form' | 'review' | 'confirmation';
  data?: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiAssistantService {
  private insightsSubject = new BehaviorSubject<Insight[]>(this.getSeedInsights());
  insights$ = this.insightsSubject.asObservable();

  private chatMessagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  chatMessages$ = this.chatMessagesSubject.asObservable();

  insights = signal<Insight[]>(this.insightsSubject.value);
  activeInsights = computed(() => this.insights().filter(i => i.status === 'active'));
  resolvedInsights = computed(() => this.insights().filter(i => i.status === 'resolved'));

  constructor() {
    this.insights$.subscribe(insights => {
      this.insights.set(insights);
    });
  }

  getInsights(): Observable<Insight[]> {
    return of([...this.insightsSubject.value]).pipe(delay(300));
  }

  getInsightById(id: string): Observable<Insight | undefined> {
    const insight = this.insightsSubject.value.find(i => i.id === id);
    return of(insight).pipe(delay(200));
  }

  resolveInsight(id: string): Observable<Insight> {
    const insights = [...this.insightsSubject.value];
    const index = insights.findIndex(i => i.id === id);
    if (index !== -1) {
      insights[index] = {
        ...insights[index],
        status: 'resolved',
        resolvedAt: new Date().toISOString()
      };
      this.insightsSubject.next(insights);
    }
    return of(insights[index]).pipe(delay(300));
  }

  getWorkflowSteps(insightId: string): Observable<WorkflowStep[]> {
    const insight = this.insightsSubject.value.find(i => i.id === insightId);
    if (!insight || insight.workflowType !== 'credential_expiration') {
      return of([]);
    }

    const steps: WorkflowStep[] = [
      {
        id: '1',
        title: 'Review Credential Details',
        description: 'Examine the expiring credential and its usage across integrations',
        completed: false,
        component: 'review',
        data: {
          credentialName: insight.metadata?.['credentialName'] || 'API Key - Production',
          expiresAt: insight.metadata?.['expiresAt'] || '2024-04-15T00:00:00Z',
          usedBy: insight.affectedEntities,
          lastRotated: '2023-10-15T00:00:00Z'
        }
      },
      {
        id: '2',
        title: 'Generate New Credential',
        description: 'Create a new credential with the same permissions',
        completed: false,
        component: 'form',
        data: {
          credentialType: 'api_key',
          environment: 'production',
          permissions: ['read', 'write']
        }
      },
      {
        id: '3',
        title: 'Update Integrations',
        description: 'Replace the old credential in all affected integrations',
        completed: false,
        component: 'form',
        data: {
          integrations: insight.affectedEntities
        }
      },
      {
        id: '4',
        title: 'Verify & Test',
        description: 'Confirm all integrations are working with the new credential',
        completed: false,
        component: 'review',
        data: {
          testEndpoints: insight.affectedEntities.map(e => `${e}/health`)
        }
      },
      {
        id: '5',
        title: 'Revoke Old Credential',
        description: 'Safely deactivate the expired credential',
        completed: false,
        component: 'confirmation',
        data: {
          credentialId: insight.metadata?.['credentialId'] || 'cred-12345'
        }
      }
    ];

    return of(steps).pipe(delay(200));
  }

  completeWorkflowStep(insightId: string, stepId: string): Observable<WorkflowStep> {
    // Mock implementation - in real app would update backend
    return of({} as WorkflowStep).pipe(delay(300));
  }

  sendChatMessage(message: string, context?: { insightId?: string }): Observable<ChatMessage> {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    const currentMessages = this.chatMessagesSubject.value;
    this.chatMessagesSubject.next([...currentMessages, userMessage]);

    // Generate mock AI response
    const aiResponse: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: this.generateMockResponse(message, context),
      timestamp: new Date().toISOString()
    };

    setTimeout(() => {
      this.chatMessagesSubject.next([...this.chatMessagesSubject.value, aiResponse]);
    }, 500);

    return of(aiResponse).pipe(delay(500));
  }

  clearChat(): void {
    this.chatMessagesSubject.next([]);
  }

  private generateMockResponse(message: string, context?: { insightId?: string }): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('credential') || lowerMessage.includes('expir')) {
      return 'I can help you resolve the credential expiration. The workflow will guide you through generating a new credential, updating all affected integrations, and safely revoking the old one. Would you like to start the resolution workflow?';
    }

    if (lowerMessage.includes('risk') || lowerMessage.includes('impact')) {
      return 'Based on my analysis, this credential expiration affects 3 critical integrations with an estimated 2-hour downtime window if not resolved. The risk score is 8.5/10 due to the production environment and high traffic volume. I recommend resolving this within 24 hours.';
    }

    if (lowerMessage.includes('how') || lowerMessage.includes('what')) {
      return 'The credential expiration workflow involves 5 steps: reviewing the current credential, generating a new one, updating integrations, verifying functionality, and revoking the old credential. Each step includes validation to ensure system stability.';
    }

    if (lowerMessage.includes('when') || lowerMessage.includes('time')) {
      return 'The credential expires on April 15, 2024. You have 12 days remaining. I recommend starting the renewal process now to allow time for testing and verification.';
    }

    return 'I\'m here to help you resolve this insight. You can start the guided workflow to address the credential expiration, or ask me specific questions about the risk, impact, or resolution steps.';
  }

  private getSeedInsights(): Insight[] {
    return [
      {
        id: 'insight-1',
        type: 'credential_expiration',
        severity: 'high',
        title: 'Production API Key Expiring in 12 Days',
        description: 'A critical API key used by multiple production integrations will expire on April 15, 2024. This could cause service disruptions if not renewed.',
        detectedAt: '2024-04-03T08:30:00Z',
        status: 'active',
        affectedEntities: ['Payment Gateway Integration', 'Order Processing API', 'Inventory Sync Service'],
        businessImpact: {
          description: 'If this credential expires, all payment processing, order management, and inventory synchronization will fail. This affects approximately 15,000 daily transactions.',
          affectedUsers: 15000,
          estimatedDowntime: '2-4 hours',
          financialImpact: 'Estimated $50,000 in lost revenue per hour of downtime'
        },
        riskAnalysis: {
          likelihood: 'high',
          impact: 'high',
          riskScore: 8.5,
          factors: [
            'Credential is in production environment',
            'No automated rotation configured',
            'Multiple critical integrations depend on it',
            'High transaction volume'
          ]
        },
        recommendedActions: [
          'Generate new API key with same permissions',
          'Update all affected integrations',
          'Test in staging environment first',
          'Schedule rotation during low-traffic window',
          'Set up automated rotation for future'
        ],
        workflowType: 'credential_expiration',
        metadata: {
          credentialName: 'API Key - Production',
          credentialId: 'cred-prod-2024-001',
          expiresAt: '2024-04-15T00:00:00Z',
          environment: 'production'
        }
      },
      {
        id: 'insight-2',
        type: 'security_risk',
        severity: 'critical',
        title: 'Unusual API Access Pattern Detected',
        description: 'Anomalous API access detected from a new geographic location. This could indicate a security breach or credential compromise.',
        detectedAt: '2024-04-02T14:20:00Z',
        status: 'active',
        affectedEntities: ['User Authentication API', 'Data Access Service'],
        businessImpact: {
          description: 'Potential unauthorized access to user data and authentication systems. Immediate action required to prevent data breach.',
          affectedUsers: 50000,
          financialImpact: 'Potential compliance fines up to $2M if data breach confirmed'
        },
        riskAnalysis: {
          likelihood: 'medium',
          impact: 'high',
          riskScore: 9.0,
          factors: [
            'Access from unrecognized IP range',
            'Unusual time-of-day pattern',
            'Multiple failed authentication attempts',
            'Access to sensitive endpoints'
          ]
        },
        recommendedActions: [
          'Immediately revoke affected credentials',
          'Review access logs for suspicious activity',
          'Notify security team',
          'Enable additional authentication factors',
          'Conduct security audit'
        ],
        metadata: {
          sourceIP: '203.0.113.45',
          location: 'Unknown',
          accessCount: 47
        }
      },
      {
        id: 'insight-3',
        type: 'performance_degradation',
        severity: 'medium',
        title: 'API Response Time Degradation',
        description: 'Average API response time has increased by 40% over the past week. This may indicate infrastructure issues or increased load.',
        detectedAt: '2024-04-01T10:15:00Z',
        status: 'active',
        affectedEntities: ['Order Processing API', 'Product Catalog API'],
        businessImpact: {
          description: 'Slower response times are impacting user experience and may cause timeout errors during peak traffic.',
          affectedUsers: 8000,
          estimatedDowntime: 'Intermittent slowdowns'
        },
        riskAnalysis: {
          likelihood: 'high',
          impact: 'medium',
          riskScore: 6.5,
          factors: [
            'Gradual performance decline',
            'Peak traffic periods most affected',
            'No infrastructure changes reported',
            'Possible resource exhaustion'
          ]
        },
        recommendedActions: [
          'Review server resource utilization',
          'Check for memory leaks or connection pool issues',
          'Scale infrastructure if needed',
          'Optimize database queries',
          'Review recent code deployments'
        ],
        metadata: {
          baselineResponseTime: '150ms',
          currentResponseTime: '210ms',
          p95ResponseTime: '450ms'
        }
      },
      {
        id: 'insight-4',
        type: 'credential_expiration',
        severity: 'low',
        title: 'Sandbox Credential Expiring Soon',
        description: 'A sandbox environment credential will expire in 30 days. Low priority but should be renewed to maintain development workflows.',
        detectedAt: '2024-03-28T09:00:00Z',
        status: 'resolved',
        resolvedAt: '2024-03-29T11:30:00Z',
        affectedEntities: ['Sandbox Test Environment'],
        businessImpact: {
          description: 'Minimal impact - only affects development and testing workflows.',
          affectedUsers: 25
        },
        riskAnalysis: {
          likelihood: 'low',
          impact: 'low',
          riskScore: 2.0,
          factors: [
            'Non-production environment',
            'Low usage volume',
            'No customer-facing impact'
          ]
        },
        recommendedActions: [
          'Renew credential during next maintenance window',
          'Update test documentation'
        ],
        workflowType: 'credential_expiration',
        metadata: {
          credentialName: 'API Key - Sandbox',
          credentialId: 'cred-sandbox-001',
          expiresAt: '2024-05-01T00:00:00Z',
          environment: 'sandbox'
        }
      },
      {
        id: 'insight-5',
        type: 'compliance_issue',
        severity: 'high',
        title: 'Missing Audit Log Entries',
        description: 'Some API access events are not being logged properly. This may violate compliance requirements.',
        detectedAt: '2024-03-30T16:45:00Z',
        status: 'resolved',
        resolvedAt: '2024-04-01T10:00:00Z',
        affectedEntities: ['Audit Logging Service', 'API Gateway'],
        businessImpact: {
          description: 'Compliance audit may fail if logging gaps are not addressed. Could result in regulatory penalties.',
          affectedUsers: 0,
          financialImpact: 'Potential compliance fines up to $500K'
        },
        riskAnalysis: {
          likelihood: 'medium',
          impact: 'high',
          riskScore: 7.5,
          factors: [
            'Compliance requirement violation',
            'Gaps in audit trail',
            'Regulatory scrutiny risk'
          ]
        },
        recommendedActions: [
          'Fix logging service configuration',
          'Backfill missing log entries',
          'Implement log validation checks',
          'Schedule compliance review'
        ],
        metadata: {
          missingLogCount: 127,
          affectedTimeRange: '2024-03-25 to 2024-03-30'
        }
      }
    ];
  }
}

