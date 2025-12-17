import { Component, signal, ViewEncapsulation, inject } from '@angular/core';
import { SuggestedAction } from '../shared/components/ai-assist-drawer/ai-assist-drawer.component';
import { LoggerService } from '../core/services/logger.service';

@Component({
  selector: 'app-webhooks-docs',
  standalone: false,
  encapsulation: ViewEncapsulation.None,
  template: `
    <app-doc-layout>
      <h1>Webhooks</h1>
      
      <p>
        Webhooks allow you to receive real-time notifications about events in your LUMEN integration. 
        Instead of polling for updates, LUMEN will send HTTP POST requests to your configured endpoint 
        whenever specific events occur.
      </p>
      
      <div class="callout">
        <p><strong>Note:</strong> Webhooks require a publicly accessible HTTPS endpoint. Local development 
        can use tools like ngrok or localtunnel to expose local servers.</p>
      </div>
      
      <h2 id="how-it-works">How it works</h2>
      
      <p>
        When you create a webhook, you provide a URL endpoint and select which events you want to receive. 
        LUMEN will send a POST request to your endpoint whenever one of those events occurs.
      </p>
      
      <p>
        Each webhook payload includes:
      </p>
      
      <ul>
        <li>Event type and timestamp</li>
        <li>Event data specific to the event type</li>
        <li>Webhook signature for verification</li>
        <li>Unique event ID for idempotency</li>
      </ul>
      
      <h3 id="event-types">Event types</h3>
      
      <p>
        LUMEN supports the following event types:
      </p>
      
      <table>
        <thead>
          <tr>
            <th>Event Type</th>
            <th>Description</th>
            <th>Payload</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>api.created</code></td>
            <td>Triggered when a new API is registered</td>
            <td>API object</td>
          </tr>
          <tr>
            <td><code>api.updated</code></td>
            <td>Triggered when an API configuration changes</td>
            <td>API object</td>
          </tr>
          <tr>
            <td><code>api.deleted</code></td>
            <td>Triggered when an API is removed</td>
            <td>API ID</td>
          </tr>
          <tr>
            <td><code>user.invited</code></td>
            <td>Triggered when a user is invited</td>
            <td>User object</td>
          </tr>
          <tr>
            <td><code>user.removed</code></td>
            <td>Triggered when a user is removed</td>
            <td>User ID</td>
          </tr>
          <tr>
            <td><code>alert.triggered</code></td>
            <td>Triggered when a system alert is raised</td>
            <td>Alert object</td>
          </tr>
        </tbody>
      </table>
      
      <h2 id="create-webhook">Create a webhook</h2>
      
      <p>
        To create a webhook, send a POST request to the webhooks endpoint:
      </p>
      
      <div class="code-section-wrapper">
        <div class="code-actions-bar">
          <button 
            class="ai-assist-button"
            (click)="openAssistDrawer('create-webhook')"
            type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
            </svg>
            <span>AI Assist</span>
          </button>
        </div>
        <app-code-block [code]="createWebhookCode"></app-code-block>
      </div>
      
      <h3 id="webhook-configuration">Webhook configuration</h3>
      
      <p>
        The webhook configuration includes:
      </p>
      
      <ul>
        <li><strong>url</strong>: The HTTPS endpoint where events will be sent</li>
        <li><strong>events</strong>: Array of event types to subscribe to</li>
        <li><strong>secret</strong>: Secret key used to sign webhook payloads</li>
        <li><strong>active</strong>: Boolean to enable/disable the webhook (default: true)</li>
      </ul>
      
      <h3 id="webhook-secret">Webhook secret</h3>
      
      <p>
        The webhook secret is used to verify that requests are coming from LUMEN. 
        Store this securely and use it to verify the signature in each webhook payload.
      </p>
      
      <div class="callout">
        <p><strong>Security:</strong> Never expose your webhook secret in client-side code or 
        public repositories. Always verify webhook signatures before processing events.</p>
      </div>
      
      <h2 id="webhook-payload">Webhook payload</h2>
      
      <p>
        Each webhook request includes a JSON payload with the following structure:
      </p>
      
      <div class="code-section-wrapper">
        <div class="code-actions-bar">
          <button 
            class="ai-assist-button"
            (click)="openAssistDrawer('webhook-payload')"
            type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
            </svg>
            <span>AI Assist</span>
          </button>
        </div>
        <app-code-block [code]="webhookPayloadCode"></app-code-block>
      </div>
      
      <h3 id="payload-fields">Payload fields</h3>
      
      <ul>
        <li><strong>id</strong>: Unique event identifier (use for idempotency)</li>
        <li><strong>type</strong>: Event type (e.g., "api.created")</li>
        <li><strong>timestamp</strong>: ISO 8601 timestamp of when the event occurred</li>
        <li><strong>data</strong>: Event-specific data object</li>
        <li><strong>signature</strong>: HMAC SHA-256 signature of the payload</li>
      </ul>
      
      <h2 id="verify-webhooks">Verify webhooks</h2>
      
      <p>
        To verify that a webhook request is authentic, compute the HMAC SHA-256 signature 
        of the request body using your webhook secret and compare it to the signature header.
      </p>
      
      <div class="code-section-wrapper">
        <div class="code-actions-bar">
          <button 
            class="ai-assist-button"
            (click)="openAssistDrawer('verify-webhook')"
            type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
            </svg>
            <span>AI Assist</span>
          </button>
        </div>
        <app-code-block [code]="verifyWebhookCode"></app-code-block>
      </div>
      
      <h2 id="delete-webhook">Delete a webhook</h2>
      
      <p>
        To delete a webhook, send a DELETE request:
      </p>
      
      <app-code-block [code]="deleteWebhookCode"></app-code-block>
      
      <p>
        Once deleted, the webhook will stop receiving events immediately. 
        Any in-flight requests will complete, but no new events will be sent.
      </p>
      
      <h2 id="best-practices">Best practices</h2>
      
      <h3 id="idempotency">Idempotency</h3>
      
      <p>
        Use the event <code>id</code> field to ensure you don't process the same event twice. 
        Store processed event IDs and check against them before processing.
      </p>
      
      <h3 id="error-handling">Error handling</h3>
      
      <p>
        Your endpoint should return a 2xx status code within 5 seconds. If LUMEN doesn't 
        receive a successful response, it will retry the webhook with exponential backoff.
      </p>
      
      <h3 id="rate-limiting">Rate limiting</h3>
      
      <p>
        Webhook endpoints are subject to rate limits. If you exceed the limit, 
        LUMEN will queue events and retry later. Monitor your endpoint's performance 
        to avoid delays in event processing.
      </p>
      
      <h2 id="testing">Testing webhooks</h2>
      
      <p>
        Use the webhook testing tool in the LUMEN dashboard to send test events to your endpoint. 
        This allows you to verify your endpoint's behavior without waiting for real events.
      </p>
      
      <div class="callout">
        <p><strong>Tip:</strong> Use a webhook testing service like webhook.site or requestbin 
        during development to inspect incoming webhook payloads.</p>
      </div>
    </app-doc-layout>

    <!-- AI Assist Drawer -->
    <app-ai-assist-drawer
      [isOpen]="assistDrawerOpen"
      [context]="assistContext()"
      [description]="assistDescription()"
      [suggestedActions]="assistSuggestedActions"
      (closed)="closeAssistDrawer()"
      (actionTriggered)="handleAssistAction($event)">
    </app-ai-assist-drawer>
  `,
  styles: [`
    .code-section-wrapper {
      margin: 1.5rem 0;
      display: block;
    }

    .code-actions-bar {
      display: flex !important;
      justify-content: flex-end !important;
      margin-bottom: 0.75rem !important;
      padding: 0 !important;
      width: 100% !important;
      min-height: 32px !important;
    }

    .ai-assist-button {
      display: inline-flex !important;
      align-items: center !important;
      gap: 0.5rem !important;
      font-size: 0.875rem !important;
      padding: 0.5rem 0.75rem !important;
      background: #ffffff !important;
      border: 1px solid rgba(0, 0, 0, 0.15) !important;
      border-radius: 4px !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      color: #161616 !important;
      font-weight: 400 !important;
      line-height: 1.4 !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
      margin: 0 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      min-width: 100px !important;
      height: auto !important;
    }

    .ai-assist-button:hover {
      background: #f4f4f4;
      border-color: rgba(0, 0, 0, 0.15);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    }

    .ai-assist-button:active {
      transform: scale(0.98);
    }

    .ai-assist-button svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      color: #161616;
      display: block;
    }

    .ai-assist-button span {
      display: inline-block;
    }
  `]
})
export class WebhooksDocsComponent {
  private logger = inject(LoggerService);
  assistDrawerOpen = signal(false);
  assistContext = signal<string>('');
  assistDescription = signal<string>('');
  assistSuggestedActions = signal<SuggestedAction[]>([
    {
      id: 'troubleshoot-webhook',
      label: 'Troubleshoot webhook',
      icon: '🔍',
      category: 'Diagnostics'
    },
    {
      id: 'explain-payload',
      label: 'Explain expected payload',
      icon: '📋',
      category: 'Documentation'
    },
    {
      id: 'generate-retry-logic',
      label: 'Generate retry logic snippet',
      icon: '💻',
      category: 'Code'
    },
    {
      id: 'check-misconfigurations',
      label: 'Check for common misconfigurations',
      icon: '⚠️',
      category: 'Security'
    }
  ]);

  openAssistDrawer(context: string) {
    const contextMap: Record<string, { context: string; description: string }> = {
      'create-webhook': {
        context: 'Creating Webhooks',
        description: 'I can help you create and configure webhooks, explain the required parameters, and troubleshoot common setup issues.'
      },
      'webhook-payload': {
        context: 'Webhook Payloads',
        description: 'I can explain the payload structure, help you parse and validate webhook data, and show examples for different event types.'
      },
      'verify-webhook': {
        context: 'Webhook Verification',
        description: 'I can help you implement signature verification, explain security best practices, and troubleshoot verification issues.'
      }
    };

    const config = contextMap[context] || {
      context: 'Webhooks',
      description: 'I can help you with webhook configuration, troubleshooting, and best practices.'
    };

    this.assistContext.set(config.context);
    this.assistDescription.set(config.description);
    this.assistDrawerOpen.set(true);
  }

  closeAssistDrawer() {
    this.assistDrawerOpen.set(false);
  }

  handleAssistAction(action: SuggestedAction) {
    // Action is handled by the drawer component
    // This is just for any additional page-specific logic if needed
    this.logger.debug('Action triggered', { action });
  }
  createWebhookCode = `POST /api/v1/webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/lumen",
  "events": ["api.created", "api.updated", "alert.triggered"],
  "secret": "your-webhook-secret"
}`;

  webhookPayloadCode = `{
  "id": "evt_1234567890",
  "type": "api.created",
  "timestamp": "2024-11-06T14:32:00Z",
  "data": {
    "id": "api_abc123",
    "name": "Customer API",
    "version": "v2.1",
    "status": "active"
  },
  "signature": "sha256=abc123..."
}`;

  verifyWebhookCode = `import crypto from 'crypto';

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', '')),
    Buffer.from(expectedSignature)
  );
}`;

  deleteWebhookCode = `DELETE /api/v1/webhooks/{webhook_id}`;
}

